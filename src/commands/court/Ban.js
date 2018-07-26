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
const {Argument, Command} = require("patron.js");
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const {data: {queries, regexes}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Ban extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "PrinceElmo#7720",
        key: "user",
        name: "user",
        preconditions: ["noself", "noffa"],
        type: "user"
      }),
      new Argument({
        example: "1e",
        key: "rule",
        name: "rule",
        preconditions: ["bannablerule"],
        type: "rule"
      }),
      new Argument({
        example: "470668653449445376, nsfw images",
        key: "evidence",
        name: "evidence",
        preconditionOptions: [null, {max: 1e3}],
        preconditions: ["hasmsg", "maxlength"],
        remainder: true,
        type: "string"
      })],
      description: "Request a ban for any guild user.",
      groupName: "court",
      names: ["ban"]
    });
    this.lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");
  }

  async run(msg, args) {
    const {senate: {ban_evidence}, top: {court}} = await db.getGuild(
      msg.channel.guild.id,
      {
        senate: "ban_evidence",
        top: "court"
      }
    );

    if (args.evidence.length < ban_evidence) {
      return message.replyError(
        msg,
        `the evidence cannot contain fewer than ${ban_evidence} characters.`
      );
    }

    const {rows: courtMembers} = await db.pool.query(
      this.lbQuery,
      [msg.channel.guild.id, court + 1]
    );
    const index = courtMembers.findIndex(c => c.user_id === args.user.id);

    if (index === -1)
      courtMembers.pop();
    else
      courtMembers.splice(index, 1);

    await logs.add({
      data: {
        court: courtMembers.map(c => c.user_id),
        evidence: args.evidence,
        msg_ids: args.evidence.match(regexes.ids),
        offender: args.user.id,
        reached_court: null,
        requester: msg.author.id,
        resolved: false,
        rule: args.rule.content
      },
      guild_id: msg.channel.guild.id,
      type: "ban_request"
    });
    await message.reply(
      msg,
      `ban request for ${message.tag(args.user)} successfully created.`
    );
  }
}();
