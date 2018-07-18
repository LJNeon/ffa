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
const {
  data: {
    constants: {
      discordErrorCodes
    }
  }
} = require("../services/data.js");

module.exports = func => async (...args) => {
  let res;

  try {
    res = await func(...args);
  } catch (e) {
    const serverErr = e.constructor.name === "DiscordHTTPError"
        && (e.code > 599 || e.code < 500);
    const permErr = e.constructor.name === "DiscordRESTError"
        && e.code !== 50013 && e.code !== 403;
    const timedOutErr = e.message.startsWith(discordErrorCodes.timedOut);

    if (serverErr === true || permErr === true || timedOutErr === false)
      throw e;

    return false;
  }

  return res;
};
