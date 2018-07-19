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
module.exports = {
  add(condition, callback, key) {
    this.collectors.push({
      callback,
      condition,
      key
    });
  },

  check(msg) {
    for (let i = 0; i < this.collectors.length; i++) {
      if (this.collectors[i].condition(msg) === true) {
        this.collectors[i].callback(msg);
        this.collectors.splice(i, 1);
        i--;
      }
    }
  },

  collectors: [],

  remove(key) {
    const index = this.collectors.findIndex(c => c.key === key);

    if (index !== -1)
      this.collectors.splice(index, 1);
  }
};
