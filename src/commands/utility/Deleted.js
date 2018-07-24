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
const deleted = require("../../services/deleted.js");
const {data: {descriptions, responses}} = require("../../services/data.js");
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
      names: ["deleted", "deletedmessages", "deletedmsgs"],
      preconditions: ["nsfw"]
    });
  }

  async run(msg, args) {
    const ids = deleted.get(msg.channel.id, args.count);

    if (ids.length === 0) {
      return message.replyError(
        msg,
        "there are no recently deleted messages in this channel."
      );
    }

    const {rows: msgs} = await db.pool.query(
      "SELECT * FROM messages WHERE id = ANY($1)",
      [ids]
    );
    const fields = [];
    const users = [];

    for (let i = 0; i < msgs.length; i++) {
      const revision = await db.getFirstRow(
        "SELECT * FROM revisions WHERE msg_id = $1 ORDER BY epoch ASC LIMIT 1",
        [msgs[i].id]
      );

      users.push(await message.getUser(msgs[i].author_id));

      if (revision.content.length !== 0) {
        fields.push({
          name: str.format(
            responses.msg,
            msgs[i].id,
            message.tag(users[i]),
            users[i].id
          ),
          value: revision.content.slice(0, config.max.deletedMsgChars)
        });
      }

      if (revision.attachment_ids.length !== 0) {
        const {rows: attachments} = await db.pool.query(
          "SELECT id, name FROM attachments WHERE id = ANY($1)",
          [revision.attachment_ids]
        );

        fields.push({
          name: str.format(
            responses.attachment,
            msgs[i].id,
            message.tag(users[i]),
            users[i].id
          ),
          value: str.list(attachments.map(a => str.format(
            descriptions.attachment,
            str.escapeFormat(a.name),
            a.id
          )))
        });
      }
    }

    const approved = await message.verify(msg, users);

    if (approved == null)
      return;

    await approved.edit(message.embedify({fields}));
  }
}();
