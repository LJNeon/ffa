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
const {config} = require("../services/cli.js");
const message = require("../utilities/message.js");
const {data: {regexes}} = require("../services/data.js");
const str = require("../utilities/string.js");

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

    if (msg.channel.guild == null)
      return TypeReaderResult.fromError(cmd, "User not found.");

    const index = val.lastIndexOf("#");

    if (index === -1) {
      let matches = [];

      for (const member of msg.channel.guild.members.values()) {
        const lowerUser = member.username.toLowerCase();
        const userSim = str.similarity(lowerUser, lowerVal);
        let lowerNick = null;
        let nickSim = Number.POSITIVE_INFINITY;

        if (member.nick != null) {
          lowerNick = member.nick.toLowerCase();
          nickSim = str.similarity(lowerNick, lowerVal);
        }

        if (lowerUser === lowerVal || lowerNick === lowerVal) {
          matches.push({
            typos: 0,
            user: member.user
          });
        } else if (userSim <= config.max.typos) {
          matches.push({
            typos: userSim,
            user: member.user
          });
        } else if (nickSim <= config.max.typos) {
          matches.push({
            typos: nickSim,
            user: member.user
          });
        }
      }

      if (matches.length !== 0) {
        if (matches.length === 1)
          return TypeReaderResult.fromSuccess(matches[0].user);

        if (matches.length > config.max.userResults) {
          const more = `${matches.length - config.max.userResults} more`;

          matches = matches.sort((a, b) => a.typos - b.typos)
            .slice(0, config.max.userResults)
            .map(m => message.tag(m.user));
          matches.push(more);
        } else {
          matches = matches.map(m => message.tag(m.user));
        }

        return TypeReaderResult.fromError(
          cmd,
          `I found multiple members: ${str.list(matches)}.`
        );
      }
    } else {
      let matches = [];

      for (const member of msg.channel.guild.members.values()) {
        const tag = message.tag(member);

        if (tag === lowerVal) {
          matches.push({
            typos: 0,
            user: member.user
          });
        } else {
          const userSim = str.similarity(tag, lowerVal);

          if (userSim <= config.max.typos) {
            matches.push({
              typos: userSim,
              user: member.user
            });
          }
        }
      }

      if (matches.length !== 0) {
        if (matches.length === 1)
          return TypeReaderResult.fromSuccess(matches[0].user);

        if (matches.length > config.max.userResults) {
          matches = matches.sort((a, b) => a.typos - b.typos)
            .slice(0, config.max.userResults)
            .map(m => message.tag(m.user));
          matches.push(`${matches.length - config.max.userResults} more`);
        } else {
          matches = matches.map(m => message.tag(m.user));
        }

        return TypeReaderResult.fromError(
          cmd,
          `I found multiple members: ${str.list(matches)}.`
        );
      }
    }

    return TypeReaderResult.fromError(cmd, "User not found.");
  }
}();
