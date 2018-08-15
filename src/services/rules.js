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
const client = require("../services/client.js");
const {
  data: {
    constants,
    queries,
    responses
  }
} = require("../services/data.js");
const db = require("../services/database.js");
const LimitedMutex = require("../utilities/LimitedMutex.js");
const message = require("../utilities/message.js");
const random = require("../utilities/random.js");
const str = require("../utilities/string.js");
const time = require("../utilities/time.js");

module.exports = {
  countLetters(letters) {
    let result = -1;

    for (let i = 0; i < letters.length; i++) {
      result += (constants.alphabet.indexOf(letters.charAt(i)) + 1)
        * Math.pow(constants.alphabet.length, letters.length - i - 1);
    }

    return result;
  },

  async getCategories(guildId) {
    const res = await db.pool.query(
      queries.selectRules,
      [guildId]
    );

    return res.rows.reduce((a, b) => {
      const rules = a;
      let index = rules.findIndex(c => c[0].category === b.category);

      if (index === -1) {
        index = rules.length;
        rules[index] = [];
      }

      rules[index].push(b);

      return rules;
    }, []);
  },

  letterCount(count) {
    if (count < constants.alphabet.length)
      return constants.alphabet[count];

    let dividend = count - 1;
    let result = "";

    while (dividend > 0) {
      const modulo = (dividend - 1) % constants.alphabet.length;

      result = constants.alphabet[modulo] + result;
      dividend = Math.floor((dividend - modulo) / constants.alphabet.length);
    }

    return result;
  },

  listRules(rules) {
    return rules.map((r, i) => {
      if (r.mute_length == null)
        return `**${this.letterCount(i)}.** ${r.content} (Bannable)`;

      return str.format(
        responses.rule,
        this.letterCount(i),
        r.content,
        time.format(r.mute_length)
      );
    }).join("\n");
  },

  mutex: new LimitedMutex(),

  update(guildId) {
    this.mutex.sync(guildId, async () => {
      const {channels: {rules_id}} = await db.getGuild(
        guildId,
        {channels: "rules_id"}
      );

      if (rules_id == null)
        return;

      const channel = client.getChannel(rules_id);

      if (channel == null)
        return;

      const msgs = await channel.getMessages(constants.maxMessages);
      const remove = [];

      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].author.id === client.user.id)
          remove.push(msgs[i].id);
      }

      const oldestAllowedSnowflake = message.getOldest();

      if (remove.some(i => i < oldestAllowedSnowflake)) {
        for (let i = 0; i < remove.length; i++)
          await channel.deleteMessage(remove[i]);
      } else {
        await channel.deleteMessages(remove);
      }

      const categories = await this.getCategories(guildId);
      const colors = [...message.colors];

      for (let i = 0; i < categories.length; i++) {
        const color = random.element(colors);

        colors.splice(colors.indexOf(color), 1);
        await message.create(channel, {
          description: this.listRules(categories[i]),
          title: `${i + 1}. ${str.capitalize(categories[i][0].category)}:`
        }, color);
      }
    });
  }
};
