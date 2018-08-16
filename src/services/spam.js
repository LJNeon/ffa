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
const db = require("./database.js");
const MultiMutex = require("../utilities/MultiMutex.js");
const senate = require("./senate.js");

module.exports = {
  entries: new Map(),
  mutex: new MultiMutex(),

  update(msg, guild) {
    this.mutex.sync(msg.channel.guild.id, async () => {
      const entry = this.entries.get(msg.author.id);

      if (entry == null
          || Date.now() - entry.first > guild.spam.duration) {
        this.entries.set(msg.author.id, {
          count: 1,
          first: Date.now()
        });
      } else {
        entry.count++;

        if (entry.count >= guild.spam.msg_limit) {
          const success = await senate.autoMute(
            msg,
            guild.senate.mute_length,
            guild.spam.rep_penalty
          );

          if (success === true) {
            entry.count = 0;
            await db.changeRep(
              msg.channel.guild.id,
              msg.author.id,
              -guild.spam.rep_penalty
            );
          }
        }
      }
    });
  }
};
