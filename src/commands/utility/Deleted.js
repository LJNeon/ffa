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
const {Argument, ArgumentDefault, Command} = require("patron.js");
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const deleted = require("../../services/deleted.js");
const {data: {descriptions, responses}} = require("../../services/data.js");
const message = require("../../utilities/message.js");
const str = require("../../utilities/string.js");

function formatField(response, msg, user) {
  return str.format(
    response,
    msg.id,
    message.tag(user),
    user.id
  );
}

async function getFieldsAndUsers(msgs) {
  const fields = [];
  const users = [];

  for (let i = 0; i < msgs.length; i++) {
    users.push(await message.getUser(msgs[i].author_id));

    const revision = await db.getFirstRow(
      "SELECT * FROM revisions WHERE msg_id = $1 ORDER BY time ASC LIMIT 1",
      [msgs[i].id]
    );

    if (revision.content.length !== 0) {
      fields.push({
        name: formatField(
          responses.msgTxtFormat,
          msgs[i],
          users[i]
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
        name: formatField(
          responses.attachment,
          msgs[i],
          users[i]
        ),
        value: str.list(attachments.map(a => str.format(
          descriptions.attachment,
          str.escapeFormat(a.name),
          a.id
        )))
      });
    }
  }

  return {
    fields,
    users
  };
}

module.exports = new class Deleted extends Command {
  constructor() {
    super({
      args: [new Argument({
        defaultValue: ArgumentDefault.Channel,
        example: "<#254066549587968001>",
        key: "channel",
        name: "channel",
        type: "guildchannel"
      }),
      new Argument({
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
      description: "Gets the last deleted messages of a channel.",
      groupName: "utility",
      names: ["deleted", "deletedmessages", "deletedmsgs"],
      preconditions: ["nsfw"]
    });
  }

  async run(msg, args) {
    const ids = deleted.get(args.channel.id, args.count);

    if (ids.length === 0) {
      return message.replyError(
        msg,
        "there are no recently deleted messages in that channel."
      );
    }

    const {rows: msgs} = await db.pool.query(
      "SELECT * FROM messages WHERE id = ANY($1)",
      [ids]
    );
    const {fields, users} = await getFieldsAndUsers(msgs);
    const approved = await message.verify(msg, users);

    if (approved == null)
      return;

    await approved.edit(message.embedify({fields}));
  }
}();
