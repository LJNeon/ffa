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
const {Argument, Command, CommandResult} = require("patron.js");
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const {
  data: {
    queries,
    descriptions,
    responses
  }
} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Ban extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "PrinceElmo#7720",
        key: "user",
        name: "user",
        preconditions: ["noself", "noffa", "bannableuser"],
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
        example: descriptions.banEvidence,
        key: "evidence",
        name: "evidence",
        preconditionOptions: [null, {max: 1e3}],
        preconditions: ["hasmsg", "maxlength"],
        remainder: true,
        type: "string"
      })],
      cooldown: config.cd.ban,
      description: "Request a ban for any guild user.",
      groupName: "court",
      names: ["ban"]
    });
    this.lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");
  }

  async run(msg, args) {
    const {senate: {ban_evidence}} = await db.getGuild(
      msg.channel.guild.id,
      {senate: "ban_evidence"}
    );

    if (args.evidence.length < ban_evidence) {
      return CommandResult.fromError(
        `the evidence cannot contain fewer than ${ban_evidence} characters.`
      );
    }

    const logId = await logs.add({
      data: {
        court: null,
        evidence: args.evidence,
        msg_ids: message.getIds(args.evidence),
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
      str.format(responses.banCreate, message.tag(args.user), logId)
    );
  }
}();
