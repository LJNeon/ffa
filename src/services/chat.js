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
const senate = require("../services/senate.js");
const cooldowns = new Map();

module.exports = async (msg, guild) => {
  const isMuted = await senate.isMuted(
    msg.channel.guild.id,
    msg.author.id
  );

  if (msg.content.startsWith(config.bot.prefix) === false && isMuted === false
      && (cooldowns.has(msg.author.id) === false
      || cooldowns.get(msg.author.id) <= Date.now())) {
    cooldowns.set(msg.author.id, Date.now() + guild.chat.delay);
    await db.changeRep(
      msg.channel.guild.id,
      msg.author.id,
      guild.chat.reward
    );
  }
};
