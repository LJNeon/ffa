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
const db = require("./database.js");
const Logger = require("../utilities/Logger.js");
const mime = require("mime");
const pako = require("pako");
const Polka = require("polka")();
const ratelimits = require("../middleware/ratelimits.js");
const {
  data: {
    constants: {httpStatusCodes},
    regexes
  }
} = require("./data.js");

async function getAttachment(req, res) {
  if (regexes.onlyId.test(req.params.id) === false) {
    res.writeHead(httpStatusCodes.badReq, {"Content-Type": "text/plain"});

    return res.end(`Invalid attachment. (ID: ${req.params.id})`);
  }

  let attachment;

  try {
    attachment = await db.getFirstRow(
      "SELECT file, name FROM attachments WHERE id = $1",
      [req.params.id]
    );
  } catch (e) {
    Logger.error(e);
    res.writeHead(httpStatusCodes.internalErr, {"Content-Type": "text/plain"});

    return res.end("Error occurred while accessing database.");
  }

  if (attachment == null) {
    res.writeHead(httpStatusCodes.notFound, {"Content-Type": "text/plain"});

    return res.end(`Attachment not found. (ID: ${req.params.id})`);
  }

  return attachment;
}

Polka.use("/api", ratelimits);
Polka.get("/api/attachments/:id", async (req, res) => {
  const attachment = await getAttachment(req, res);

  if (Buffer.isBuffer(attachment) === false)
    return attachment;

  const type = mime.getType(attachment.name);

  if (type === false) {
    Logger.error("Unknown mime type:", attachment.name);
    res.writeHead(httpStatusCodes.internalErr, {"Content-Type": "text/plain"});

    return res.end("Error occurred while determining file's mime type.");
  }

  try {
    attachment.file = Buffer.from(pako.inflate(attachment.file));
  } catch (e) {
    Logger.error("Inflation error", e);
    res.writeHead(httpStatusCodes.internalErr, {"Content-Type": "text/plain"});

    return res.end("Error occurred while decompressing file.");
  }

  res.writeHead(httpStatusCodes.ok, {"Content-Type": type});
  res.end(attachment.file);
});
/**
 * TODO pretty sure process.env.PORT is a c9 thing,
 * should replace with auth option?
 */
Polka.listen(process.env.PORT).then(() => Logger.info("POLKA_READY"));
