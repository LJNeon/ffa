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
const path = require("path");
const yaml = require("js-yaml");
const {argv} = require("yargs").options({
  auth: {
    alias: "a",
    desc: "Authentication file using the yaml format.",
    example: "./ffaAuth.yml",
    type: "string"
  },
  config: {
    alias: "c",
    desc: "Configuration file using the yaml format.",
    example: "./ffa.yml",
    type: "string"
  },
  license: {
    alias: "l",
    desc: "Show the license.",
    type: "boolean"
  }
}).epilogue("For more information see: https://github.com/LJNeon/ffa")
  .help("help", "Show this help message.")
  .alias("help", "h")
  .version()
  .describe("version", "Show the version number.")
  .alias("version", "v");
const {data: {responses}} = require("./data.js");
const homedir = require("os").homedir();
const util = require("util");
const str = require("../utilities/string.js");
const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

async function parse(arg, filepath, files, file) {
  if (arg == null && files.includes(file) === true)
    return yaml.safeLoad(await readFile(filepath, "utf8"));

  return arg;
}

module.exports = {
  async checkLicense() {
    if (argv.license === true) {
      console.clear();
      console.log(await readFile(
        path.join(__dirname, "../../LICENSE"),
        "utf8"
      ));
      process.exit(0);
    }
  },

  async fetch() {
    if (this.auth == null || this.config == null) {
      if (argv.auth != null) {
        this.authPath = path.join(__dirname, `../${argv.auth}`);
        this.auth = yaml.safeLoad(fs.readFileSync(
          this.authPath,
          "utf8"
        ));
      }

      if (argv.config != null) {
        this.configPath = path.join(__dirname, `../${argv.config}`);
        this.config = yaml.safeLoad(fs.readFileSync(
          this.configPath,
          "utf8"
        ));
      }

      await this.searchIfNeeded(path.join(__dirname, "../../"));
      await this.searchIfNeeded(homedir);

      if (this.auth == null || this.config == null) {
        console.error(str.format(
          responses.cantLocate,
          `ffa${this.auth === true ? "Auth" : ""}.yml`,
          `--${this.auth === true ? "auth" : "config"}`
        ));
        process.exit(1);
      }
    }
  },

  async searchIfNeeded(dir) {
    if (this.auth == null || this.config == null) {
      const files = await readDir(dir);
      const authPath = path.join(dir, "ffaAuth.yml");
      const auth = await parse(this.auth, authPath, files, "ffaAuth.yml");
      const configPath = path.join(dir, "ffa.yml");
      const config = await parse(this.config, configPath, files, "ffa.yml");

      if (auth != null) {
        this.auth = auth;

        if (this.authPath == null)
          this.authPath = authPath;
      }

      if (config != null) {
        this.config = config;

        if (this.configPath == null)
          this.configPath = configPath;
      }
    }
  }
};
