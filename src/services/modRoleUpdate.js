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
const LimitedMutex = require("../utilities/LimitedMutex.js");
const message = require("../utilities/message.js");
const {data: {queries}} = require("./data.js");
const str = require("../utilities/string.js");
const mutex = new LimitedMutex(1);
const selectRep = str.format(queries.selectRep, "DESC LIMIT $2");

module.exports = async guild => mutex.sync(guild.id, async () => {
  const {roles: {mod_id}, top: {senate}} = await db.getGuild(
    guild.id,
    {
      roles: "mod_id",
      top: "senate"
    }
  );

  if (mod_id == null)
    return;

  const res = await db.pool.query(
    selectRep,
    [guild.id, senate]
  );
  const mods = guild.members.filter(m => m.roles.includes(mod_id) === true);
  const usable = message.canUseRole(
    guild,
    guild.roles.get(mod_id)
  );

  for (let i = 0; i < res.rows.length; i++) {
    const member = guild.members.get(res.rows[i].user_id);

    if (usable === true
        && member.roles.includes(mod_id) === false)
      await member.addRole(mod_id).catch(() => {});
  }

  for (let i = 0; i < mods.length; i++) {
    if (usable === true
        && res.rows.some(r => r.user_id === mods[i].id) === false)
      await mods[i].removeRole(mod_id).catch(() => {});
  }
});
