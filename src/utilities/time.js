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
const str = require("./string.js");
const {config: {default: {timePrecision}}} = require("../services/cli.js");
const {data: {constants: {maxPad, times}}} = require("../services/data.js");
const keys = Object.keys(times).sort((a, b) => times[b][0] - times[a][0]);

module.exports = {
  clockFormat(ms) {
    const hours = Math.floor(ms / times.hour[0] % times.hour[1]);
    const mins = Math.floor(ms / times.minute[0] % times.minute[1]);
    const secs = Math.floor(ms / times.second[0] % times.second[1]);

    return `${this.padNum(hours)}:${this.padNum(mins)}:${this.padNum(secs)}`;
  },

  format(ms, precision = timePrecision) {
    const items = [];

    for (let i = 0; i < keys.length; i++) {
      if (times[keys[i]][0] <= ms) {
        let num;

        if (times[keys[i]][1] == null)
          num = Math.floor(ms / times[keys[i]][0]);
        else
          num = Math.floor(ms / times[keys[i]][0] % times[keys[i]][1]);

        if (num !== 0)
          items.push(`${num} ${keys[i]}${num === 1 ? "" : "s"}`);
      }
    }

    return precision === 1 ? items[0] : str.list(items.slice(0, precision));
  },

  formatDate(date) {
    return `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`;
  },

  formatTime(time) {
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  padNum(number) {
    if (number < maxPad)
      return `0${number}`;

    return String(number);
  }
};
