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
const http = require("http");
const Logger = require("../utilities/Logger.js");
const message = require("../utilities/message.js");
const {data: {queries, responses}} = require("./data.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");
const util = require("util");
const getAttachment = util.promisify(http.get);

module.exports = {
  async add(log, color) {
    const {channels: {log_id}} = await db.getGuild(
      log.guild_id,
      {channels: "log_id"}
    );
    const res = await db.pool.query(
      queries.addLog,
      [log.guild_id,
        log.user_id,
        log.data,
        time.epoch(),
        log.type]
    );

    if (log_id != null) {
      const channel = client.getChannel(log_id);

      if (channel != null) {
        const id = log.data.mod_id == null ? log.user_id : log.data.mod_id;
        const user = client.users.get(id);

        return message.create(channel, {
          author: {
            icon_url: user.avatarURL,
            name: `${message.tag(user)} (${id})`
          },
          color,
          description: await this.describe(log),
          footer: {text: `ID: ${res.rows[0].log_id}`},
          timestamp: new Date()
        });
      }
    }
  },

  async describe(log) {
    if (log.type === "mute" || log.type === "unmute" || log.type === "automute"
        || log.type === "autounmute" || log.type === "clear") {
      let action = "Mute";
      let data = "";

      if (log.type === "unmute")
        action = "Unmute";
      else if (log.type === "automute")
        action = "Automatic Mute";
      else if (log.type === "autounmute")
        action = "Automatic Unmute";
      else if (log.type === "clear")
        action = "Clear";

      if (log.data != null) {
        for (const key in log.data) {
          if (log.data.hasOwnProperty(key) === false || key === "mod_id")
            continue;

          let val = log.data[key];

          if (val == null)
            continue;
          else if (key === "length")
            val = time.format(val);

          data += `\n**${str.capitalize(key)}:** ${val}`;
        }
      }

      return str.format(
        responses.modLog,
        action,
        message.tag(client.users.get(log.user_id)),
        log.user_id,
        data
      );
    } else if (log.type === "rep") {
      const {target_id} = log.data;

      return `Repped **${message.tag(target_id)}** (${target_id}).`;
    } else if (log.type === "unrep") {
      const {target_id} = log.data;

      return `Unrepped **${message.tag(target_id)}** (${target_id}).`;
    } else if (log.type === "resign") {
      const {top: {court}} = await db.getGuild(log.guild_id, {top: "court"});
      const level = log.data.rank < court ? "Supreme Court" : "Senate";

      return `Retired from the ${level}.`;
    }
  },

  async get(id, columns = "*") {
    return db.getFirstRow(
      `SELECT ${columns} FROM logs where log_id = $1`,
      [id]
    );
  },

  async message(msg) {
    /**
     * TODO set this to `== null` once eris 0.8.7 fixes
     * `Message.editedTimestamp`.
     */
    const epoch = msg.editedTimestamp || msg.timestamp;
    const files = [];
    const filenames = [];

    for (let i = 0; i < msg.attachments.length; i++) {
      files.push(await getAttachment(msg.attachments[i].url));
      filenames.push(msg.attachments[i].filename);
    }

    await db.pool.query(
      queries.insertMessage,
      msg.id,
      msg.author.id,
      msg.content,
      Math.floor(epoch / 1e3),
      filenames,
      files
    ).catch(Logger.error);
  },

  async remove(err, msg, id, silent = false) {
    const logMsg = await msg;

    await db.pool.query("DELETE FROM logs WHERE log_id = $1", [id]);
    await logMsg.delete();

    if (silent === false)
      throw err;
  }
};
