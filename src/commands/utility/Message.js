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
const client = require("../../services/client.js");
const db = require("../../services/database.js");
const {data: {descriptions}} = require("../../services/data.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

module.exports = new class Message extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "411412361526902786",
        key: "msg",
        name: "messageId",
        type: "msg"
      }),
      new Argument({
        defaultValue: 1,
        example: "1",
        key: "edit",
        name: "revision",
        preconditionOptions: [{
          max: args => args.msg.revisions.length,
          min: 1
        }],
        preconditions: ["between"],
        remainder: true,
        type: "integer"
      })],
      description: "See more information on a message from it's ID.",
      groupName: "utility",
      names: ["message", "msg"],
      preconditions: ["nsfw"]
    });
  }

  async run(msg, args) {
    if (args.msg.revisions.length < args.edit)
      return message.replyError(msg, "that revision doesn't exist.");

    const approved = await message.verify(
      msg,
      [client.users.get(args.msg.author_id)]
    );

    if (approved == null)
      return;

    const {rows: attachments} = await db.pool.query(
      "SELECT id, name FROM attachments WHERE id = ANY($1)",
      [args.msg.revisions[args.edit - 1].attachment_ids]
    );
    const author = client.users.get(args.msg.author_id);
    const channel = client.getChannel(args.msg.channel_id);

    await approved.edit(message.embedify({
      author: {
        icon_url: author.avatarURL,
        name: `${message.tag(author)} (${author.id})`
      },
      description: args.msg.revisions[args.edit - 1].content,
      fields: attachments.length === 0 ? null : [{
        name: "Attachments",
        value: str.list(attachments.map(a => str.format(
          descriptions.attachment,
          str.escapeFormat(a.name),
          a.id
        )))
      }],
      footer: {text: `#${channel.name} (${channel.id})`},
      timestamp: args.msg.revisions[args.edit - 1].epoch,
      title: `Revision ${args.edit} of ${args.msg.revisions.length}`
    }));
  }
}();
