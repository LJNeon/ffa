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
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const {data: {queries, responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Rep extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "ElJay#7711",
        key: "user",
        name: "user",
        preconditions: ["noself", "nobot"],
        remainder: true,
        type: "user"
      })],
      cooldown: config.cd.rep,
      description: "Give reputation to any user.",
      groupName: "reputation",
      names: ["rep"],
      preconditions: ["memberage"]
    });
    this.weekRepQuery = str.format(queries.selectWeekRep, "rep");
  }

  async run(msg, args) {
    const res = await db.pool.query(
      this.weekRepQuery,
      [msg.channel.guild.id, msg.author.id, new Date(Date.now() - 6048e5)]
    );

    for (let i = 0; i < res.rows.length; i++) {
      if (res.rows[0].data.target_id === args.user.id) {
        return message.replyError(
          msg,
          `you already repped ${message.tag(args.user)} in the past week.`
        );
      }
    }

    const {rep: {increase, rep_reward}} = await db.getGuild(
      msg.channel.guild.id,
      {rep: "increase, rep_reward"}
    );
    const {reputation} = await db.changeRep(
      msg.channel.guild.id,
      args.user.id,
      increase
    );

    await db.changeRep(msg.channel.guild.id, msg.author.id, rep_reward);
    await message.reply(msg, str.format(
      responses.rep,
      "repped",
      message.tag(args.user),
      "increasing",
      reputation.toFixed(2),
      rep_reward.toFixed(2)
    ));
    await logs.add({
      data: {
        target_id: args.user.id,
        user_id: msg.author.id
      },
      guild_id: msg.channel.guild.id,
      type: "rep"
    });
  }
}();
