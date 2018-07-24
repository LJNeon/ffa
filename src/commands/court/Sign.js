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
const {data: {queries}} = require("../../services/data.js");

module.exports = new class Sign extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "69",
        key: "log",
        name: "log id",
        type: "log"
      })],
      cooldown: config.cd.sign,
      description: "Sign a log.",
      groupName: "court",
      names: ["sign"],
      preconditionOptions: [{column: "senate"}],
      preconditions: ["top", "nocourt"]
    });
  }

  async run(msg, args) {
    if (args.log.type === "ban_request") {
      const {ages: {ban_req}} = await db.getGuild(
        msg.channel.guild.id,
        {ages: "ban_req"}
      );
      const {rows: signs} = await db.pool.query(
        queries.selectBanSigns,
        [args.log.log_id]
      );

      if (signs.findIndex(s => s.user_id === msg.author.id) !== -1)
        return message.replyError(msg, "you already signed that ban request.");
      else if (Date.now() - args.log.time > ban_req)
        return message.replyError(msg, "that ban request is too old.");

      await logs.add({
        data: {for: args.log.log_id},
        guild_id: msg.channel.guild.id,
        type: "ban_sign",
        user_id: msg.author.id
      });

      return message.reply(
        msg,
        "you have successfully signed this ban request."
      );
    }

    await message.replyError(msg, "that log can't be signed.");
  }
}();
