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
const logs = require("./logs.js");
const message = require("../utilities/message.js");
const {data: {queries, responses}} = require("./data.js");
const senateUpdate = require("./senateUpdate.js");
const str = require("../utilities/string.js");
const lbQuery = str.format(queries.selectRep, "DESC LIMIT $2");

module.exports = {
  async get(guildId, userId) {
    return db.getFirstRow(
      queries.selectBanReq,
      [userId]
    );
  },

  async update(guild) {
    const {
      ages: {ban_req},
      senate: {ban_sigs},
      top: {court, senate}
    } = await db.getGuild(guild.id, {
      ages: "ban_req",
      senate: "ban_sigs",
      top: "court, senate"
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

      for (let j = 0; j < signs.length; j++) {
        const user = await message.getUser(signs[j].data.signer_id);

        signs[j] = `${message.tag(user)} (${user.id})`;
      }

      if (signs.length < ban_sigs) {
        requests[i].data.reached_court = false;
        requests[i].data.resolved = true;
        await db.pool.query(
          "UPDATE logs SET data = $1 WHERE log_id = $2",
          [requests[i].data, requests[i].log_id]
        );
        continue;
      }

      const {data} = requests[i];
      const {rows: courtMembers} = await db.pool.query(
        lbQuery,
        [guild.id, court + 1]
      );

      for (let j = 0; j < courtMembers.length; j++)
        courtMembers[j] = await message.getUser(courtMembers[j].user_id);

      const index = courtMembers.findIndex(c => c.id === data.offender);

      if (index === -1)
        courtMembers.pop();
      else
        courtMembers.splice(index, 1);

      data.reached_court = true;
      data.court = courtMembers.map(c => c.id);
      await db.pool.query(
        "UPDATE logs SET data = $1 WHERE log_id = $2",
        [data, requests[i].log_id]
      );
      await message.dm(
        await message.getUser(data.offender),
        str.format(
          responses.almostBanned,
          message.tag(await message.getUser(data.requester)),
          requests[i].log_id,
          str.list(courtMembers.map(c => `**${message.tag(c)}**`))
        )
      ).catch(() => {});

      const user = await message.getUser(data.offender);
      const requester = await message.getUser(data.requester);
      const description = str.format(
        responses.banReq,
        "",
        data.rule,
        data.evidence,
        str.list(data.msg_ids),
        message.tag(requester),
        requester.id,
        `\n**Signers:** ${str.list(signs)}\n**Log ID:** ${requests[i].log_id}`
      );
      const title = `Ban Request for ${message.tag(user)} (${user.id})`;

      for (let j = 0; j < courtMembers.length; j++) {
        await message.dm(
          courtMembers[j],
          {
            description,
            title
          }
        ).catch(e => {
          if (e.code === 50007) {
            db.pool.query(
              queries.resetRep,
              [guild.id, courtMembers[j].id]
            ).then(() => senateUpdate(guild));
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
        if (votes.findIndex(v => v.data.voter_id === data.court[j]) === -1) {
          await db.pool.query(
            queries.resetRep,
            [guild.id, data.court[j]]
          );
          await senateUpdate(guild);
        }
      }

      if (votes.length !== 0
          && votes.findIndex(v => v.data.for === false) === -1) {
        const requester = await message.getUser(data.requester);
        const logId = await logs.add({
          data: {
            log_id: requests[i].log_id,
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

        for (let j = court; j < res.rows.length; j++) {
          const user = await message.getUser(res.rows[j].user_id);

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
          )
        ).catch(() => {});
        await guild.banMember(data.offender);
      }
    }
  }
};
