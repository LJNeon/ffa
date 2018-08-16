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
const time = require("../../utilities/time.js");

module.exports = new class RuleTime extends ArgumentPrecondition {
  constructor() {
    super({name: "ruletime"});
  }

  async run(cmd, msg, arg, args, val, opt) {
    let {rule} = args;

    if (rule.mute_length != null && rule.mute_length < val) {
      const formattedTime = time.format(rule.mute_length);

      return PreconditionResult.fromError(
        cmd,
        `the ${arg.name} must be smaller than or equal to ${formattedTime}.`
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
