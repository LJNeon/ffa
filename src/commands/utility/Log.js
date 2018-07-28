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
const client = require("../../services/client.js");
const logs = require("../../services/logs.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

module.exports = new class Log extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "15",
        key: "log",
        name: "log ID",
        remainder: true,
        type: "log"
      })],
      description: "See more information on a log from it's ID.",
      groupName: "utility",
      names: ["log"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg, args) {
    const guild = client.guilds.get(args.log.guild_id);
    let footer = null;

    if (msg.channel.guild == null) {
      footer = {};

      if (guild == null)
        footer.text = `Guild: ${args.log.guild_id}`;
      else
        footer.text = `Guild: ${str.escapeFormat(guild.name)}`;
    }

    await message.create(msg.channel, {
      author: await logs.getAuthor(args.log),
      description: await logs.describe(args.log),
      footer,
      timestamp: new Date(args.log.time)
    });
  }
}();
