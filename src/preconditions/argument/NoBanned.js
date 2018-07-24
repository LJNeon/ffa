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

module.exports = new class NoBanned extends ArgumentPrecondition {
  constructor() {
    super({name: "nobanned"});
  }

  async run(cmd, msg, arg, args, val) {
    const bans = await msg.channel.guild.getBans();

    if (bans.includes(val) === true) {
      return PreconditionResult.fromError(
        cmd,
        "this command may not be used on a banned user."
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
