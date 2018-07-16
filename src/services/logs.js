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
const crypto = require("crypto");
const https = require("https");
const message = require("../utilities/message.js");
const mime = require("mime");
const pako = require("pako");
const {data: {queries, responses}} = require("./data.js");
const sharp = require("sharp");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");

function getAttachment(options) {
  return new Promise((res, rej) => {
    https.get(options, response => {
      const end = new Promise(resolve => response.on("end", resolve));

      res({
        end,
        response
      });
    }).on("error", rej);
  });
}

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
        new Date(),
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
          else if (Array.isArray(val))
            val = str.list(val);
          else if (key === "length")
            val = time.format(val);
          else if (key === "penalty")
            val = `${val.toFixed(2)} rep`;

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
    await db.pool.query(
      queries.insertMessage,
      [msg.id,
        msg.author.id,
        msg.channel.id,
        msg.channel.guild.id,
        new Date(msg.timestamp)]
    );

    const {attachments} = msg;

    for (let i = 0; i < attachments.length; i++) {
      let end;
      let file = [];
      let response;

      try {
        const req = await getAttachment(attachments[i].url);

        ({end, response} = req);
      } catch (e) {
        if (e.code === 401 || e.code === 404)
          continue;
        else
          throw e;
      }

      response.on("data", chunk => file.push(chunk));
      await end;
      file = Buffer.concat(file);

      const hash = crypto.createHash("md5").update(file).digest("hex");
      const match = await db.getFirstRow(
        "SELECT id FROM attachments WHERE hash = $1",
        [hash]
      );

      if (match == null) {
        const type = mime.getType(attachments[i].filename);

        if (type === "image/jpeg" || type === "image/png"
            || type === "image/webp" || type === "image/svg+xml"
            || type === "image/tiff")
          file = await sharp(file).jpeg({quality: 50}).toBuffer();

        file = Buffer.from(pako.deflate(file));
        await db.pool.query(
          queries.insertAttachment,
          [attachments[i].id,
            attachments[i].filename,
            new Date(),
            file.toString("hex"),
            hash]
        );
        attachments[i] = attachments[i].id;
      } else {
        await db.pool.query(
          "UPDATE attachments set epoch = $1 WHERE id = $2",
          [new Date(), match.id]
        );
        attachments[i] = match.id;
      }
    }

    await db.pool.query(
      queries.insertRevisions,
      [msg.id, attachments, msg.content, new Date()]
    );
  }
};
