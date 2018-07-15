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
process.env.TZ = "utc";

const data = require("./services/data.js");
let Logger;
const reqAbs = require("./utilities/reqAbs.js");

(async () => {
  await data.fetch();
  console.log(data.data.responses.licenseNotice);

  const cli = require("./services/cli.js");

  Logger = require("./utilities/Logger.js");
  await cli.checkLicense();
  await cli.fetch();

  const db = require("./services/database.js");

  await db.setup();
  await db.update();

  const client = require("./services/client.js");
  const registry = require("./services/registry.js");

  registry
    .registerArgumentPreconditions(await reqAbs(
      __dirname,
      "./preconditions/argument"
    ))
    .registerPostconditions(await reqAbs(__dirname, "./postconditions"))
    .registerPreconditions(await reqAbs(__dirname, "./preconditions/command"))
    .registerTypeReaders(await reqAbs(__dirname, "./readers"))
    .registerGroups(await reqAbs(__dirname, "./groups"))
    .registerCommands(await reqAbs(__dirname, "./commands"));
  await reqAbs(__dirname, "./events");
  await client.connect();
})().catch(e => {
  if (Logger == null)
    console.error(e);
  else
    Logger.error(e);

  process.exit(1);
});
