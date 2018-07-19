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
const {data: {descriptions, responses}} = require("../services/data.js");
const str = require("./string.js");

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

  create(channel, msg, color, override = false) {
    let perms;

    if (channel.guild != null)
      perms = channel.permissionsOf(channel.guild.shard.client.user.id);

    if (perms != null && perms.has("sendMessages") === false)
      return;

    let result = msg.description;

    if (result == null) {
      if (msg.content == null)
        result = msg;
      else
        result = msg.content;
    }

    if (override !== true && (perms == null
        || perms.has("embedLinks") === true)) {
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
    }

    return channel.createMessage(result);
  },

  // TODO delete when eval is removed
  createError(channel, msg) {
    return this.create(channel, msg, this.errorColor);
  },

  async dm(user, msg, color, guild) {
    const channel = await user.getDMChannel();
    let result;

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

    if (guild != null) {
      if (result.footer == null) {
        result.footer = {
          icon_url: guild.iconURL,
          text: guild.name
        };
      } else {
        if (result.footer.text == null)
          result.footer.text = guild.name;
        else
          result.footer.text += ` | ${guild.name}`;

        if (result.footer.icon_url == null)
          result.footer.icon_url = guild.iconURL;
      }
    }

    return channel.createMessage(result);
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

  reply(msg, reply, color, override = false) {
    let perms;

    if (msg.channel.guild != null) {
      const clientId = msg.channel.guild.shard.client.user.id;

      perms = msg.channel.permissionsOf(clientId);
    }

    if (perms != null && perms.has("sendMessages") === false)
      return;

    let result = reply.description;

    if (result == null) {
      if (reply.content == null)
        result = reply;
      else
        result = reply.content;
    }

    if (override !== true && (perms == null
        || perms.has("embedLinks") === true)) {
      if (typeof reply === "string") {
        result = this.embedify({
          color,
          description: str.format(
            descriptions.msg,
            this.tag(msg.author),
            reply
          )
        });
      } else {
        result = reply;
        result.color = color;
        result.description = str.format(
          descriptions.msg,
          this.tag(msg.author),
          result.description
        );
        result = this.embedify({
          color,
          ...result
        });
      }
    } else {
      result = str.format(
        descriptions.msg,
        this.tag(msg.author),
        result
      );
    }

    return msg.channel.createMessage(result);
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

  verify(msg, users) {
    const response = str.format(
      responses.nsfw,
      str.list(users.map(this.tag)),
      str.list(users.map(u => u.id))
    );

    return new Promise(res => {
      this.create(msg.channel, response).then(reply => {
        const timeout = setTimeout(() => {
          msgCollector.remove(msg.id);
          res();
        }, 3e4);

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
  }
};
