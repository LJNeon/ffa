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
const actionService = require("../../services/maxActions.js");
const db = require("../../services/database.js");
const {Precondition, PreconditionResult} = require("patron.js");
const {data: {responses}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class MaxActions extends Precondition {
  constructor() {
    super({name: "maxactions"});
  }

  async run(cmd, msg) {
    const {senate: {max_actions}} = await db.getGuild(
      msg.channel.guild.id,
      {senate: "max_actions"}
    );
    const success = await actionService.check(
      msg.channel.guild.id,
      msg.author.id,
      max_actions
    );

    if (success === true)
      return PreconditionResult.fromSuccess();

    return PreconditionResult.fromError(
      cmd,
      str.format(responses.maxActions, max_actions)
    );
  }
}();
