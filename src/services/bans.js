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
const client = require("./client.js");
const db = require("./database.js");
const logs = require("./logs.js");
const message = require("../utilities/message.js");
const {data: {queries}} = require("./data.js");
const senateUpdate = require("./senateUpdate.js");
const str = require("../utilities/string.js");

module.exports = {
  async get(guildId, userId) {
    const {ages: {ban_req}} = await db.getGuild(guildId, {ages: "ban_req"});
    const {rows: [request]} = await db.pool.query(
      queries.selectBanReq,
      [new Date(Date.now() - ban_req * 2), userId]
    );

    if (request != null)
      return request;
  },

  async update(guildId) {
    const {ages: {ban_req}, senate: {ban_sigs}} = await db.getGuild(guildId, {
      ages: "ban_req",
      senate: "ban_sigs"
    });
    let {rows: requests} = await db.pool.query(
      "SELECT * FROM logs WHERE guild_id = $1 AND type = 'ban_request' AND epoch < $1 AND data->'reached_court' IS NULL",
      [guildId, new Date(Date.now() - ban_req)]
    );

    for (let i = 0; i < requests.length; i++) {
      const {rows: signs} = await db.pool.query(
        queries.selectBanSigns,
        [requests[i].log_id]
      );

      for (let i = 0; i < signs.length; i++)
        signs[i] = await message.getUser(signs[i].user_id);

      if (signs.length < ban_sigs) {
        requests[i].data.reached_court = false;
        await db.pool.query(
          "UPDATE logs SET data = $1 WHERE log_id = $2",
          [requests[i].data, requests[i].log_id]
        );
      } else {
        requests[i].data.reached_court = true;
        await db.pool.query(
          "UPDATE logs SET data = $1 WHERE log_id = $2",
          [requests[i].data, requests[i].log_id]
        );

        const user = await message.getUser(requests[i].user_id);
        const requester = await message.getUser(requests[i].data.requester);

        const description = str.format(
          requests[i].data.rule,
          requests[i].data.evidence,
          message.tag(requester),
          requester.id,
          str.list(signs.map(s => `**${message.tag(s)}** (${s.id})`))
        );
        const title = `Ban Request for ${message.tag(user)} (${user.id})`;

        for (let i = 0; i < requests[i].data.court.length; i++) {
          try {
            await message.dm(await message.getUser(requests[i].data.court[i]), {
              description,
              title
            });
          } catch(e) {
            if (e.code === 50007) {
              await db.pool.query(
                queries.resetRep,
                [requests[i].guild_id, requests[i].data.court[i]]
              );
              await senateUpdate(requests[i].guild_id);
            } else {
              throw e;
            }
          }
        }
      }
    }

    ({rows: requests} = await db.pool.query(
      "SELECT * FROM logs WHERE guild_id = $1 AND type = 'ban_request' AND epoch < $1 AND data->'reached_court' IS NOT NULL AND (data->'resolved')::bool = false",
      [guildId, new Date(Date.now() - ban_req * 2)]
    ));

    for (let i = 0; i < requests.length; i++) {
      requests[i].data.resolved = true;
      await db.pool.query(
        "UPDATE logs SET data = $1 WHERE log_id = $2",
        [requests[i].data, requests[i].log_id]
      );

      const {rows: votes} = await db.pool.query(
        queries.selectBanVotes,
        [requests[i].log_id]
      );
      const {data} = requests[i];

      if (data.court.length != votes.length) {
        for (let i = 0; i < data.court.length; i++) {
          if (votes.findIndex(v => v.user_id === data.court[i]) === -1) {
            await db.pool.query(
              queries.resetRep,
              [requests[i].guild_id, data.court[i]]
            );
            await senateUpdate(requests[i].guild_id);
          }
        }
      }

      if (votes.length !== 0 && votes.findIndex(v => v.for === false) === -1) {
        await logs.add({
          guild_id: guildId,
          type: "member_ban",
          user_id: requests[i].user_id
        });
        await client.guilds.get(guildId).banMember(requests[i].user_id);
      }
    }
  }
};
