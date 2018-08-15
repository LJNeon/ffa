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
const catchPromise = require("../utilities/catchPromise.js");
const chatService = require("../services/chat.js");
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const db = require("../services/database.js");
const handler = require("../services/handler.js");
const logs = require("../services/logs.js");
const message = require("../utilities/message.js");
const msgCollector = require("../services/messageCollector.js");
const resultService = require("../services/result.js");
const spamService = require("../services/spam.js");

client.on("messageCreate", catchPromise(async msg => {
  if (msg.embeds.length !== 0 && msg.author != null
      && msg.author.bot === false)
    return msg.delete().catch(() => {});
  else if (message.isValid(msg) === false)
    return;

  msgCollector.check(msg);

  let guild;

  if (msg.channel.guild != null) {
    logs.message(msg).catch(() => {});
    guild = await db.getGuild(msg.channel.guild.id, {
      channels: "ignored_ids",
      chat: "delay, reward",
      roles: "muted_id",
      senate: "auto_mute, mute_length",
      spam: "duration, msg_limit, rep_penalty"
    });

    if (guild.senate.auto_mute === true)
      await spamService.update(msg, guild);

    if (guild.channels.ignored_ids.includes(msg.channel.id) === true)
      return;

    await chatService(msg, guild);
  }

  if (msg.content.startsWith(config.bot.prefix) === false)
    return;

  const result = await handler.run(msg, config.bot.prefix.length);

  await resultService(msg, result);
}));
