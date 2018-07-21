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
const message = require("../../utilities/message.js");
const {data: {queries}} = require("../../services/data.js");
const time = require("../../utilities/time.js");

module.exports = new class TimeLeft extends Command {
  constructor() {
    super({
      args: [new Argument({
        defaultValue: ArgumentDefault.Author,
        example: "hornydevil#0018",
        key: "user",
        name: "user",
        preconditions: ["muted"],
        remainder: true,
        type: "user"
      })],
      description: "Tell how much time is left on your mute.",
      groupName: "utility",
      names: ["timeleft", "left"]
    });
  }

  async run(msg, args) {
    const epoch = Date.now();
    const res = await db.pool.query(
      queries.selectMute,
      [new Date(epoch - config.max.mute), args.user.id]
    );
    const [log] = res.rows;
    const timeStr = time.format(log.epoch.getTime() + log.data.length - epoch);

    await message.create(msg.channel, {
      description: `**Time Left:** ${timeStr}`,
      footer: {text: `Log #${log.log_id}`},
      title: `${message.tag(args.user)}'s Mute`
    });
  }
}();
