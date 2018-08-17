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
const {config} = require("./cli.js");
const db = require("./database.js");
const logs = require("./logs.js");
const {data: {queries}} = require("./data.js");
const senate = require("./senate.js");
const str = require("../utilities/string.js");
const cooldowns = new Map();
const selectReppedMsgs = str.format(
  queries.selectReppedMsgs,
  config.chat.activeAmount
);

function percentSim(one, two) {
  const sim = str.similarity(one, two);

  return 1 - (sim / Math.max(one.length, two.length));
}

async function validateReppedMessages(msg) {
  const {rows: msgs} = await db.pool.query(
    selectReppedMsgs,
    [msg.channel.guild.id, msg.author.id]
  );

  for (let i = 0; i < msgs.length; i++) {
    const {rows: revisions} = await db.pool.query(
      "SELECT * FROM revisions WHERE msg_id = $1",
      [msgs[i].id]
    );

    for (let j = 0; j < revisions.length; j++) {
      if (percentSim(revisions[j].content, msg.content) >= config.chat.sim)
        return false;
    }
  }

  return true;
}

module.exports = async (msg, guild) => {
  const isMuted = await senate.isMuted(
    msg.channel.guild.id,
    msg.author.id
  );

  if (msg.content.startsWith(config.bot.prefix) === false && isMuted === false
      && (cooldowns.has(msg.author.id) === false
      || cooldowns.get(msg.author.id) <= Date.now())) {
    const valid = await validateReppedMessages(msg);

    if (valid === false)
      return;

    cooldowns.set(msg.author.id, Date.now() + guild.chat.delay);
    await db.changeRep(
      msg.channel.guild.id,
      msg.author.id,
      guild.chat.reward
    );
    await logs.markReppedMsg(msg.id);
  }
};
