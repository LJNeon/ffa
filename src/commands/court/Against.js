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
const {Argument, Command, Context} = require("patron.js");
const bans = require("../../services/bans.js");
const client = require("../../services/client.js");
const {
  data: {
    constants,
    queries,
    responses
  }
} = require("../../services/data.js");
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

async function banReq(msg, args) {
  return bans.limitVote(args.log.guild_id, async () => {
    const guild = client.guilds.get(args.log.guild_id);
    const {ages: {ban_req}, senate: {vote_opinion}} = await db.getGuild(
      guild.id,
      {
        ages: "ban_req",
        senate: "vote_opinion"
      }
    );
    const {rows: votes} = await db.pool.query(
      queries.selectBanVotes,
      [args.log.log_id]
    );

    if (args.log.data.court == null
        || args.log.data.court.includes(msg.author.id) === false) {
      return message.replyError(msg, "you cannot vote on this ban request.");
    } else if (args.evidence.length < vote_opinion) {
      return message.replyError(
        msg,
        `the opinion cannot contain fewer than ${vote_opinion} characters.`
      );
    } else if (votes.findIndex(v => v.data.voter_id === msg.author.id) !== -1) {
      return message.replyError(
        msg,
        "you already voted on that ban request."
      );
    } else if (Date.now() - args.log.time > ban_req * constants.double) {
      return message.replyError(msg, "that ban request is too old.");
    } else if (args.log.data.reached_court === false) {
      return message.replyError(msg, responses.hasntReachedCourt);
    }

    await logs.add({
      data: {
        for: false,
        log_id: args.log.log_id,
        opinion: args.evidence,
        voter_id: msg.author.id
      },
      guild_id: guild.id,
      type: "ban_vote"
    });
    await bans.update(guild);

    return message.reply(msg, str.format(responses.vote, "against"));
  });
}

module.exports = new class Against extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "45",
        key: "log",
        name: "log id",
        type: "log"
      }),
      new Argument({
        example: "this is slander and uncalled for",
        key: "evidence",
        name: "opinion",
        remainder: true,
        type: "string"
      })],
      description: "Vote against a log.",
      groupName: "court",
      names: ["against"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg, args) {
    if (args.log.type === "ban_request")
      return banReq(msg, args);

    await message.replyError(msg, "that log can't be voted on.");
  }
}();
