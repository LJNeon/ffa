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
module.exports = class Mutex {
  constructor() {
    this.busy = false;
    this.queue = [];
  }

  dequeue() {
    this.busy = true;

    const next = this.queue.shift();

    if (next == null)
      this.busy = false;
    else
      this.execute(next);
  }

  execute(record) {
    let finished = false;

    record.task().then(record.resolve, record.reject).then(() => {
      finished = true;
      this.dequeue();
    });
    setTimeout(async () => {
      if (finished === false) {
        this.dequeue();

        // TODO remove this for stable release version
        /* eslint-disable-next-line max-len */
        throw new Error(`Record took over 30s to finish: ${record.task.toString()}`);
      }
    }, 3e4);
  }

  sync(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        reject,
        resolve,
        task
      });

      if (this.busy === false)
        this.dequeue();
    });
  }
};
