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
const {Argument, Command, CommandResult} = require("patron.js");
const {config} = require("../../services/cli.js");
const db = require("../../services/database.js");
const message = require("../../utilities/message.js");
const logs = require("../../services/logs.js");
const {
  data: {
    constants,
    queries,
    responses
  }
} = require("../../services/data.js");
const str = require("../../utilities/string.js");
const time = require("../../utilities/time.js");
const selectReppedMsgs = str.format(
  queries.selectReppedMsgs,
  config.chat.activeAmount
);

async function validateReppedMsgs(msg) {
  const recent = new Date(Date.now() - config.chat.active);
  const {rows} = await db.pool.query(
    selectReppedMsgs,
    [msg.channel.guild.id, msg.author.id, recent]
  );

  if (rows.length === config.chat.activeAmount)
    return;

  return CommandResult.fromError(str.format(
    responses.requiredMsgs,
    config.chat.activeAmount,
    time.format(config.chat.active)
  ));
}

module.exports = new class Unrep extends Command {
  constructor() {
    super({
      args: [new Argument({
        example: "Phantom#1414",
        key: "user",
        name: "user",
        preconditions: ["noself", "nobot"],
        remainder: true,
        type: "user"
      })],
      cooldown: config.cd.unrep,
      description: "Remove reputation from any user.",
      groupName: "reputation",
      names: ["unrep"],
      preconditions: ["memberage"]
    });
    this.lastUnrepQuery = str.format(queries.selectLastRep, "unrep");
  }

  async run(msg, args) {
    const valid = await validateReppedMsgs(msg);

    if (valid != null)
      return valid;

    const timeframe = new Date(Date.now() - config.cd.userRepped);
    const {rows} = await db.pool.query(
      this.lastUnrepQuery,
      [msg.channel.guild.id, msg.author.id, timeframe]
    );

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].data.target_id === args.user.id) {
        return CommandResult.fromError(str.format(
          responses.alreadyRepped,
          message.tag(args.user),
          time.format(config.cd.userRepped)
        ));
      }
    }

    const {rep: {decrease, rep_reward}} = await db.getGuild(
      msg.channel.guild.id,
      {rep: "decrease, rep_reward"}
    );
    const {reputation} = await db.changeRep(
      msg.channel.guild.id,
      args.user.id,
      -decrease
    );

    await db.changeRep(msg.channel.guild.id, msg.author.id, rep_reward);
    await message.reply(msg, str.format(
      responses.rep,
      "unrepped",
      message.tag(args.user),
      "decreasing",
      reputation.toFixed(constants.numPrecision),
      rep_reward.toFixed(constants.numPrecision)
    ));
    await logs.add({
      data: {
        target_id: args.user.id,
        user_id: msg.author.id
      },
      guild_id: msg.channel.guild.id,
      type: "unrep"
    });
  }
}();
