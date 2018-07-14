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
const catchEvent = require("../utilities/catchEvent.js");
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const db = require("../services/database.js");
const Logger = require("../utilities/Logger.js");
const reqAbs = require("../utilities/reqAbs.js");
const str = require("../utilities/string.js");
const web = require("../services/web.js");

client.on("ready", catchEvent(async () => {
  await client.editStatus({name: str.format(
    config.bot.game,
    config.bot.prefix
  )});

  for (const guild of client.guilds.values()) {
    await db.cleanupChannels(guild);
    await db.cleanupRoles(guild);

    const res = await db.pool.query(
      "SELECT user_id, in_guild FROM users WHERE guild_id = $1",
      [guild.id]
    );
    const users = res.rows;

    for (let i = 0; i < users.length; i++) {
      if (guild.members.has(users[i].user_id) !== users[i].in_guild) {
        await db.pool.query(
          "UPDATE users SET in_guild = $1 WHERE (guild_id, user_id) = ($2, $3)",
          [guild.members.has(users[i].user_id), guild.id, users[i].user_id]
        );
      }
    }
  }

  await reqAbs(__dirname, "../timers");
  require("../services/web.js");
  Logger.info("READY");
}));
