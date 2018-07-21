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
const client = require("../../services/client.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

module.exports = new class Log extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "15",
        key: "log",
        name: "logId",
        remainder: true,
        type: "log"
      })],
      description: "See more information on a log from it's ID.",
      groupName: "utility",
      names: ["log"]
    });
  }

  async run(msg, args) {
    let id = args.log.user_id;

    if (args.log.data != null && args.log.data.senate_id != null)
      id = args.log.data.senate_id;

    const user = client.users.get(id);
    const guild = str.escapeFormat(client.guilds.get(args.guild_id).name);

    await message.create(msg.channel, {
      author: {
        icon_url: user.avatarURL,
        name: `${message.tag(user)} (${id})`
      },
      description: await this.describe(args.log),
      footer: {text: `Guild: ${guild}`},
      timestamp: new Date()
    });
  }
}();
