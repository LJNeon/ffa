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
const {TypeReader, TypeReaderResult} = require("patron.js");
const logs = require("../services/logs.js");
const errorResult = cmd => TypeReaderResult.fromError(
  cmd,
  "you have provided an invalid log id."
);

module.exports = new class Log extends TypeReader {
  constructor() {
    super({type: "log"});
  }

  async read(cmd, msg, arg, args, val) {
    let result = Number(val);

    if (Number.isInteger(result) === false)
      return errorResult(cmd);

    result = await logs.get(result);

    if (result == null)
      return errorResult(cmd);

    return TypeReaderResult.fromSuccess(result);
  }
}();
