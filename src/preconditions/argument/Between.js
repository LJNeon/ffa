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
const {data: {responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class Between extends ArgumentPrecondition {
  constructor() {
    super({name: "between"});
  }

  async run(cmd, msg, arg, args, val, opt) {
    let {max = null, min = null} = opt;

    if (typeof max === "function")
      max = max(args);

    if (typeof min === "function")
      min = min(args);

    if (val == null || ((min == null || val >= min) && (max == null
        || val <= max)))
      return PreconditionResult.fromSuccess();

    if (typeof opt.format === "function") {
      if (max != null)
        max = opt.format(max);

      if (min != null)
        min = opt.format(min);
    }

    if (min == null) {
      return PreconditionResult.fromError(
        cmd,
        `the ${arg.name} must be below or equal to ${max}.`
      );
    }

    if (max == null) {
      return PreconditionResult.fromError(
        cmd,
        `the ${arg.name} must be above or equal to ${min}.`
      );
    }

    return PreconditionResult.fromError(cmd, str.format(
      responses.between,
      arg.name,
      min,
      max
    ));
  }
}();
