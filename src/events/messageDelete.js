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
const catchPromise = require("../utilities/catchPromise.js");
const client = require("../services/client.js");
const db = require("../services/database.js");
const deleted = require("../services/deleted.js");

client.on("messageDelete", catchPromise(async msg => {
  deleted.add(msg);

  if (msg.channel.guild != null) {
    const {chat} = await db.getGuild(msg.channel.guild.id, {chat: "reward"});
    const dbMsg = await db.getFirstRow(
      "SELECT * FROM messages WHERE id = $1",
      [msg.id]
    );

    if (dbMsg != null && dbMsg.earned_rep === true) {
      await db.changeRep(dbMsg.guild_id, dbMsg.author_id, -chat.reward);
      await db.pool.query(
        "UPDATE messages SET earned_rep = false WHERE id = $1",
        [msg.id]
      );
    }
  }
}));
