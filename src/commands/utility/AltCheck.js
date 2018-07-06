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
const message = require("../../utilities/message.js");
const {data: {responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");
const time = require("../../utilities/time.js");

module.exports = new class AltCheck extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "Jimbo Steve#8842",
        key: "user",
        name: "user",
        remainder: true,
        type: "user"
      })],
      description: "Verifies whether or not a user is an alterate account.",
      groupName: "utility",
      names: ["altcheck", "alt"]
    });
  }

  dateFormat(date) {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  async run(msg, args) {
    const member = msg.channel.guild.members.get(args.user.id);

    if (member == null)
      return message.replyError(msg, "that user isn't in the server.");

    let created = "Unknown";
    let joined = "Unknown";

    if (member.createdAt != null)
      created = this.dateFormat(member.createdAt);

    if (member.joinedAt != null)
      joined = this.dateFormat(member.joinedAt);

    if (created === "Unknown" || joined === "Unknown") {
      return message.create(msg.channel, {
        description: str.format(
          responses.alt,
          created,
          joined,
          ""
        ),
        title: message.tag(member)
      });
    }

    const timeStr = time.format((member.joinedAt - member.createdAt) / 1e3);
    await message.create(msg.channel, {
      description: str.format(
        responses.alt,
        created,
        joined,
        `\n**Difference:** ${timeStr}`
      ),
      title: message.tag(member)
    });
  }
}();
