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
const senate = require("../../services/senate.js");

module.exports = new class Unmute extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "Billy#6969",
        key: "user",
        name: "user",
        preconditions: ["noself"],
        type: "user"
      }),
      new Argument({
        example: "was meme muted",
        key: "evidence",
        name: "evidence",
        preconditionOptions: [{max: config.max.evidenceLen}],
        preconditions: ["maxlength"],
        remainder: true,
        type: "string"
      })],
      botPermissions: ["manageRoles"],
      description: "Unmute any guild user.",
      groupName: "justice",
      names: ["unmute"]
    });
  }

  async run(msg, args) {
    return senate.unmute(msg, args);
  }
}();
