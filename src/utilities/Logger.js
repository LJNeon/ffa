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
      logsDirectory,
      streamTimeout
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
    this.date = new Date();
    this.logsPath = path.join(__dirname, `../../${logsDirectory}`);
    this.toWrite = "";

    if (fs.existsSync(this.logsPath) === false)
      fs.mkdirSync(this.logsPath);

    this.initStream();
  }

  async debug(...msgs) {
    await this.log("DEBUG", ...msgs);
  }

  async error(...errs) {
    await this.log("ERROR", ...errs);
  }

  async info(...msgs) {
    await this.log("INFO", ...msgs);
  }

  initStream() {
    this.stream = fs.createWriteStream(
      `${this.logsPath}/${time.formatDate(this.date)}`,
      {flags: "a"}
    );
    this.stream.on("error", e => {
      console.error(e);
      process.exit(1);
    });
    this.stream.on("drain", () => {
      this.stream.write(this.toWrite);
      this.toWrite = "";
    });
  }

  async log(level, ...msgs) {
    const date = new Date();

    await this.validateStream(date);

    const timestamp = time.formatTime(date);
    const formatted = `${timestamp} [${level}] ${msgs
      .map(i => util.inspect(i, {depth: 3}))
      .join(" ")}\n`;

    console[level.toLowerCase()](str.format(
      responses.console,
      timestamp,
      logColors[level],
      level
    ), ...msgs);
    this.write(formatted);

    if (level === "ERROR") {
      await appendFile(
        `${this.logsPath}/${time.formatDate(this.date)}-Errors`,
        formatted
      );
    }
  }

  async warn(...msgs) {
    await this.log("WARN", ...msgs);
  }

  write(input) {
    const res = this.stream.write(input);

    if (res === false)
      this.toWrite += input;
  }

  streamWritable() {
    return new Promise(res => {
      let done = false;

      this.stream.on("open", () => {
        done = true;
        res();
      });

      if (this.stream.writable === true) {
        done = true;
        res();
      }

      setTimeout(() => {
        if (done === false) {
          console.error("Logger stream took over 10s.");
          process.exit(1);
        }
      }, streamTimeout);
    });
  }

  async validateStream(date) {
    if (this.date.getUTCDate() !== date.getUTCDate()) {
      this.date = date;
      this.initStream();
      await this.streamWritable();
    } else if (this.stream.writable === false) {
      await this.streamWritable();
    }
  }
}();
