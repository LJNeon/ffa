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
const message = require("../../utilities/message.js");
const {data: {responses, queries}} = require("../../services/data.js");
const str = require("../../utilities/string.js");

module.exports = new class UnrepLeaderboard extends Command {
  constructor() {
    super({
      args: [new Argument({
        defaultValue: config.default.lb,
        example: "20",
        key: "count",
        name: "count",
        preconditionOptions: [{
          max: config.max.lb,
          min: config.min.lb
        }],
        preconditions: ["between"],
        type: "integer"
      })],
      description: "The least reputable users.",
      groupName: "reputation",
      names: ["unrepleaderboard", "unreplb", "bottom", "bottomrep"]
    });
    this.lbQuery = str.format(queries.selectRep, "ASC LIMIT $2");
  }

  async run(msg, args) {
    const res = await db.pool.query(
      this.lbQuery,
      [msg.channel.guild.id, args.count]
    );
    const tags = [];

    for (let i = 0; i < res.rows.length; i++) {
      tags.push(await message.getUser(res.rows[i].user_id));
    }

    await message.create(msg.channel, {
      description: res.rows.map((r, i) => str.format(
        responses.lbEntry,
        i + 1,
        message.tag(tags[i]),
        r.reputation.toFixed(2)
      )).join("\n"),
      title: "The Least Reputable Users"
    });
  }
}();
