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
const {Command, Context} = require("patron.js");
const db = require("../../services/database.js");
const message = require("../../utilities/message.js");
const {data: {constants, descriptions}} = require("../../services/data.js");

module.exports = new class Delete extends Command {
  constructor() {
    super({
      cooldown: 3e5,
      description: descriptions.delete,
      groupName: "privacy",
      names: ["delete"],
      usableContexts: [Context.DM, Context.Guild]
    });
  }

  async run(msg) {
    await db.pool.query(
      "UPDATE users SET delete_at = $1 WHERE user_id = $2",
      [new Date(Date.now() + constants.week), msg.author.id]
    );
    await message.reply(
      msg,
      "your currently collected data will be deleted in a week."
    );
  }
}();
