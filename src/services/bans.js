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
const {data: {queries, responses}} = require("./data.js");
const senateUpdate = require("./senateUpdate.js");
const str = require("../utilities/string.js");

module.exports = {
  async get(guildId, userId) {
    return db.getFirstRow(
      queries.selectBanReq,
      [userId]
    );
  },

  async update(guild) {
    const {ages: {ban_req}, senate: {ban_sigs}} = await db.getGuild(guild.id, {
      ages: "ban_req",
      senate: "ban_sigs"
    });
    let {rows: requests} = await db.pool.query(
      queries.selectPrecourtBanReqs,
      [guild.id, new Date(Date.now() - ban_req)]
    );

    for (let i = 0; i < requests.length; i++) {
      const {rows: signs} = await db.pool.query(
        queries.selectBanSigns,
        [requests[i].log_id]
      );

      for (let j = 0; j < signs.length; j++)
        signs[j] = await message.getUser(signs[j].data.signer_id);

      if (signs.length < ban_sigs) {
        requests[i].data.reached_court = false;
        requests[i].data.resolved = true;
        await db.pool.query(
          "UPDATE logs SET data = $1 WHERE log_id = $2",
          [requests[i].data, requests[i].log_id]
        );
        continue;
      }

      requests[i].data.reached_court = true;
      await db.pool.query(
        "UPDATE logs SET data = $1 WHERE log_id = $2",
        [requests[i].data, requests[i].log_id]
      );

      const user = await message.getUser(requests[i].data.offender);
      const requester = await message.getUser(requests[i].data.requester);
      const description = str.format(
        responses.banReq,
        requests[i].data.rule,
        requests[i].data.evidence,
        message.tag(requester),
        requester.id,
        str.list(signs.map(s => `**${message.tag(s)}** (${s.id})`))
      );
      const title = `Ban Request for ${message.tag(user)} (${user.id})`;

      for (let j = 0; j < requests[i].data.court.length; j++) {
        const guildId = requests[i].guild_id;
        const userId = requests[i].data.court[j];

        await message.dm(
          await message.getUser(userId),
          {
            description,
            title
          }
        ).catch(e => {
          if (e.code === 50007) {
            db.pool.query(
              queries.resetRep,
              [guildId, userId]
            ).then(() => senateUpdate(guildId));
          } else {
            throw e;
          }
        });
      }
    }

    ({rows: requests} = await db.pool.query(
      queries.selectResolvedBanReqs,
      [guild.id, new Date(Date.now() - (ban_req * 2))]
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

      for (let j = 0; j < data.court.length; j++) {
        if (votes.findIndex(v => v.voter_id === data.court[j]) === -1) {
          await db.pool.query(
            queries.resetRep,
            [requests[i].guild_id, data.court[j]]
          );
          await senateUpdate(requests[i].guild_id);
        }
      }

      if (votes.length !== 0 && votes.findIndex(v => v.for === false) === -1) {
        await logs.add({
          data: {
            log_id: requests[i].log_id,
            offender: requests[i].data.offender
          },
          guild_id: guild.id,
          type: "member_ban"
        });
        await client.guilds.get(guild.id).banMember(requests[i].data.offender);
      }
    }
  }
};
