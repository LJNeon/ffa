"use strict";
const client = require("../services/client.js");
const {config} = require("../services/cli.js");
const db = require("../services/database.js");
const message = require("../utilities/message.js");
const {
  data: {
    constants: {
      discordErrorCodes,
      maxMessages
    },
    queries,
    descriptions
  }
} = require("../services/data.js");
const str = require("../utilities/string.js");
const msgs = new Map();

function getEmbed(reqs, text, title) {
  return message.embedify({
    description: reqs.length === 0 ? "None" : reqs.map(r => str.format(
      descriptions.banReq,
      r.log_id,
      message.tag(r.user),
      str.max(str.eraseFormat(r.data.rule), config.max.caseRule),
      r.status
    )).slice(0, config.max.cases).join("\n\n"),
    footer: {text},
    title
  });
}

async function getActive(text) {
  const {rows: reqs} = await db.pool.query(queries.activeBanReqs);

  for (let i = 0; i < reqs.length; i++) {
    const {rows} = await db.pool.query(
      queries.selectBanVotes,
      [reqs[i].log_id]
    );

    if (rows.some(r => r.for === false) === true) {
      reqs.splice(i, 1);
      i--;
      continue;
    } else {
      reqs[i].status = `${rows.length} - 0`;
    }

    reqs[i].user = await message.getUser(reqs[i].data.offender);
    reqs[i].requester = await message.getUser(reqs[i].data.requester);
  }

  return getEmbed(reqs, text, "Active Cases");
}

async function getRecent(text) {
  const {rows: reqs} = await db.pool.query(queries.recentBanReqs);

  for (let i = 0; i < reqs.length; i++) {
    if (reqs[i].data.reached_court === false) {
      reqs.splice(i, 1);
      i--;
      continue;
    }

    const {rows} = await db.pool.query(
      queries.selectBanVotes,
      [reqs[i].log_id]
    );
    let no = 0;
    let yes = 0;

    for (let j = 0; j < rows.length; j++) {
      if (rows[j].data.for === true)
        yes++;
      else
        no++;
    }

    reqs[i].status = `${yes} - ${no}`;
    reqs[i].user = await message.getUser(reqs[i].data.offender);
    reqs[i].requester = await message.getUser(reqs[i].data.requester);
  }

  return getEmbed(reqs, text, "Recent Cases");
}

async function setup(channel, active, recent) {
  const channelMsgs = await channel.getMessages(maxMessages);
  const remove = [];
  const res = [];

  for (let i = 0; i < channelMsgs.length; i++) {
    if (channelMsgs[i].author.id === client.user.id)
      remove.push(channelMsgs[i].id);
  }

  const oldestAllowedSnowflake = message.getOldest();

  if (remove.some(i => i < oldestAllowedSnowflake)) {
    for (let i = 0; i < remove.length; i++)
      await channel.deleteMessage(remove[i]);
  } else {
    await channel.deleteMessages(remove);
  }

  res.push(await channel.createMessage(active));
  res.push(await channel.createMessage(recent));

  return res;
}

async function update(channel) {
  const text = str.format(descriptions.casesFooter, config.bot.prefix);
  const active = await getActive(text);
  const recent = await getRecent(text);
  const msg = msgs.get(channel.guild.id);

  if (msg == null) {
    msgs.set(channel.guild.id, await setup(channel, active, recent));
  } else {
    try {
      await msg[0].edit(active);
      await msg[1].edit(recent);
    } catch (e) {
      if (e.code === discordErrorCodes.unknownMessage)
        msgs.set(channel.guild.id, await setup(channel, active, recent));
      else
        throw e;
    }
  }
}

module.exports = async guild => {
  const {channels: {cases_id}} = await db.getGuild(
    guild.id,
    {channels: "cases_id"}
  );

  if (cases_id == null)
    return;

  const channel = client.getChannel(cases_id);

  if (channel == null
      || channel.permissionsOf(client.user.id).has("sendMessages") === false)
    return;

  await update(channel);
};
