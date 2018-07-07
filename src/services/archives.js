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
const client = require("./client.js");
const db = require("./database.js");
const message = require("../utilities/message.js");
const {data: {queries}} = require("./data.js");
const time = require("../utilities/time.js");

module.exports = {
  async add(archive) {
    const {channels: {archive_id}} = await db.getGuild(
      archive.guild_id,
      {channels: "archive_id"}
    );

    const res = await db.pool.query(
      queries.addArchive,
      [archive.guild_id,
        archive.user_id,
        archive.data,
        time.epoch(),
        archive.type]
    );

    if (archive_id != null) {
      const channel = client.getChannel(archive_id);

      if (channel != null) {
        const user = client.users.get(archive.user_id);

        return message.create(channel, {
          author: {
            icon_url: user.avatarURL,
            name: `${message.tag(user)} (${archive.user_id})`
          },
          description: await this.describe(archive),
          footer: {text: `ID: ${res.rows[0].archive_id}`},
          timestamp: new Date()
        });
      }
    }
  },

  // TODO add more types
  describe(archive) {
    if (archive.type === "rep") {
      const {target_id} = archive.data;

      return `repped **${message.tag(target_id)}** (${target_id}).`;
    } else if (archive.type === "unrep") {
      const {target_id} = archive.data;

      return `unrepped **${message.tag(target_id)}** (${target_id}).`;
    }
  },

  async get(id, columns = "*") {
    return db.getFirstRow(
      `SELECT ${columns} FROM archives where archive_id = $1`,
      [id]
    );
  }
};
