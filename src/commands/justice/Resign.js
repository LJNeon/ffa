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
const {Command} = require("patron.js");
const db = require("../../services/database.js");
const message = require("../../utilities/message.js");
const senateUpdate = require("../../services/senateUpdate.js");
const logs = require("../../services/logs.js");
const {data: {queries}} = require("../../services/data.js");

module.exports = new class Resign extends Command {
  constructor() {
    super({
      description: "Resign from the senate.",
      groupName: "justice",
      names: ["resign"]
    });
  }

  async run(msg) {
    const res = await db.pool.query(this.lbQuery, [msg.channel.guild.id]);
    const rank = res.rows.findIndex(r => r.user_id === msg.author.id);

    await db.pool.query(
      queries.resetRep,
      [msg.channel.guild.id, msg.author.id]
    );
    await senateUpdate(msg.channel.guild);
    await logs.add({
      data: {rank},
      guild_id: msg.channel.guild.id,
      type: "resign",
      user_id: msg.author.id
    });
    await message.reply(msg, "you have successfully resigned.");
  }
}();
