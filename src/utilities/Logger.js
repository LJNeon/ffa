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
const {
  data: {
    constants: {
      logColors,
      logsDirectory
    },
    responses
  }
} = require("../services/data.js");
const path = require("path");
const str = require("./string.js");
const time = require("./time.js");
const util = require("util");
const appendFile = util.promisify(fs.appendFile);

module.exports = new class Logger {
  constructor() {
    const date = new Date();

    this.day = date.getUTCDate();
    this.dateStr = time.formatDate(date);
    this.logsPath = path.join(__dirname, `../../${logsDirectory}`);

    if (fs.existsSync(this.logsPath) === false)
      fs.mkdirSync(this.logsPath);

    this.stream = fs.createWriteStream(
      `${this.logsPath}/${this.dateStr}`,
      {flags: "a"}
    );
  }

  async log(level, msg) {
    const date = new Date();

    if (date.getUTCDate() !== this.day) {
      /**
       * TODO some error about getUTCDate is popping up when bot is running
       *  for long periods of time.
       */
      this.day = date.getUTCDate();
      this.dateStr = time.formatDate(this.date);
      this.stream = fs.createWriteStream(
        `${this.logsPath}/${this.dateStr}`,
        {flags: "a"}
      );
    }

    if (this.stream.writable === false)
      await this.waitTillWritable();

    console[level.toLowerCase()](str.format(
      responses.console,
      this.dateStr,
      logColors[level],
      level
    ), msg);

    const formattedMsg = `${this.dateStr} [${level}] ${msg}\n`;

    this.stream.write(formattedMsg);

    if (level === "ERROR")
      await appendFile(`${this.logsPath}/${this.dateStr}-Errors`, formattedMsg);
  }

  debug(msg) {
    this.log("DEBUG", msg);
  }

  info(msg) {
    this.log("INFO", msg);
  }

  warn(msg) {
    this.log("WARN", msg);
  }

  error(err) {
    this.log("ERROR", err instanceof Error ? util.inspect(
      err,
      {depth: null}
    ) : err);
  }

  waitTillWritable() {
    return new Promise(res => {
      this.stream.on("open", () => res());
    });
  }
}();
