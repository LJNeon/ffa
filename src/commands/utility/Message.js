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
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const {data: {descriptions, responses}} = require("../../services/data.js");
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
    const approved = await message.verify(
      msg,
      [client.users.get(args.msg.author_id)]
    );

    if (approved == null) {
      return;
    } else if (args.msg.revisions.length < args.edit) {
      return approved.edit(message.embedify({
        color: config.customColors.error,
        description: str.format(
          responses.revisionDoesntExist,
          message.tag(msg.author)
        )
      }));
    }

    const {rows: attachments} = await db.pool.query(
      "SELECT id, name FROM attachments WHERE id = ANY($1)",
      [args.msg.revisions[args.edit - 1].attachment_ids]
    );

    await approved.edit(message.embedify({
      author: {name: message.tag(client.users.get(args.msg.author_id))},
      description: args.msg.revisions[args.edit - 1].content,
      fields: attachments.length === 0 ? null : [{
        name: "Attachments",
        value: str.list(attachments.map(a => str.format(
          descriptions.attachment,
          str.escapeFormat(a.name),
          a.id
        )))
      }]
    }));
  }
}();
