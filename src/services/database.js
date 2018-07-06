/**
 * FFA - The core control of the free-for-all discord server.
 * Copyright (c) 2018 FFA contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";
const {auth} = require("./cli.js");
const {data: {queries}} = require("./data.js");
const pg = require("pg");
const str = require("../utilities/string.js");
const Pool = pg.native == null ? pg.Pool : pg.native.Pool;

module.exports = {
  async changeRep(guildId, userId, change) {
    return this.pool.query(
      queries.changeRep,
      [guildId, userId, change]
    );
  },

  async cleanupChannels(guild) {
    const {channels} = await this.getGuild(guild.id, {channels: "*"});
    const guildChannels = guild.channels.map(c => c.id);

    for (const channel in channels) {
      if (channels.hasOwnProperty(channel) === false || channel === "guild_id")
        continue;

      if (channel.endsWith("s") === true) {
        const exists = channels[channel]
          .filter(i => guildChannels.includes(i) === true);

        if (exists.length !== channels[channel].length) {
          await this.pool.query(
            "UPDATE channels SET ignored_ids = $1 WHERE guild_id = $2",
            [guild.id, JSON.stringify(exists)]
          );
        }
      } else if (channels[channel] != null
          && guildChannels.includes(channels[channel]) === false) {
        await this.pool.query(
          `UPDATE channels SET ${channel} = null WHERE guild_id = $1`,
          [guild.id]
        );
      }
    }
  },

  async cleanupRoles(guild) {
    const {roles} = await this.getGuild(guild.id, {roles: "*"});
    const guildRoles = guild.roles.map(r => r.id);

    for (const role in roles) {
      if (roles.hasOwnProperty(role) === false || role === "guild_id")
        continue;

      if (role.endsWith("s") === true) {
        const exists = roles[role]
          .filter(i => guildRoles.includes(i) === true);

        if (exists.length !== roles[role].length) {
          await this.pool.query(
            "UPDATE roles SET ignored_ids = $1 WHERE guild_id = $2",
            [guild.id, JSON.stringify(exists)]
          );
        }
      } else if (roles[role] != null
          && guildRoles.includes(roles[role]) === false) {
        await this.pool.query(
          `UPDATE roles SET ${role} = null WHERE guild_id = $1`,
          [guild.id]
        );
      }
    }
  },

  async findNeededColumns(table) {
    const res = await this.pool.query(queries.tableInfo, [table]);
    /**
     * The only columns that need defaults are the not null ones with no
     * PostgreSQL default value, the id column being exempt from that as a
     * primary key.
     */
    const needed = res.rows.filter(c => c.is_nullable === "NO"
      && c.column_default == null && c.column_name !== "guild_id");

    return needed.map(c => c.column_name);
  },

  async getFirstRow(...args) {
    const res = await this.pool.query(...args);

    return res.rows[0];
  },

  async getGuild(id, tables) {
    const res = {};

    for (const table in tables) {
      if (tables.hasOwnProperty(table) === false)
        continue;

      res[table] = await this.getFirstRow(
        `SELECT ${tables[table]} FROM ${table} WHERE guild_id = $1`,
        [id]
      );

      if (res[table] == null && typeof id === "string") {
        const needed = await this.findNeededColumns(table);

        if (needed.length === 0) {
          res[table] = await this.upsert(
            table,
            "guild_id",
            [id],
            "guild_id",
            tables[table]
          );
        } else {
          const neededStr = needed.join(", ");
          const defaultValues = await this.getFirstRow(
            `SELECT ${neededStr} FROM ${table} WHERE guild_id = 'default'`
          );

          res[table] = await this.upsert(
            table, `guild_id, ${neededStr}`,
            [id, ...this.sortDefaultValues(defaultValues, needed)],
            "guild_id",
            tables[table]
          );
        }
      }
    }

    return res;
  },

  async getUser(guildId, userId, columns = "*") {
    return this.upsert(
      "users",
      "guild_id, user_id",
      [guildId, userId],
      "guild_id, user_id",
      columns
    );
  },

  pool: new Pool(auth.pg),

  sortDefaultValues(row, needed) {
    const columns = Object.keys(row);
    /**
     * Create an array of objects of each column mapped to its respective row
     * value.
     */
    const arr = columns.map(c => ({
      key: c,
      value: row[c]
    }));

    /**
     * Ensure that the default values are in the same order as the needed
     * values to ensure a valid query.
     */
    return arr.sort((a, b) => needed.indexOf(a.key) - needed.indexOf(b.key))
      .map(c => c.value);
  },

  stringifyQuery(count) {
    const len = count + 2;
    let values = "$1";

    for (let i = 2; i < len; i++)
      values += `, $${i}`;

    return values;
  },

  async upsert(table, columns, values, conflict, returns) {
    const valStr = this.stringifyQuery(values.length - 1);
    const selectStr = str.format(
      queries.selectDefault,
      returns,
      table,
      columns,
      valStr
    );
    let row = await this.getFirstRow(selectStr, values);

    if (row == null) {
      await this.pool.query(str.format(
        queries.insertDefault,
        table,
        columns,
        valStr,
        conflict
      ), values);
      row = await this.getFirstRow(selectStr, values);
    }

    return row;
  }
};
