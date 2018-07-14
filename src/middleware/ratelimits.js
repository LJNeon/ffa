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
const store = new Map();
const {config} = require("../services/cli.js");

module.exports = async (req, res, next) => {
  let limits = store.get(req.ip);

  if (limits == null || limits.reset >= Date.now()) {
    store.set(req.ip, {
      count: 1,
      reset: Date.now() + config.duration
    });
    limits = store.get(req.ip);
  } else {
    limits.count++;
  }

  res.setHeader("X-RateLimit-Limit", config.max);
  res.setHeader("X-RateLimit-Remaining", Math.max(config.max - limits.count, 0));
  res.setHeader("X-RateLimit-Reset", Math.floor(limits.reset / 1e3));

  if (limits.count >= config.max) {
    res.writeHead(429, {"Retry-After": limits.reset - Date.now()});

    return res.end("Too many requests, please try again later.");
  }

  next();
};
