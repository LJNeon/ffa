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
  const {roles: {court_id, senate_id}, top: {court, senate}} = await db.getGuild(
    guild.id,
    {
      roles: "court_id, senate_id",
      top: "court, senate"
    }
  );

  if (senate_id == null || court_id == null)
    return;

  const senateUsable = message.canUseRole(
    guild,
    guild.roles.get(senate_id)
  );
  const courtUsable = message.canUseRole(
    guild,
    guild.roles.get(court_id)
  );

  if (senateUsable === false || courtUsable === false)
    return;

  const res = await db.pool.query(
    selectRep,
    [guild.id, senate + court]
  );
  const currentSenate = guild.members.filter(m => m.roles.includes(senate_id));
  const currentCourt = guild.members.filter(m => m.roles.includes(court_id));

  for (let i = 0; i < res.rows.length; i++) {
    const member = guild.members.get(res.rows[i].user_id);

    if (i < court && member.roles.includes(court_id) === false)
      await member.addRole(court_id).catch(() => {});
    else
      await member.addRole(senate_id).catch(() => {});
  }


  for (let i = 0; i < currentCourt.length; i++) {
    const rank = res.rows.findIndex(r => r.user_id === currentCourt[i].id);

    if (rank === -1 || rank >= court)
      await currentCourt[i].removeRole(court_id).catch(() => {});
  }

  for (let i = 0; i < currentSenate.length; i++) {
    const rank = res.rows.findIndex(r => r.user_id === currentSenate[i].id);

    if (rank === -1 || rank < court)
      await currentSenate[i].removeRole(senate_id).catch(() => {});
  }
});
