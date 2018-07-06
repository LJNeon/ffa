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
const cli = require("./cli.js");
const crypto = require("crypto");
const {data} = require("./data.js");
const fs = require("fs");
const path = require("path");
const pg = require("pg");
const str = require("../utilities/string.js");
const util = require("util");
const yaml = require("js-yaml");
const {Client, Pool} = pg.native == null ? pg : pg.native;
const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

function parseVersion(version) {
  return version.split(".").map(n => Number(n));
}

// TODO test `setup()`
module.exports = {
  async changeRep(guildId, userId, change) {
    return this.pool.query(
      data.queries.changeRep,
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

      if (res[table] == null) {
        res[table] = await this.upsert(
          table,
          "guild_id",
          [id],
          "guild_id",
          tables[table]
        );
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

  pool: null,

  async setup() {
    const client = new Client({
      database: "postgres",
      host: cli.auth.pg.host,
      password: "postgres",
      port: cli.auth.pg.port,
      user: "postgres"
    });
    const db = cli.auth.pg.database == null ? "ffa" : cli.auth.pg.database;
    const user = cli.auth.pg.user == null ? "postgres" : cli.auth.pg.user;

    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [db]
    );

    if (res.rows.length === 0) {
      if (cli.auth.pg.database == null) {
        cli.auth.pg.database = "ffa";
        cli.auth.pg.password = cli.auth.pg.password == null ? crypto
          .randomBytes(16)
          .toString("hex")
          .slice(-32) : cli.auth.pg.password;

        await client.query(
          `ALTER USER ${user} WITH PASSWORD $1`,
          [cli.auth.pg.password]
        );

        await writeFile(cli.authPath, yaml.safeDump(
          cli.auth,
          {sortKeys: true}
        ));
      }

      await client.query(`CREATE DATABASE ${db}`);
      this.pool = new Pool(cli.auth.pg);

      const queries = data.model.replace(data.regexes.newline, "");

      await this.pool.query(str.format(queries, user));
      await this.pool.query(
        "INSERT INTO info(version) VALUES($1)",
        [data.db.version]
      );
    }

    await client.end();

    if (this.pool == null)
      this.pool = new Pool(cli.auth.pg);
  },

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

  async update() {
    const res = await this.pool.query("SELECT version FROM info");
    const version = parseVersion(res.rows[0].version);
    const wantedVersion = parseVersion(data.db.version);

    if (version[0] < wantedVersion[0] || (version[0] === wantedVersion[0]
        && version[1] < wantedVersion[1])) {
      const dir = path.join(__dirname, "../../migrations");
      const files = await readDir(dir);
      let migrations = [];

      for (let i = 0; i < files.length; i++) {
        const filepath = `${dir}/${files[i]}`;
        const content = await readFile(filepath, "utf8");

        migrations[i] = {
          queries: content.replace(data.regexes.newline, ""),
          version: parseVersion(files[i]
            .slice(0, files[i]
              .indexOf(".sql")))
        };
      }

      migrations = migrations.sort((a, b) => {
        if (a.version[0] === b.version[0])
          return a.version[1] - b.version[1];

        return a.version[0] - b.version[0];
      });

      migrations = migrations.slice(migrations
        .findIndex(m => m.version[0] === version[0]
          && m.version[1] === version[1]));

      for (let i = 0; i < migrations.length; i++)
        await this.pool.query(migrations[i].queries);

      await this.pool.query("UPDATE info SET version = $1", [data.db.version]);
    }
  },

  async upsert(table, columns, values, conflict, returns) {
    const valStr = this.stringifyQuery(values.length - 1);
    const selectStr = str.format(
      data.queries.selectDefault,
      returns,
      table,
      columns,
      valStr
    );
    let row = await this.getFirstRow(selectStr, values);

    if (row == null) {
      await this.pool.query(str.format(
        data.queries.insertDefault,
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
