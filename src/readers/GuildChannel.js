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
const {TypeReader, TypeReaderResult} = require("patron.js");
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const message = require("../utilities/message.js");
const {data: {regexes}} = require("../services/data.js");
const str = require("../utilities/string.js");

function handleMatches(cmd, matches) {
  let channels = matches;

  if (channels.length === 0)
    return;
  else if (channels.length === 1)
    return TypeReaderResult.fromSuccess(channels[0]);

  if (channels.length > config.max.readerResults) {
    const more = `${channels.length - config.max.userResults} more`;

    channels = channels.slice(0, config.max.userResults).map(c => c.mention);
    channels.push(more);
  } else {
    channels = channels.map(c => c.mention);
  }

  return TypeReaderResult.fromError(
    cmd,
    `I found multiple channels: ${str.list(channels)}.`
  );
}

module.exports = new class GuildChannel extends TypeReader {
  constructor() {
    super({type: "guildchannel"});
  }

  async read(cmd, msg, arg, args, val) {
    const lowerVal = val.toLowerCase();
    let id = val.match(regexes.mention);

    if (id != null || (id = val.match(regexes.id)) != null) {
      id = id[id.length - 1];

      const channel = await msg.channel.guild.channels.get(id);

      if (channel == null)
        return TypeReaderResult.fromError(cmd, "Channel not found.");

      return TypeReaderResult.fromSuccess(channel);
    }

    let result = handleMatches(cmd, msg.channel.guild.channels.filter(
      c => c.name.toLowerCase() === lowerVal
    ));

    if (result != null)
      return result;

    result = handleMatches(cmd, msg.channel.guild.channels
      .filter(c => str.similarity(c.name, val) <= config.max.typos));

    if (result != null)
      return result;

    return TypeReaderResult.fromError(cmd, "Channel not found.");
  }
}();
