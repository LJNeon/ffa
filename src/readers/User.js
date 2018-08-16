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
  let users = matches;

  if (users.length === 0)
    return;
  else if (users.length === 1)
    return TypeReaderResult.fromSuccess(users[0]);

  if (users.length > config.max.readerResults) {
    const more = `${users.length - config.max.readerResults} more`;

    users = users.slice(0, config.max.readerResults).map(u => message.tag(u));
    users.push(more);
  } else {
    users = users.map(u => message.tag(u));
  }

  return TypeReaderResult.fromError(
    cmd,
    `I found multiple members: ${str.list(users)}.`
  );
}

module.exports = new class User extends TypeReader {
  constructor() {
    super({type: "user"});
  }

  async read(cmd, msg, arg, args, val) {
    const lowerVal = val.toLowerCase();
    let id = val.match(regexes.mention);

    if (id != null || (id = val.match(regexes.id)) != null) {
      id = id[id.length - 1];

      const user = await message.getUser(id);

      if (user == null)
        return TypeReaderResult.fromError(cmd, "User not found.");

      return TypeReaderResult.fromSuccess(user);
    }

    let result = handleMatches(cmd, client.users.filter(
      u => `${u.username.toLowerCase()}#${u.discriminator}` === lowerVal
    ));

    if (result != null)
      return result;

    result = handleMatches(cmd, client.users
      .filter(u => str.similarity(u.username, val) <= config.max.typos));

    if (result != null)
      return result;
    else if (msg.channel.guild == null)
      return TypeReaderResult.fromError(cmd, "User not found.");

    result = handleMatches(cmd, msg.channel.guild.members.filter(
      m => m.nick != null && str.similarity(m.nick, val) <= config.max.typos
    ).map(m => m.user));

    if (result != null)
      return result;

    return TypeReaderResult.fromError(cmd, "User not found.");
  }
}();
