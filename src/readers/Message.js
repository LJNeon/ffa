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
const db = require("../services/database.js");
const {data: {regexes, responses, queries}} = require("../services/data.js");

module.exports = new class Message extends TypeReader {
  constructor() {
    super({type: "msg"});
  }

  async read(cmd, msg, arg, args, val) {
    if (regexes.onlyId.test(val) === false) {
      return TypeReaderResult.fromError(
        cmd,
        "please provide a valid message ID."
      );
    }

    const res = await db.getFirstRow(
      queries.limitedMessageSelect,
      [msg.channel.guild.id, val]
    );

    if (res == null) {
      return TypeReaderResult.fromError(
        cmd,
        responses.invalidMessage
      );
    }

    const {rows} = await db.pool.query(
      "SELECT attachment_ids, content, epoch FROM revisions WHERE msg_id = $1",
      [val]
    );

    res.revisions = rows;

    return TypeReaderResult.fromSuccess(res);
  }
}();
