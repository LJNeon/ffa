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
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const msgCollector = require("../services/messageCollector.js");
const random = require("./random.js");
const {
  data: {
    constants,
    descriptions,
    regexes,
    responses
  }
} = require("../services/data.js");
const str = require("./string.js");

function addGuildFooter(footer, guild) {
  if (footer == null) {
    return {
      icon_url: guild.iconURL,
      text: guild.name
    };
  }

  const result = footer;

  if (footer.text == null)
    result.text = guild.name;
  else
    result.text += ` | ${guild.name}`;

  if (footer.icon_url == null)
    result.icon_url = guild.iconURL;

  return result;
}

function getRevisions(msg) {
  return msg.revisions.map((r, i) => {
    let attachments = " None";
    const time = r.time.toLocaleDateString("en-US", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    if (r.attachment_ids.length !== 0) {
      attachments = `\n${r.attachment_ids.map(a => {
        const url = str.format(responses.attachmentUrl, a);

        return `      * ${url}`;
      })}`;
    }

    return str.format(
      responses.revisionList,
      i + 1,
      r.content.length === 0 ? "None" : r.content,
      attachments,
      time
    );
  });
}

module.exports = {
  canUseRole(guild, role) {
    const member = guild.members.get(client.user.id);

    if (member.permission.has("manageRoles") === false)
      return false;

    let highest = 0;

    for (let i = 0; i < member.roles.length; i++) {
      const pos = guild.roles.get(member.roles[i]).position;

      if (pos > highest)
        highest = pos;
    }

    return highest > role.position;
  },

  colors: config.colors,

  create(channel, msg, color, file, guild) {
    const perms = this.verifyPerms(channel);

    if (perms === false)
      return;

    let result = msg;

    if (typeof msg === "string") {
      result = this.embedify({
        color,
        description: msg
      });
    } else {
      result = this.embedify({
        color,
        ...msg
      });
    }

    if (channel.guild == null && guild != null)
      result.embed.footer = addGuildFooter(result.embed.footer, guild);

    return channel.createMessage(result, file);
  },

  // TODO delete when eval is removed
  createError(channel, msg) {
    return this.create(channel, msg, this.errorColor);
  },

  async dm(user, msg, color, guild, file) {
    return this.create(await user.getDMChannel(), msg, color, file, guild);
  },

  embedify(options) {
    let embed = {};

    if (typeof options === "string")
      embed.description = options;
    else
      embed = options;

    if (embed.color == null)
      embed.color = random.element(this.colors);

    return {
      content: "",
      embed
    };
  },

  errorColor: config.customColors.error,

  getIds(content) {
    const ids = content.match(regexes.ids);

    return ids == null ? [] : ids.filter((e, i) => ids.indexOf(e) === i);
  },

  getOldest() {
    return (Date.now() - constants.discordEpoch) * constants.snowflakeMult;
  },

  getUser(id) {
    const user = client.users.get(id);

    if (user == null) {
      try {
        return client.getRESTUser(id);
      } catch (e) {
        if (e.code !== constants.discordErrorCodes.unknownUser)
          throw e;
      }
    } else {
      return user;
    }
  },

  isValid(msg) {
    const notBot = msg.author != null && msg.author.bot === false
      && msg.author.discriminator !== "0000";
    const notEmbed = msg.embeds != null && msg.embeds.length === 0;

    return msg.type === 0 && notBot && notEmbed;
  },

  list(msgs) {
    if (msgs.length === 0)
      return "None";

    return msgs.map(msg => {
      const channel = client.getChannel(msg.channel_id);
      const guild = client.guilds.get(msg.guild_id);
      const revisions = getRevisions(msg);

      return str.format(
        responses.msgList,
        msg.id,
        guild == null ? msg.guild_id : `${guild.name} (${guild.id})`,
        channel == null ? msg.channel_id : `#${channel.name} (${channel.id})`,
        revisions.join("\n  ")
      );
    }).join("\n");
  },

  reply(msg, reply, color, file) {
    let result;

    if (typeof reply === "string") {
      result = str.format(
        descriptions.msg,
        this.tag(msg.author),
        reply
      );
    } else {
      result = this.embedify(reply);
      result.description = str.format(
        descriptions.msg,
        this.tag(msg.author),
        result.description
      );
    }

    return this.create(msg.channel, result, color, file);
  },

  replyError(msg, reply) {
    return this.reply(msg, reply, this.errorColor);
  },

  role(role) {
    return role.mentionable ? `@${str.escapeFormat(role.name)}` : role.mention;
  },

  tag(user) {
    return `${str.escapeFormat(user.username)}#${user.discriminator}`;
  },

  verify(msg, users, file) {
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        if (users[i].id === users[j].id) {
          users.splice(i, 1);
          break;
        }
      }
    }

    const response = str.format(
      responses.nsfw,
      str.list(users.map(u => `**${this.tag(u)}**`)),
      str.list(users.map(u => u.id))
    );

    return new Promise(res => {
      this.create(msg.channel, response, null, file).then(reply => {
        const timeout = setTimeout(() => {
          msgCollector.remove(msg.id);
          res();
        }, config.timer.verifyTimeout);

        msgCollector.add(
          m => m.author.id === msg.author.id
            && m.content.toLowerCase() === "yes",
          yes => {
            clearTimeout(timeout);
            yes.delete().catch(() => {});
            res(reply);
          },
          msg.id
        );
      });
    });
  },

  verifyPerms(channel) {
    if (channel.guild == null)
      return true;

    const perms = channel.permissionsOf(channel.guild.shard.client.user.id);

    if (perms.has("sendMessages") === true && perms.has("embedLinks") === true)
      return true;

    return false;
  }
};
