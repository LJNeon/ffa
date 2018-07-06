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
const {CommandResult} = require("patron.js");
const {config} = require("./cli.js");
const {data: {responses, queries}} = require("./data.js");
const db = require("./database.js");
const message = require("../utilities/message.js");
const MultiMutex = require("../utilities/MultiMutex.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");
const muteUserQuery = str.format(queries.muteUser, "true");
const unmuteUserQuery = str.format(queries.muteUser, "false");

module.exports = {
  async addLog(log, color) {
    const {channels: {log_id}, senate: {case_count}} = await db.getGuild(
      log.guild_id,
      {
        channels: "log_id",
        senate: "case_count"
      }
    );
    let msg;

    await db.pool.query(
      queries.addLog,
      [log.guild_id,
        log.user_id,
        case_count + 1,
        log.data,
        time.epoch(),
        log.type]
    );
    await db.pool.query(
      "UPDATE senate SET case_count = case_count + 1 WHERE guild_id = $1",
      [log.guild_id]
    );

    if (log_id != null) {
      const channel = client.getChannel(log_id);

      if (channel != null) {
        let user = null;

        if (log.data != null && log.data.mod_id != null)
          user = client.users.get(log.data.mod_id);

        msg = message.create(channel, {
          author: user == null ? null : {
            icon_url: user.avatarURL,
            name: `${message.tag(user)} (${log.data.mod_id})`
          },
          description: this.describeLog(log),
          footer: {text: `Case #${case_count + 1}`},
          timestamp: new Date()
        }, color);
      }
    }

    return {
      caseNum: case_count + 1,
      logMsg: msg
    };
  },

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

      if (isMuted === true)
        return false;

      const data = {
        data: {length},
        guild_id: msg.channel.guild.id,
        type: "automute",
        user_id: msg.author.id
      };
      const {caseNum, logMsg} = await this.addLog(
        data,
        config.customColors.mute
      );
      await db.pool.query(muteUserQuery, [msg.channel.guild.id, msg.author.id]);

      try {
        const member = msg.channel.guild.members.get(msg.author.id);

        if (member.roles.includes(muted_id) === false)
          await member.addRole(muted_id);
      } catch (e) {
        await db.pool.query(
          unmuteUserQuery,
          [msg.channel.guild.id, msg.author.id]
        );
        await this.removeLog(e, logMsg, caseNum, true);
        return false;
      }
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
        return true;

      const isMuted = await this.isMuted(log.guild_id, log.user_id, muted_id);

      if (isMuted === false)
        return false;

      const data = {
        guild_id: log.guild_id,
        type: "autounmute",
        user_id: log.user_id
      };
      const {caseNum, logMsg} = await this.addLog(
        data,
        config.customColors.unmute
      );
      await db.pool.query(unmuteUserQuery, [log.guild_id, log.user_id]);

      try {
        const member = guild.members.get(log.user_id);

        if (member.roles.includes(muted_id) === true)
          await member.removeRole(muted_id);
      } catch (e) {
        await this.removeLog(e, logMsg, caseNum, true);
        await db.pool.query(muteUserQuery, [log.guild_id, log.user_id]);

        return false;
      }
    });
  },

  describeLog(log) {
    let action = "Mute";
    let data = "";

    if (log.type === "unmute")
      action = "Unmute";
    else if (log.type === "automute")
      action = "Automatic Mute";
    else if (log.type === "autounmute")
      action = "Automatic Unmute";
    else if (log.type === "clear")
      action = "Clear";

    if (log.data != null) {
      for (const key in log.data) {
        if (log.data.hasOwnProperty(key) === false || key === "mod_id")
          continue;

        let val = log.data[key];

        if (val == null)
          continue;
        else if (key === "epoch")
          val = time.format(val);

        data += `\n**${str.capitalize(key)}:** ${val}`;
      }
    }

    return str.format(
      responses.log,
      action,
      message.tag(client.users.get(log.user_id)),
      log.user_id,
      data
    );
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

      const data = {
        data: {
          evidence: args.evidence,
          length: args.length,
          mod_id: msg.author.id,
          rule: args.rule.content
        },
        guild_id: msg.channel.guild.id,
        type: "mute",
        user_id: args.user.id
      };
      const {caseNum, logMsg} = await this.addLog(
        data,
        config.customColors.mute
      );
      await db.pool.query(muteUserQuery, [msg.channel.guild.id, args.user.id]);

      try {
        const tag = message.tag(msg.author);
        const member = msg.channel.guild.members.get(args.user.id);

        if (member != null && member.roles.includes(muted_id) === false)
          await member.addRole(muted_id);

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
      } catch (e) {
        await this.removeLog(e, logMsg, caseNum);
        await db.pool.query(
          unmuteUserQuery,
          [msg.channel.guild.id, args.user.id]
        );
      }
    });
  },

  mutex: new MultiMutex(),

  async removeLog(err, msg, caseNum, silent = false) {
    const logMsg = await msg;

    await db.pool.query("DELETE FROM logs WHERE case_number = $1", [caseNum]);
    await db.pool.query(
      "UPDATE senate SET case_count = case_count - 1 WHERE guild_id = $1",
      [logMsg.channel.guild.id]
    );
    await logMsg.delete();

    if (silent === false)
      throw err;
  },

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

      const data = {
        data: {
          evidence: args.evidence,
          mod_id: msg.author.id
        },
        guild_id: msg.channel.guild.id,
        type: "unmute",
        user_id: args.user.id
      };
      const {caseNum, logMsg} = await this.addLog(
        data,
        config.customColors.unmute
      );
      await db.pool.query(
        unmuteUserQuery,
        [msg.channel.guild.id, args.user.id]
      );

      try {
        const member = msg.channel.guild.members.get(args.user.id);

        if (member != null && member.roles.includes(muted_id) === true)
          await member.removeRole(muted_id);

        await message.reply(
          msg,
          `you have successfully unmuted **${message.tag(args.user)}**.`
        );
      } catch (e) {
        await this.removeLog(e, logMsg, caseNum);
        await db.pool.query(
          muteUserQuery,
          [msg.channel.guild.id, args.user.id]
        );
      }
    });
  }
};
