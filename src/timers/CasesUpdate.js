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

async function setup(channel, content) {
  const channelMsgs = await channel.getMessages(100);
  const remove = [];

  for (let i = 0; i < channelMsgs.length; i++) {
    if (channelMsgs[i].author.id === client.user.id)
      remove.push(channelMsgs[i].id);
  }

  await channel.deleteMessages(remove);

  return channel.createMessage(content);
}

module.exports = new UpdateTimer(async guild => {
  const {channels: {cases_id}} = await db.getGuild(
    guild.id,
    {channels: "cases_id"}
  );

  if (cases_id == null)
    return;

  const channel = client.getChannel(cases_id);

  if (channel == null)
    return;

  let {rows: reqs} = await db.pool.query(queries.activeBanReqs);

  for (let i = 0; i < reqs; i++) {
    if (reqs[i].data.reached_court == null) {
      const {rows} = await db.pool.query(
        queries.selectBanSigns,
        [reqs[i].log_id]
      );

      reqs[i].status = `${rows.length} signatures`;
    } else {
      const {rows} = await db.pool.query(
        queries.selectBanVotes,
        [reqs[i].log_id]
      );

      if (rows.some(r => r.for === false) === true) {
        reqs.splice(i, 1);
        i--;
      } else {
        reqs[i].status = `${rows.length}-0`;
      }
    }
  }

  const content = message.embedify({fields: [{
    name: "Active Cases",
    value: reqs.map(r => {
      const user = message.getUser(r.user_id);
      const requester = message.getUser(r.data.requester);

      return str.format(
        descriptions.banReq,
        message.tag(requester),
        requester.id,
        r.log_id,
        message.tag(user),
        user.id,
        r.status
      );
    }).slice(0, 10).join("\n")
  }]});

  ({rows: reqs} = await db.pool.query(queries.recentBanReqs));

  for (let i = 0; i < reqs.length; i++) {
    const {rows} = await db.pool.query(
      queries.selectBanVotes,
      [reqs[i].log_id]
    );
    let yes = 0;
    let no = 0;

    for (let j = 0; j < rows.length; j++) {
      if (rows[j].data.for === true)
        yes++;
      else
        no++;
    }

    reqs[i].status = `${yes}-${no}`;
  }

  content.embed.fields.push({
    name: "Recent Cases",
    value: reqs.map(r => {
      const user = message.getUser(r.user_id);
      const requester = message.getUser(r.data.requester);

      return str.format(
        descriptions.banReq,
        message.tag(requester),
        requester.id,
        r.log_id,
        message.tag(user),
        user.id,
        r.status
      );
    }).join("\n")
  });

  const msg = msgs.get(guild.id);

  if (msg == null) {
    msgs.set(guild.id, await setup(channel, content));
  } else {
    try {
      await msg.edit(content);
    } catch (e) {
      if (e.code === 10008)
        msgs.set(guild.id, await setup(channel, content));
      else
        throw e;
    }
  }
}, config.timer.casesUpdate);
