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
const {config} = require("../services/cli.js");
const db = require("../services/database.js");
const senate = require("../services/senate.js");
const time = require("../utilities/time.js");
const Timer = require("../utilities/Timer.js");

module.exports = new Timer(async () => {
  const epoch = time.epoch();
  const res = await db.pool.query(
    "SELECT * FROM logs WHERE epoch > $1 AND type < 4",
    [epoch - config.max.mute]
  );

  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];

    if (row.type === 0 || row.type === 2) {
      const unmute = res.rows.find(r => r.guild_id === row.guild_id
        && r.user_id === row.user_id && (r.type === 1 || r.type === 3)
        && r.epoch > row.epoch);

      if (unmute != null)
        continue;

      if (row.epoch < epoch - row.data.length)
        await senate.autoUnmute(row);
    }
  }
}, config.timer.autoUnmute * 1e3);
