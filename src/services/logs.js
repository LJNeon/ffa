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
const {
  data: {
    constants,
    descriptions,
    queries,
    responses
  }
} = require("./data.js");
const sharp = require("sharp");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");
const lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");

async function describeBan(log) {
  const {data, log_id} = await db.getFirstRow(
    "SELECT data, log_id FROM logs WHERE log_id = $1",
    [log.data.log_id]
  );
  const {rows} = await db.pool.query(
    queries.selectBanVotes,
    [log_id]
  );
  let {rows: signers} = await db.pool.query(
    queries.selectBanSigns,
    [log_id]
  );
  let yes = 0;
  let no = 0;

  for (let j = 0; j < rows.length; j++) {
    if (rows[j].data.for === true)
      yes++;
    else
      no++;
  }

  for (let i = 0; i < signers.length; i++) {
    const user = await message.getUser(signers[i].data.signer_id);

    signers[i] = `${message.tag(user)} (${user.id})`;
  }

  signers = str.list(signers);

  return str.format(
    responses.banReq,
    "**Action:** Member Ban\n",
    data.rule,
    data.evidence,
    str.list(data.msg_ids),
    message.tag(await message.getUser(data.offender)),
    data.offender,
    `\n**Signed By:** ${signers}\n**Result:** ${yes}-${no}`
  );
}

async function describeBanReq(log) {
  return str.format(
    responses.banReq,
    "**Action:** Ban Request\n",
    log.data.rule,
    log.data.evidence,
    str.list(log.data.msg_ids),
    message.tag(await message.getUser(log.data.offender)),
    log.data.offender,
    ""
  );
}

async function describeSenate(log) {
  const action = constants.modLogTypes[log.type];
  let data = "";

  for (let key in log.data) {
    if (log.data.hasOwnProperty(key) === false || key === "senate_id")
      continue;

    let val = log.data[key];

    if (val == null)
      continue;
    else if (Array.isArray(val))
      val = str.list(val);
    else if (key === "length")
      val = time.format(val);
    else if (key === "penalty")
      val = `${val.toFixed(constants.numPrecision)} rep`;

    if (key === "msg_ids")
      key = "Message IDs";
    else if (key === "user_id")
      key = "User ID";

    data += `\n**${str.capitalize(key)}:** ${val}`;
  }

  return str.format(
    responses.modLog,
    action,
    message.tag(await message.getUser(log.data.user_id)),
    log.data.user_id,
    data
  );
}

async function formatImage(file, type) {
  if (constants.sharpFormats.includes(type) === true) {
    try {
      return sharp(file).jpeg({quality: 50}).toBuffer();
    } catch (e) {
      if (e.message == null || e.message.includes("corrupt") === false)
        throw e;
    }
  }

  return file;
}

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
    const {channels: {logs_id}} = await db.getGuild(
      log.guild_id,
      {channels: "logs_id"}
    );
    const res = await db.pool.query(
      queries.addLog,
      [log.guild_id, log.data, log.type]
    );

    if (log.data.msg_ids != null) {
      await db.pool.query(
        "UPDATE messages SET used = true WHERE used = false AND id = ANY($1)",
        [log.data.msg_ids]
      );

      const {rows} = await db.pool.query(
        "SELECT attachment_ids FROM revisions WHERE msg_id = ANY($1)",
        [log.data.msg_ids]
      );
      const attachmentIds = rows.reduce((a, b) => {
        a.push(...b.attachment_ids);

        return a;
      }, []).filter((e, i, a) => i === a.lastIndexOf(e));

      await db.pool.query(
        queries.markUsedAttachments,
        [attachmentIds]
      );
    }

    if (logs_id != null) {
      const channel = client.getChannel(logs_id);

      if (channel != null) {
        await message.create(channel, {
          author: await this.getAuthor(log),
          color,
          description: await this.describe(log),
          footer: {text: `#${res.rows[0].log_id}`},
          timestamp: new Date()
        });
      }
    }

    return res.rows[0].log_id;
  },

  async attachment(msg, attachment) {
    const {filename, id, url} = attachment;
    let end;
    let file = [];
    let response;

    try {
      const req = await getAttachment(url);

      ({end, response} = req);
    } catch (e) {
      if (e.code === constants.httpStatusCodes.unauthorized
          || e.code === constants.httpStatusCodes.notFound)
        return;

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
      const type = mime.getType(filename);

      file = await formatImage(file, type);
      file = Buffer.from(pako.deflate(file));
      await db.pool.query(
        queries.insertAttachment,
        [id, filename, file.toString("hex"), hash]
      );

      return id;
    }

    await db.pool.query(
      "UPDATE attachments set time = $1 WHERE id = $2",
      [new Date(), match.id]
    );

    return match.id;
  },

  async describe(log) {
    if (Object.keys(constants.modLogTypes).includes(log.type) === true) {
      return describeSenate(log);
    } else if (log.type === "rep") {
      const target = await message.getUser(log.data.target_id);

      return `**Action:** Rep\n**User:** ${message.tag(target)} (${target.id})`;
    } else if (log.type === "unrep") {
      const target = await message.getUser(log.data.target_id);

      return str.format(descriptions.unrep, message.tag(target), target.id);
    } else if (log.type === "resign") {
      const {top: {court}} = await db.getGuild(log.guild_id, {top: "court"});
      const level = log.data.rank < court ? "Supreme Court" : "Senate";

      return `**Action:** Resignation\n**From:** ${level}`;
    } else if (log.type === "member_ban") {
      return describeBan(log);
    } else if (log.type === "ban_request") {
      return describeBanReq(log);
    } else if (log.type === "ban_sign") {
      return `**Action:** Ban Signature\n**Log ID:** ${log.data.for}`;
    } else if (log.type === "ban_vote") {
      const {log_id, opinion} = log.data;
      const which = log.data.for === true ? "For" : "Against";

      return str.format(descriptions.banVote, which, opinion, log_id);
    } else if (log.type === "court_change") {
      const {top: {court}} = await db.getGuild(log.guild_id, {top: "court"});
      let {rows: newCourt} = await db.pool.query(
        lbQuery,
        [log.guild_id, court]
      );
      let removed = await message.getUser(log.data.senate_id);

      for (let i = 0; i < newCourt.length; i++) {
        const user = await message.getUser(newCourt[i].user_id);

        newCourt[i] = `${message.tag(user)} (${user.id})`;
      }

      newCourt = str.list(newCourt);
      removed = `${message.tag(removed)} (${removed.id})`;

      return str.format(descriptions.courtChange, removed, newCourt);
    }
  },

  async get(id, columns = "*") {
    return db.getFirstRow(
      `SELECT ${columns} FROM logs where log_id = $1`,
      [id]
    );
  },

  async getAuthor(log) {
    if (log.type === "court_change")
      return;

    let id;

    if (Object.keys(constants.modLogTypes).includes(log.type) === true)
      id = log.data.senate_id == null ? log.data.user_id : log.data.senate_id;
    else if (log.type === "rep" || log.type === "unrep")
      id = log.data.user_id;
    else if (log.type === "resign")
      id = log.data.senate_id;
    else if (log.type === "member_ban" || log.type === "ban_request")
      id = log.data.requester;
    else if (log.type === "ban_sign")
      id = log.data.signer_id;
    else if (log.type === "ban_vote")
      id = log.data.voter_id;

    const user = await message.getUser(id);

    return {
      icon_url: user.avatarURL,
      name: `${message.tag(user)} (${id})`
    };
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

    for (let i = 0; i < attachments.length; i++)
      attachments[i] = await this.attachment(msg, attachments[i]);

    const timestamp = msg.editedTimestamp || msg.timestamp;

    await db.pool.query(
      queries.insertRevisions,
      [msg.id, attachments, msg.content, new Date(timestamp)]
    );
  }
};
