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
const db = require("../../services/database.js");
const senate = require("../../services/senate.js");

module.exports = new class NotMutedPrecondition extends Precondition {
  constructor() {
    super({name: "notmuted"});
  }

  async run(cmd, msg) {
    const {roles: {muted_id}} = await db.getGuild(
      msg.channel.guild.id,
      {roles: "muted_id"}
    );
    const muted = await senate.isMuted(
      msg.channel.guild.id,
      msg.author.id,
      muted_id
    );

    if (muted === false)
      return PreconditionResult.fromSuccess();

    return PreconditionResult.fromError(
      cmd,
      "you may not use this command while muted."
    );
  }
}();
