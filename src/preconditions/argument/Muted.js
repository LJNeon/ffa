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
const db = require("../../services/database.js");
const senate = require("../../services/senate.js");

module.exports = new class Muted extends ArgumentPrecondition {
  constructor() {
    super({name: "muted"});
  }

  async run(cmd, msg, arg, args, val) {
    const {roles: {muted_id}} = await db.getGuild(
      msg.channel.guild.id,
      {roles: "muted_id"}
    );
    const muted = await senate.isMuted(
      msg.channel.guild.id,
      val.id,
      muted_id
    );

    if (muted === true)
      return PreconditionResult.fromSuccess();

    return PreconditionResult.fromError(
      cmd,
      `${msg.author.id === val.id ? "you are" : "that user is"} not muted.`
    );
  }
}();
