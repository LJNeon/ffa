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
const {CommandError, Context} = require("patron.js");
const {config} = require("../services/cli.js");
const {
  data: {
    constants: {discordErrorCodes},
    responses
  }
} = require("../services/data.js");
const Logger = require("../utilities/Logger.js");
const message = require("../utilities/message.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");

function handleError(result) {
  let reply = result.error.message;

  if (result.error.constructor.name === "DiscordHTTPError"
      || result.error.constructor.name === "DiscordRESTError") {
    if (result.error.code === discordErrorCodes.userOnly)
      reply = "only a user account may perform this action.";
    else if (result.error.code === discordErrorCodes.cantDM)
      reply = responses.cantDM;
    else if (result.error.code === discordErrorCodes.noPerm[0]
        || result.error.code === discordErrorCodes.noPerm[1])
      reply = "I don't have permission to do that.";
    else if (result.error.code === discordErrorCodes.bulkDelete)
      reply = responses.noBulkDelete;
    else if (result.error.code > discordErrorCodes.internalError[0]
        && result.error.code < discordErrorCodes.internalError[1])
      reply = "an unexpected error has occurred, please try again later.";
    else if (result.error.message.startsWith(discordErrorCodes.timedOut))
      reply = "the request has timed out, please try again later.";
    else
      Logger.error(result.error);
  } else {
    Logger.error(result.error);
    reply = result.error.message;
  }

  return reply;
}

module.exports = async (msg, result) => {
  if (result.success === true)
    return;

  if (result.commandError === CommandError.CommandNotFound) {
    // TODO custom commands
    return;
  }

  let reply = "";

  if (result.commandError === CommandError.Exception) {
    reply = handleError(result);
  } else if (result.commandError === CommandError.BotPermission) {
    reply = "I don't have permission to do that.";
  } else if (result.commandError === CommandError.MemberPermission) {
    reply = "you don't have permission to do that.";
  } else if (result.commandError === CommandError.Cooldown) {
    reply = str.format(
      responses.cooldownReply,
      time.clockFormat(result.remaining)
    );
  } else if (result.commandError === CommandError.InvalidContext) {
    if (result.context === Context.Guild)
      reply = "this command may only be used in DMs.";
    else
      reply = "this command may only be used in a server.";
  } else if (result.commandError === CommandError.InvalidArgCount) {
    reply = str.format(
      responses.incorrectUsage,
      config.bot.prefix,
      result.command.getUsage(),
      result.command.getExample()
    );
  } else if (result.commandError === CommandError.Command
      || result.commandError === CommandError.Precondition
      || result.commandError === CommandError.TypeReader) {
    reply = result.errorReason;
  } else if (result.error == null) {
    Logger.error(result);
    reply = "an unknown error has occured.";
  } else {
    Logger.error(result.error);
    reply = result.error.message;
  }

  if (reply != null)
    await message.replyError(msg, reply);
};
