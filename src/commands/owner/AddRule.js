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
const {data: {queries}} = require("../../services/data.js");
const db = require("../../services/database.js");
const message = require("../../utilities/message.js");
const ruleService = require("../../services/rules.js");

module.exports = new class AddRule extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "\"Cracking your willy in broad daylight\"",
        key: "content",
        name: "content",
        type: "string"
      }),
      new Argument({
        example: "Harassment",
        key: "category",
        name: "category",
        type: "string"
      }),
      new Argument({
        defaultValue: null,
        example: "72h",
        key: "muteLen",
        name: "max mute length",
        preconditionOptions: [{
          max: config.max.mute,
          min: config.min.mute
        }],
        preconditions: ["betweentime"],
        type: "timespan"
      })],
      description: "Adds a rule.",
      groupName: "owner",
      names: ["addrule", "createrule", "makerule"]
    });
  }

  async run(msg, args) {
    await db.pool.query(
      queries.addRule,
      [msg.channel.guild.id,
        args.category.toLowerCase(),
        args.content,
        new Date(),
        args.muteLen]
    );
    await message.reply(msg, "you have successfully added a new rule.");
    await ruleService.update(msg.channel.guild.id);
  }
}();
