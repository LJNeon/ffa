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
  actions: new Map(),

  async check(guildId, userId, max) {
    const key = `${guildId}-${userId}`;

    if (this.actions.has(key) === false
        || Date.now() - this.actions.get(key).first > 36e5) {
      this.actions.set(key, {
        count: 1,
        first: Date.now()
      });
    }
console.log(this.actions.get(key).count, max, this.actions.get(key).count < max);
    return this.actions.get(key).count < max;
  },

  async reset() {
    this.actions = new Map();
  },

  async update(guildId, userId) {
    console.log(guildId, userId);
    this.actions.get(`${guildId}-${userId}`).count++;
    console.log(this.actions.get(`${guildId}-${userId}`).count);
  }
};
