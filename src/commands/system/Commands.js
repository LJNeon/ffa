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
const {Command, Context} = require("patron.js");
const {config} = require("../../services/cli.js");
const message = require("../../utilities/message.js");
const registry = require("../../services/registry.js");
const {data: {responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Commands extends Command {
  constructor() {
    super({
      description: "List of all the commands.",
      groupName: "system",
      names: ["commands", "cmds", "cmdlist", "commandlist"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg) {
    const reply = {
      description: registry.commands.map(cmd => str.format(
        responses.itemList,
        `${config.bot.prefix}${cmd.names[0]}`,
        cmd.description
      )).join("\n"),
      title: "Commands"
    };

    if (msg.channel.guild == null) {
      await message.create(msg.channel, reply);
    } else {
      await message.dm(msg.author, reply, null, msg.channel.guild);
      await message.reply(
        msg,
        "you have been DMed with a list of all commands."
      );
    }
  }
}();
