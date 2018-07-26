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
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const db = require("../services/database.js");
const message = require("../utilities/message.js");
const {data: {queries, descriptions}} = require("../services/data.js");
const str = require("../utilities/string.js");
const UpdateTimer = require("../utilities/UpdateTimer.js");
const msgs = new Map();

async function setup(channel, active, recent) {
  const channelMsgs = await channel.getMessages(100);
  const remove = [];
  const res = [];

  for (let i = 0; i < channelMsgs.length; i++) {
    if (channelMsgs[i].author.id === client.user.id)
      remove.push(channelMsgs[i].id);
  }

  await channel.deleteMessages(remove);
  res.push(await channel.createMessage(active));
  res.push(await channel.createMessage(recent));

  return res;
}

module.exports = new UpdateTimer(async guild => {
  const {channels: {cases_id}} = await db.getGuild(
    guild.id,
    {channels: "cases_id"}
  );

  if (cases_id == null)
    return;

  const channel = client.getChannel(cases_id);

  if (channel == null
      || channel.permissionsOf(client.user.id).has("sendMessages") === false)
    return;

  let {rows: reqs} = await db.pool.query(queries.activeBanReqs);

  for (let i = 0; i < reqs.length; i++) {
    const {rows} = await db.pool.query(
      queries.selectBanVotes,
      [reqs[i].log_id]
    );

    if (rows.some(r => r.for === false) === true) {
      reqs.splice(i, 1);
      i--;
      continue;
    } else {
      reqs[i].status = `${rows.length}-0`;
    }

    reqs[i].user = await message.getUser(reqs[i].data.offender);
    reqs[i].requester = await message.getUser(reqs[i].data.requester);
  }

  const text = str.format(descriptions.casesFooter, config.bot.prefix);
  const active = message.embedify({
    description: reqs.length === 0 ? "None" : reqs.map(r => str.format(
      descriptions.banReq,
      message.tag(r.requester),
      r.requester.id,
      r.log_id,
      message.tag(r.user),
      r.user.id,
      r.data.rule,
      r.status
    )).slice(0, 10).join("\n"),
    footer: {text},
    title: "Active Cases"
  });

  ({rows: reqs} = await db.pool.query(queries.recentBanReqs));

  for (let i = 0; i < reqs.length; i++) {
    if (reqs[i].data.reached_court === true) {
      let {rows} = await db.pool.query(
        queries.selectBanVotes,
        [reqs[i].log_id]
      );

      rows = rows.reduce((a, b) => {
        const counter = a;

        counter[b.data.for === true ? "yes" : "no"]++;

        return counter;
      }, {
        no: 0,
        yes: 0
      });
      reqs[i].status = `${rows.yes}-${rows.no}`;
    } else {
      reqs[i].status = "didn't reach court";
    }

    reqs[i].user = await message.getUser(reqs[i].data.offender);
    reqs[i].requester = await message.getUser(reqs[i].data.requester);
  }

  const recent = message.embedify({
    description: reqs.length === 0 ? "None" : reqs.map(r => str.format(
      descriptions.banReq,
      message.tag(r.requester),
      r.requester.id,
      r.log_id,
      message.tag(r.user),
      r.user.id,
      r.data.rule,
      r.status
    )).join("\n"),
    footer: {text},
    title: "Recent Cases"
  });
  const msg = msgs.get(guild.id);

  if (msg == null) {
    msgs.set(guild.id, await setup(channel, active, recent));
  } else {
    try {
      await msg[0].edit(active);
      await msg[1].edit(recent);
    } catch (e) {
      if (e.code === 10008)
        msgs.set(guild.id, await setup(channel, active, recent));
      else
        throw e;
    }
  }
}, config.timer.casesUpdate);
