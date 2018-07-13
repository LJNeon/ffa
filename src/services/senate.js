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
const catchApi = require("../utilities/catchApi.js");
const client = require("./client.js");
const {CommandResult} = require("patron.js");
const {config} = require("./cli.js");
const {data: {responses, queries}} = require("./data.js");
const db = require("./database.js");
const logs = require("./logs.js");
const message = require("../utilities/message.js");
const MultiMutex = require("../utilities/MultiMutex.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");
const addRole = catchApi(client.addGuildMemberRole);
const muteUserQuery = str.format(queries.muteUser, "true");
const removeRole = catchApi(client.removeGuildMemberRole);
const unmuteUserQuery = str.format(queries.muteUser, "false");

module.exports = {
  autoMute(msg, length) {
    return this.mutex.sync(msg.channel.guild.id, async () => {
      const {roles: {muted_id}} = await db.getGuild(
        msg.channel.guild.id,
        {roles: "muted_id"}
      );

      if (muted_id == null || msg.channel.guild.roles.get(muted_id) == null)
        return false;

      const isMuted = await this.isMuted(
        msg.channel.guild.id,
        msg.author.id,
        muted_id
      );
      const member = msg.channel.guild.members.get(msg.author.id);

      if (isMuted === true || member == null
          || member.roles.includes(muted_id) === true)
        return false;

      const res = await addRole(msg.channel.guild.id, member.id, muted_id);

      if (res === false)
        return res;

      await db.pool.query(muteUserQuery, [msg.channel.guild.id, msg.author.id]);
      await logs.add(
        {
          data: {length},
          guild_id: msg.channel.guild.id,
          type: "automute",
          user_id: msg.author.id
        },
        config.customColors.mute
      );

      return true;
    });
  },

  autoUnmute(log) {
    return this.mutex.sync(log.guild_id, async () => {
      const {roles: {muted_id}} = await db.getGuild(
        log.guild_id,
        {roles: "muted_id"}
      );
      const guild = client.guilds.get(log.guild_id);

      if (muted_id == null || guild.roles.get(muted_id) == null)
        return false;

      const isMuted = await this.isMuted(log.guild_id, log.user_id, muted_id);
      const member = guild.members.get(log.user_id);

      if (isMuted === false || member == null
          || member.roles.includes(muted_id) === false)
        return false;

      const res = await removeRole(log.guild_id, member.id, muted_id);

      if (res === false)
        return res;

      await db.pool.query(unmuteUserQuery, [log.guild_id, log.user_id]);
      await logs.add(
        {
          guild_id: log.guild_id,
          type: "autounmute",
          user_id: log.user_id
        },
        config.customColors.unmute
      );

      return true;
    });
  },

  async isMuted(guildId, userId, mutedRole, byRole = true) {
    const member = client.guilds.get(guildId).members.get(userId);
    const res = await db.pool.query(
      "SELECT muted FROM users WHERE (guild_id, user_id) = ($1, $2)",
      [guildId, userId]
    );
    const hasRole = member != null && member.roles.includes(mutedRole) === true;

    return (res.rows.length !== 0 && res.rows[0].muted === true)
      || (byRole === true && hasRole === true);
  },

  mute(msg, args) {
    return this.mutex.sync(msg.channel.guild.id, async () => {
      const {roles: {muted_id}} = await db.getGuild(
        msg.channel.guild.id,
        {roles: "muted_id"}
      );

      if (muted_id == null || msg.channel.guild.roles.get(muted_id) == null)
        return CommandResult.fromError("the muted role has not been set.");

      const isMuted = await this.isMuted(
        msg.channel.guild.id,
        args.user.id,
        muted_id
      );

      if (isMuted === true)
        return CommandResult.fromError(responses.notMutedUser);

      const member = msg.channel.guild.members.get(args.user.id);
      const tag = message.tag(args.user);

      if (member == null || member.roles.includes(muted_id) === true)
        return false;

      const res = await addRole(msg.channel.guild.id, member.id, muted_id);

      if (res === false)
        return res;

      await db.pool.query(muteUserQuery, [msg.channel.guild.id, args.user.id]);
      await logs.add(
        {
          data: {
            evidence: args.evidence,
            length: args.length,
            mod_id: msg.author.id,
            rule: args.rule.content
          },
          guild_id: msg.channel.guild.id,
          type: "mute",
          user_id: args.user.id
        },
        config.customColors.mute
      );
      await message.reply(
        msg,
        `you have successfully muted **${message.tag(args.user)}**.`
      );
      message.dm(args.user, str.format(
        responses.muted,
        tag,
        time.format(args.length),
        str.code(args.rule.content, ""),
        args.evidence == null ? "" : args.evidence,
        message.tag(client.users.get(msg.channel.guild.ownerID)),
        config.bot.prefix
      )).catch(() => {});
    });
  },

  mutex: new MultiMutex(),

  unmute(msg, args) {
    return this.mutex.sync(msg.channel.guild.id, async () => {
      const {roles: {muted_id}} = await db.getGuild(
        msg.channel.guild.id,
        {roles: "muted_id"}
      );

      if (muted_id == null || msg.channel.guild.roles.get(muted_id) == null)
        return CommandResult.fromError("the muted role has not been set.");

      const isMuted = await this.isMuted(
        msg.channel.guild.id,
        args.user.id,
        muted_id
      );

      if (isMuted === false)
        return CommandResult.fromError(responses.mutedUser);

      const member = msg.channel.guild.members.get(args.user.id);

      if (member == null || member.roles.includes(muted_id) === false)
        return false;

      await removeRole(msg.channel.guild.id, member.id, muted_id);
      await db.pool.query(
        unmuteUserQuery,
        [msg.channel.guild.id, args.user.id]
      );
      await logs.add(
        {
          data: {
            evidence: args.evidence,
            mod_id: msg.author.id
          },
          guild_id: msg.channel.guild.id,
          type: "unmute",
          user_id: args.user.id
        },
        config.customColors.unmute
      );
      await message.reply(
        msg,
        `you have successfully unmuted **${message.tag(args.user)}**.`
      );
    });
  }
};
