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
const {data: {queries}} = require("../services/data.js");
const Timer = require("../utilities/Timer.js");

module.exports = new Timer(async () => {
  const time = Date.now();
  const {rows: msgs} = await db.pool.query(
    "SELECT id FROM messages WHERE time < $1 AND used = false",
    [new Date(time - 6048e5)]
  );

  for (let i = 0; i < msgs.length; i++) {
    await db.pool.query(
      "DELETE FROM revisions WHERE msg_id = $1",
      [msgs[i].id]
    );
    await db.pool.query("DELETE FROM messages WHERE id = $1", [msgs[i].id]);
  }

  await db.pool.query(
    "DELETE FROM attachments WHERE time < $1 AND used = false",
    [new Date(time - 864e5)]
  );

  let {rows: users} = await db.pool.query(
    "SELECT user_id FROM users WHERE delete_at > $1",
    [new Date()]
  );

  users = users.map(u => u.user_id)
    .filter(u => users.indexOf(u) === users.lastIndexOf(u));

  for (let i = 0; i < users.length; i++) {
    await db.pool.query(
      "UPDATE users SET delete_at = null WHERE user_id = $1",
      [users[i]]
    );
    await db.pool.query(
      queries.deleteRevisions,
      [users[i]]
    );
  }
}, config.timer.dbClean);
