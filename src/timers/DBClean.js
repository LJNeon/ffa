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
const Timer = require("../utilities/Timer.js");

module.exports = new Timer(async () => {
  const epoch = Date.now();
  const {rows: msgs} = await db.pool.query(
    "SELECT id FROM messages WHERE epoch < $1 AND used = false",
    [new Date(epoch - 6048e5)]
  );

  for (let i = 0; i < msgs.length; i++) {
    await db.pool.query(
      "DELETE FROM revisions WHERE msg_id = $1",
      [msgs[i].id]
    );
    await db.pool.query("DELETE FROM messages WHERE id = $1", [msgs[i].id]);
  }

  await db.pool.query(
    "DELETE FROM attachments WHERE epoch < $1 AND used = false",
    [new Date(epoch - 864e5)]
  );
}, config.timer.dbClean);
