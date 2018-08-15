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
const {ArgumentPrecondition, PreconditionResult} = require("patron.js");
const client = require("../../services/client.js");

module.exports = new class BannableUser extends ArgumentPrecondition {
  constructor() {
    super({name: "bannableuser"});
  }

  async run(cmd, msg, arg, args, val) {
    const {guild} = msg.channel;
    const clientMember = guild.members.get(client.user.id);
    const member = guild.members.get(val.id);
    let highest = 0;
    let userHighest = 0;

    for (let i = 0; i < clientMember.roles.length; i++) {
      const {position} = guild.roles.get(clientMember.roles[i]);

      if (position > highest)
        highest = position;
    }

    for (let i = 0; i < member.roles.length; i++) {
      const {position} = guild.roles.get(member.roles[i]);

      if (position > userHighest)
        userHighest = position;
    }

    if (guild.ownerID !== val.id && highest > userHighest)
      return PreconditionResult.fromSuccess();

    return PreconditionResult.fromError(
      cmd,
      "I don't have permission to ban that user."
    );
  }
}();
