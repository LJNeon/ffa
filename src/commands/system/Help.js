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
const {data: {responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Help extends Command {
  constructor() {
    super({
      description: "Information about the bot.",
      groupName: "system",
      names: ["help", "information", "info"],
      usableContexts: [Context.DM, Context.Guild]
    });
    this.helpMsg = str.format(
      responses.helpMsg,
      config.bot.prefix,
      config.guild.invite
    );
  }

  async run(msg) {
    const reply = {
      description: this.helpMsg,
      title: "FFA Information"
    };

    if (msg.channel.guild == null) {
      await message.create(msg.channel, reply);
    } else {
      await message.dm(msg.author, reply, null, msg.channel.guild);
      await message.reply(msg, "you have been DMed with bot information.");
    }
  }
}();
