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
const fs = require("fs");
const util = require("util");
const lStat = util.promisify(fs.lstat);
const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

module.exports = {
  async readAll(path, options) {
    const res = {};
    const files = await readDir(path);

    for (let i = 0; i < files.length; i++) {
      const filepath = `${path}/${files[i]}`;

      if ((await lStat(filepath)).isDirectory()
          && files[i].startsWith(".") === false) {
        res[files[i]] = await module.exports.readAll(filepath, options);
      } else {
        res[files[i]] = await readFile(
          filepath,
          options
        );
      }
    }

    return res;
  },

  async tryRead(path, ...args) {
    let file;

    try {
      file = await readFile(path, ...args);
    } catch (e) {
      if (e.code === "ENOENT")
        file = null;
      else
        throw e;
    }

    return file;
  }
};
