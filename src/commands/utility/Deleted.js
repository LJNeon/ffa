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
const {Argument, Command} = require("patron.js");
const {config} = require("../../services/cli.js");
const deleted = require("../../services/deleted.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

module.exports = new class Deleted extends Command {
  constructor() {
    super({
      args: [new Argument({
        defaultValue: config.default.deletedMsgs,
        example: "5",
        key: "count",
        name: "count",
        preconditionOptions: [{
          max: config.max.deletedMsgs,
          min: config.min.deletedMsgs
        }],
        preconditions: ["between"],
        type: "integer"
      })],
      description: "Gets the last deleted messages of the channel.",
      groupName: "utility",
      names: ["deleted", "deletedmessages", "deletedmsgs"]
    });
  }

  msgFormat(msg) {
    let value = msg.content.slice(0, config.max.deletedMsgChars);

    if (msg.attachments != null && msg.attachments.length !== 0) {
      const list = msg.attachments.map(a => {
        return `[${a.filename}](https://ffabot.com/api/attachments/${a.id})`;
      });

      value += `\n**Attachments:** ${str.list(list)}`;
    }

    return {
      name: message.tag(msg.author),
      value
    };
  }

  async run(msg, args) {
    const msgs = deleted.get(msg.channel.id, args.count);

    if (msgs.length === 0) {
      return message.replyError(
        msg,
        "there have been no recent deleted messages in this channel."
      );
    }

    await message.create(
      msg.channel,
      {fields: msgs.map(m => this.msgFormat(m))}
    );
  }
}();
