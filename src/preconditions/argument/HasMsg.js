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
const {data: {regexes, responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Between extends ArgumentPrecondition {
  constructor() {
    super({name: "hasmsg"});
  }

  async run(cmd, msg, arg, args, val) {
    const ids = val.match(regexes.ids);

    if (ids == null) {
      return PreconditionResult.fromError(
        cmd,
        str.format(responses.hasMsg, arg.name)
      );
    }

    for (let i = 0; i < ids.length; i++) {
      const res = await db.getFirstRow(
        "SELECT 1 FROM messages WHERE id = $1",
        [ids[i]]
      );

      if (res == null) {
        return PreconditionResult.fromError(
          cmd,
          str.format(responses.hasMsg, arg.name)
        );
      }
    }

    return PreconditionResult.fromSuccess();
  }
}();
