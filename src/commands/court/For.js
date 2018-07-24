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
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");

module.exports = new class For extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "168",
        key: "log",
        name: "log id",
        type: "log"
      }),
      new Argument({
        example: "he's been causing trouble for a long time",
        key: "evidence",
        name: "opinion",
        remainder: true,
        type: "string"
      })],
      description: "Vote for a log.",
      groupName: "court",
      names: ["for"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg, args) {
    if (args.log.type === "ban_request") {
      if (args.log.data.court.includes(msg.author.id) === false)
        return message.replyError(msg, "you cannot vote on this ban request.");

      const {ages: {ban_req}, senate: {vote_opinion}} = await db.getGuild(
        msg.channel.guild.id,
        {
          ages: "ban_req",
          senate: "vote_opinion"
        }
      );

      if (args.evidence.length < vote_opinion) {
        return message.replyError(
          msg,
          `the opinion cannot contain fewer than ${vote_opinion} characters.`
        );
      }

      const {rows: votes} = await db.pool.query(
        "SELECT 1 FROM logs WHERE type = 'ban_vote' AND (data->'req')::text = $1 AND user_id = $2",
        [args.log.log_id, msg.author.id]
      );

      if (votes.length !== 0) {
        return message.replyError(
          msg,
          "you already voted on that ban request."
        );
      } else if (Date.now() - args.log.epoch > ban_req * 2) {
        return message.replyError(msg, "that ban request is too old.");
      } else if (args.log.data.reached_court === false) {
        return message.replyError(
          msg,
          "that ban request hasn't reached court yet."
        );
      }

      await logs.add({
        data: {
          for: true,
          log_id: args.log.log_id
        },
        guild_id: msg.channel.guild.id,
        type: "ban_vote",
        user_id: msg.author.id
      });

      return message.reply(
        msg,
        "you have successfully voted for this ban request."
      );
    }

    await message.replyError(msg, "that log can't be voted on.");
  }
}();
