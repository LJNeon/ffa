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
const {Command, CommandResult, Context} = require("patron.js");
const client = require("../../services/client.js");
const db = require("../../services/database.js");
const message = require("../../utilities/message.js");
const {
  data: {
    constants,
    queries,
    responses
  }
} = require("../../services/data.js");
const str = require("../../utilities/string.js");

function getLogList(logs) {
  if (logs.length === 0)
    return "None";

  return logs.map(log => `* #${log.log_id}: ${log.data.evidence}`).join("\n");
}

function getServerList(users) {
  return users.map(user => {
    const guild = client.guilds.get(user.guild_id);

    return str.format(
      responses.serverList,
      guild == null ? user.guild_id : `${guild.name} (${guild.id})`,
      user.reputation.toFixed(constants.numPrecision),
      user.muted === true ? "" : " not",
      user.in_guild === true ? "" : " not"
    );
  }).join("\n");
}

module.exports = new class Data extends Command {
  constructor() {
    super({
      cooldown: 3e5,
      description: "View all your collected data in a text file.",
      groupName: "privacy",
      names: ["data"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg) {
    const approval = await message.verify(msg, [msg.author]);

    if (approval == null)
      return CommandResult.fromError("Not approved");

    approval.delete().catch(() => {});

    const {rows: logs} = await db.pool.query(
      queries.selectUserLogs,
      [msg.author.id]
    );
    let {rows: msgs} = await db.pool.query(
      "SELECT * FROM messages WHERE author_id = $1",
      [msg.author.id]
    );
    const {rows: users} = await db.pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [msg.author.id]
    );

    if (msgs.length !== 0) {
      msgs = msgs.sort((a, b) => a.time - b.time).slice(0, constants.maxMsgs);

      const {rows: revisions} = await db.pool.query(
        "SELECT * FROM revisions WHERE msg_id = ANY($1)",
        [msgs.map(m => m.id)]
      );

      for (let i = 0; i < msgs.length; i++) {
        msgs[i].revisions = revisions
          .filter(r => r.msg_id === msgs[i].id)
          .sort((a, b) => a.time - b.time);
      }
    }

    await message.dm(msg.author, "", null, null, {
      file: Buffer.from(str.format(
        responses.data,
        message.tag(msg.author),
        msg.author.id,
        getServerList(users),
        message.list(msgs),
        getLogList(logs)
      )),
      name: `${msg.author.id}.txt`
    });
  }
}();
