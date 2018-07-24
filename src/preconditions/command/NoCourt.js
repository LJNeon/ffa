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
const {data: {queries}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class NoCourt extends Precondition {
  constructor() {
    super({name: "nocourt"});
    this.lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");
  }

  async run(cmd, msg) {
    const {top: {court: count}} = await db.getGuild(
      msg.channel.guild.id,
      {top: "court"}
    );
    const res = await db.pool.query(
      this.lbQuery,
      [msg.channel.guild.id, count]
    );
    const result = res.rows.some(r => r.user_id === msg.author.id);

    if (result === true) {
      return PreconditionResult.fromError(
        cmd,
        "this command may not be used by Supreme Court members."
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
