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
const bans = require("../../services/bans.js");
const client = require("../../services/client.js");
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const {data: {queries, responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

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
      names: ["sign"]
    });
    this.lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");
  }

  async run(msg, args) {
    const {top: {court, senate}} = await db.getGuild(
      args.log.guild_id,
      {top: "court, senate"}
    );
    const {rows} = await db.pool.query(
      this.lbQuery,
      [args.log.guild_id, court + senate]
    );
    const result = rows.findIndex(r => r.user_id === msg.author.id);

    if (result === -1) {
      await message.replyError(msg, str.format(responses.top, senate));

      return CommandResult.fromError();
    } else if (result < court) {
      await message.replyError(
        msg,
        "this command may not be used by Supreme Court members."
      );

      return CommandResult.fromError();
    }

    if (args.log.type === "ban_request") {
      const {ages: {ban_req}} = await db.getGuild(
        args.log.guild_id,
        {ages: "ban_req"}
      );
      const {rows: signs} = await db.pool.query(
        queries.selectBanSigns,
        [args.log.log_id]
      );

      if (signs.findIndex(s => s.data.signer_id === msg.author.id) !== -1) {
        await message.replyError(msg, "you already signed that ban request.");

        return CommandResult.fromError();
      } else if (Date.now() - args.log.time > ban_req) {
        await message.replyError(msg, "that ban request is too old.");

        return CommandResult.fromError();
      }

      await logs.add({
        data: {
          for: args.log.log_id,
          signer_id: msg.author.id
        },
        guild_id: args.log.guild_id,
        type: "ban_sign"
      });
      await bans.update(client.guilds.get(args.log.guild_id));

      return message.reply(
        msg,
        "you have successfully signed this ban request."
      );
    }

    await message.replyError(msg, "that log can't be signed.");

    return CommandResult.fromError();
  }
}();
