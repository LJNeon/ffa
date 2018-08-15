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
const casesUpdate = require("./casesUpdate.js");
const db = require("./database.js");
const logs = require("./logs.js");
const message = require("../utilities/message.js");
const {
  data: {
    constants,
    queries,
    responses
  }
} = require("./data.js");
const senateUpdate = require("./senateUpdate.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");
const lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");

async function ban(guild, data, req, court, senate) {
  const requester = await message.getUser(data.requester);
  const logId = await logs.add({
    data: {
      log_id: req.log_id,
      offender: data.offender,
      requester: data.requester
    },
    guild_id: guild.id,
    type: "member_ban"
  });
  const res = await db.pool.query(
    lbQuery,
    [guild.id, senate + court]
  );
  const senators = [];

  for (let i = court; i < res.rows.length; i++) {
    const user = await message.getUser(res.rows[i].user_id);

    senators.push(message.tag(user));
  }

  await message.dm(
    await message.getUser(data.offender),
    str.format(
      responses.banned,
      message.tag(requester),
      data.rule,
      data.evidence,
      logId,
      str.list(senators)
    ),
    null,
    guild
  ).catch(() => {});
  await guild.banMember(data.offender);
}

async function dmCourt(guild, req, signs, courtMembers, banReq) {
  const description = str.format(
    responses.courtBanDm,
    "Ban request",
    req.log_id,
    message.tag(await message.getUser(req.data.requester)),
    time.format(banReq)
  );

  for (let i = 0; i < courtMembers.length; i++) {
    await message.dm(courtMembers[i], {description}, null, guild).catch(e => {
      if (e.code === constants.discordErrorCodes.cantDM) {
        db.pool.query(
          queries.resetRep,
          [guild.id, courtMembers[i].id]
        ).then(() => senateUpdate(guild));
      } else {
        throw e;
      }
    });
  }
}

async function getCourt(guild, data, court) {
  const {rows: courtMembers} = await db.pool.query(
    lbQuery,
    [guild.id, court + 1]
  );

  for (let i = 0; i < courtMembers.length; i++)
    courtMembers[i] = await message.getUser(courtMembers[i].user_id);

  const index = courtMembers.findIndex(c => c.id === data.offender);

  if (index === -1)
    courtMembers.pop();
  else
    courtMembers.splice(index, 1);

  return courtMembers;
}

function updateLog(req) {
  return db.pool.query(
    "UPDATE logs SET data = $1 WHERE log_id = $2",
    [req.data, req.log_id]
  );
}

async function updatePrecourt(guild, request, banReq, court) {
  const req = request;
  const {senate: {ban_sigs}} = await db.getGuild(
    guild.id,
    {senate: "ban_sigs"}
  );
  const {rows: signs} = await db.pool.query(
    queries.selectBanSigns,
    [req.log_id]
  );
  const courtMembers = await getCourt(guild, req.data, court);

  if (request.time.getTime() > Date.now() - banReq && signs.length < ban_sigs)
    return;

  for (let i = 0; i < signs.length; i++) {
    const user = await message.getUser(signs[i].data.signer_id);

    signs[i] = `${message.tag(user)} (${user.id})`;
  }

  if (signs.length < ban_sigs) {
    req.data.reached_court = false;
    req.data.resolved = true;
    await updateLog(req);
    await casesUpdate(guild);

    return;
  }

  req.data.reached_court = true;
  req.data.court = courtMembers.map(c => c.id);
  await updateLog(req);
  await casesUpdate(guild);
  await message.dm(
    await message.getUser(req.data.offender),
    str.format(
      responses.banWarning,
      message.tag(await message.getUser(req.data.requester)),
      req.log_id,
      str.list(courtMembers.map(c => `**${message.tag(c)}**`))
    )
  ).catch(() => {});
  await dmCourt(guild, req, signs, courtMembers, banReq);
}

async function updateResolved(guild, request, banReq, court) {
  const req = request;
  const {data} = req;
  const {top: {senate}} = await db.getGuild(guild.id, {top: "senate"});
  const {rows: votes} = await db.pool.query(
    queries.selectBanVotes,
    [req.log_id]
  );

  if (request.time.getTime() > Date.now() - (banReq * constants.double)
      && votes.length < court)
    return;

  req.data.resolved = true;
  await updateLog(req);
  await casesUpdate(guild);

  for (let i = 0; i < data.court.length; i++) {
    if (votes.findIndex(v => v.data.voter_id === data.court[i]) === -1) {
      await db.pool.query(
        queries.resetRep,
        [guild.id, data.court[i]]
      );
      await message.dm(
        await message.getUser(data.court[i]),
        str.format(responses.courtReset, req.log_id, time.format(banReq)),
        null,
        guild
      ).catch(() => {});
      await senateUpdate(guild);
    }
  }

  if (votes.length !== 0
      && votes.findIndex(v => v.data.for === false) === -1)
    await ban(guild, data, req, court, senate);
}

module.exports = {
  async get(guildId, userId) {
    return db.getFirstRow(
      queries.selectBanReq,
      [userId]
    );
  },

  async update(guild) {
    const {ages: {ban_req}, top: {court}} = await db.getGuild(guild.id, {
      ages: "ban_req",
      top: "court"
    });
    let {rows: requests} = await db.pool.query(
      queries.selectPrecourtBanReqs,
      [guild.id]
    );

    for (let i = 0; i < requests.length; i++)
      await updatePrecourt(guild, requests[i], ban_req, court);

    ({rows: requests} = await db.pool.query(
      queries.selectResolvedBanReqs,
      [guild.id]
    ));

    for (let i = 0; i < requests.length; i++)
      await updateResolved(guild, requests[i], ban_req, court);
  }
};
