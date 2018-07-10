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
const time = require("../utilities/time.js");
const Timer = require("../utilities/Timer.js");

module.exports = new Timer(async () => {
  const epoch = time.epoch();

  await db.pool.query(
    "DELETE FROM messages WHERE epoch < $1",
    [epoch - 604800]
  );
  await db.pool.query(
    "UPDATE messages SET files = '{}' WHERE epoch < $1 AND files != '{}'",
    [epoch - 3600]
  );
}, config.timer.dbClean * 1e3);
