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
const {Precondition, PreconditionResult} = require("patron.js");
const {auth} = require("../../services/cli.js");

module.exports = new class BotOwners extends Precondition {
  constructor() {
    super({name: "botowners"});
  }

  async run(cmd, msg) {
    if (auth.bot.owners.includes(msg.author.id) === false) {
      return PreconditionResult.fromError(
        cmd,
        "this command may only be used by the bot owners."
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
