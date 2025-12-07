/**
 * Giveaway Command - Support Server Manager
 * Create and manage giveaways for noprefix, premium, etc.
 */

import crypto from "crypto";
import {
  endGiveaway,
  scheduleGiveawayEnd,
  getPrizeInfo,
  parseDuration,
  parsePremiumDuration,
} from "../lib/utils/giveawayUtils.js";

export default {
  name: "giveaway",
  aliases: ["gw", "gcreate"],
  description: "Create and manage giveaways",
  ownerOnly: true,
  supportOnly: true,
  cooldown: 5,

  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase();

    if (
      !subcommand ||
      !["create", "end", "reroll", "list", "delete", "info"].includes(
        subcommand,
      )
    ) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.info)
            .setAuthor({
              name: "Giveaway System",
              iconURL: client.user.displayAvatarURL(),
            })
            .setDescription(
              `**Commands:**\n` +
                `\`${client.prefix}giveaway create <duration> <prize> <winners> [channel] [premium_duration]\`\n` +
                `\`${client.prefix}giveaway end <id>\` - End a giveaway early\n` +
                `\`${client.prefix}giveaway reroll <id>\` - Pick new winners\n` +
                `\`${client.prefix}giveaway list\` - View active giveaways\n` +
                `\`${client.prefix}giveaway info <id>\` - View giveaway details\n` +
                `\`${client.prefix}giveaway delete <id>\` - Delete a giveaway\n\n` +
                `**Prize Types:**\n` +
                `\`noprefix\` - No Prefix Access\n` +
                `\`premium\` - Premium (default 30 days, or specify: 1d/1w/1m/1y/perm)\n\n` +
                `**Time formats:** \`10m\`=10 min, \`1h\`=1 hour, \`1d\`=1 day, \`1w\`=1 week\n\n` +
                `**Example:**\n` +
                `\`${client.prefix}giveaway create 1h premium 1 #giveaways 1w\``,
            )
            .setFooter({ text: "NeroX Support Manager" })
            .setTimestamp(),
        ],
      });
    }

    try {
      switch (subcommand) {
        case "create":
          await createGiveaway(client, message, args.slice(1));
          break;
        case "end":
          await endGiveawayCommand(client, message, args[1]);
          break;
        case "reroll":
          await rerollGiveaway(client, message, args[1]);
          break;
        case "list":
          await listGiveaways(client, message);
          break;
        case "info":
          await giveawayInfo(client, message, args[1]);
          break;
        case "delete":
          await deleteGiveaway(client, message, args[1]);
          break;
      }
    } catch (error) {
      console.error("[Giveaway] Error:", error);
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setDescription(`An error occurred: ${error.message}`),
        ],
      });
    }
  },
};

// ==================== CREATE GIVEAWAY ====================
async function createGiveaway(client, message, args) {
  if (args.length < 3) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription(
            `Missing arguments.\n\n` +
              `**Usage:** \`${client.prefix}giveaway create <duration> <prize> <winners> [channel] [premium_duration]\`\n\n` +
              `**Example:** \`${client.prefix}giveaway create 1h premium 1 #giveaways 1m\``,
          ),
      ],
    });
  }

  const durationStr = args[0];
  const prize = args[1].toLowerCase();
  const winnersCount = parseInt(args[2]);
  const channel = message.mentions.channels.first() || message.channel;
  let premiumDurStr;
  if (prize === "premium") {
    if (args[4]) {
      premiumDurStr = args[4].toLowerCase();
    } else if (!message.mentions.channels.first() && args[3]) {
      premiumDurStr = args[3].toLowerCase();
    }
  }

  // Validate duration
  const duration = parseDuration(durationStr);
  if (!duration || duration < 60000) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(
            `Invalid duration. Minimum is 1 minute.\n\nUse: \`10m\`, \`1h\`, \`1d\`, \`1w\``,
          ),
      ],
    });
  }

  // Validate prize
  if (!["noprefix", "premium"].includes(prize)) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(
            `Invalid prize type.\n\nValid types: \`noprefix\`, \`premium\``,
          ),
      ],
    });
  }

  // Validate winners count
  if (isNaN(winnersCount) || winnersCount < 1 || winnersCount > 10) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(`Winners must be between 1 and 10.`),
      ],
    });
  }

  // Premium duration string - default 30d
  let premiumDurInfo = {
    durationMs: 30 * 86400000,
    text: "30 days",
    raw: "30d",
  };
  if (prize === "premium" && premiumDurStr) {
    premiumDurInfo = parsePremiumDuration(premiumDurStr);
    if (!premiumDurInfo) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setDescription(
              "Invalid premium duration. Valid: `1d`, `1w`, `1m`, `1y`, `perm`",
            ),
        ],
      });
    }
  }

  const giveawayId = crypto.randomBytes(4).toString("hex").toUpperCase();
  const endsAt = Date.now() + duration;
  const prizeInfo = getPrizeInfo(prize, premiumDurInfo);

  // Create giveaway embed
  const embed = client
    .embed(client.colors.primary)
    .setAuthor({
      name: "GIVEAWAY",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      `React with 🎉 to enter.\n\n` +
        `**Prize:** ${prizeInfo.name}\n` +
        `**Winners:** ${winnersCount}\n` +
        `**Premium Duration:** ${prize === "premium" ? premiumDurInfo.text : "N/A"}\n` +
        `**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n` +
        `**Host:** ${message.author}`,
    )
    .setFooter({ text: `ID: ${giveawayId}` })
    .setTimestamp(endsAt);

  // Send the giveaway message
  let giveawayMsg;
  try {
    giveawayMsg = await channel.send({ embeds: [embed] });
    await giveawayMsg.react("🎉");
  } catch (err) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(
            `Failed to send giveaway message. Check channel permissions.`,
          ),
      ],
    });
  }

  // Save to database
  await client.db.giveaways.set(giveawayId, {
    id: giveawayId,
    messageId: giveawayMsg.id,
    channelId: channel.id,
    guildId: message.guild.id,
    hostId: message.author.id,
    prize: prize,
    winners: winnersCount,
    premiumDurationMs: prize === "premium" ? premiumDurInfo.durationMs : null,
    premiumDurationText: prize === "premium" ? premiumDurInfo.text : null,
    endsAt: endsAt,
    ended: false,
    winnersIds: [],
    participants: [],
    createdAt: Date.now(),
  });

  // Schedule end
  scheduleGiveawayEnd(client, giveawayId, duration);

  await message.reply({
    embeds: [
      client
        .embed(client.colors.success)
        .setDescription(
          `Giveaway created!\n` +
            `**ID:** \`${giveawayId}\`\n` +
            `**Channel:** ${channel}\n` +
            `**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n` +
            (prize === "premium"
              ? `**Premium Duration:** ${premiumDurInfo.text}`
              : ""),
        ),
    ],
  });
}

// ==================== END / REROLL / INFO / LIST / DELETE ====================
async function endGiveawayCommand(client, message, giveawayId) {
  if (!giveawayId)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("Please provide a giveaway ID."),
      ],
    });
  const giveaway = await client.db.giveaways.get(giveawayId.toUpperCase());
  if (!giveaway)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(`Giveaway \`${giveawayId}\` not found.`),
      ],
    });
  if (giveaway.ended)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("This giveaway has already ended."),
      ],
    });
  await endGiveaway(client, giveawayId.toUpperCase());
  await message.reply({
    embeds: [
      client
        .embed(client.colors.success)
        .setDescription(`Giveaway \`${giveawayId}\` has been ended.`),
    ],
  });
}

async function rerollGiveaway(client, message, giveawayId) {
  if (!giveawayId)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("Please provide a giveaway ID."),
      ],
    });
  const giveaway = await client.db.giveaways.get(giveawayId.toUpperCase());
  if (!giveaway)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(`Giveaway \`${giveawayId}\` not found.`),
      ],
    });
  if (!giveaway.ended)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("This giveaway hasn't ended yet."),
      ],
    });
  const eligible = giveaway.participants.filter(
    (id) => !giveaway.winnersIds.includes(id),
  );
  if (eligible.length === 0)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("No eligible participants for reroll."),
      ],
    });
  const newWinner = eligible[Math.floor(Math.random() * eligible.length)];
  const prizeInfo = getPrizeInfo(giveaway.prize, {
    durationMs: giveaway.premiumDurationMs,
    text: giveaway.premiumDurationText,
  });
  try {
    if (giveaway.prize === "noprefix")
      await client.db.noPrefix.set(newWinner, true);
    else if (giveaway.prize === "premium") {
      let setObj;
      if (
        giveaway.premiumDurationMs === null ||
        giveaway.premiumDurationMs === undefined
      )
        setObj = {
          expiresAt: Date.now() + 30 * 86400000,
          redeemedAt: Date.now(),
          addedBy: "Giveaway Reroll",
        };
      else if (giveaway.premiumDurationMs === 0)
        setObj = {
          expiresAt: null,
          redeemedAt: Date.now(),
          addedBy: "Giveaway Reroll",
          permanent: true,
        };
      else
        setObj = {
          expiresAt: Date.now() + giveaway.premiumDurationMs,
          redeemedAt: Date.now(),
          addedBy: "Giveaway Reroll",
        };
      await client.db.botstaff.set(newWinner, setObj);
    }
  } catch (err) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("Failed to apply prize."),
      ],
    });
  }
  await client.db.giveaways.set(giveawayId.toUpperCase(), {
    ...giveaway,
    winnersIds: [...giveaway.winnersIds, newWinner],
  });
  const channel = await client.channels
    .fetch(giveaway.channelId)
    .catch(() => null);
  if (channel)
    await channel.send({
      content: `**Reroll Winner!** <@${newWinner}> - You won ${prizeInfo.name}.`,
    });
  await message.reply({
    embeds: [
      client
        .embed(client.colors.success)
        .setDescription(`Rerolled. New winner: <@${newWinner}>`),
    ],
  });
}

async function listGiveaways(client, message) {
  const keys = await client.db.giveaways.keys;
  const activeGiveaways = [];
  for (const key of keys) {
    const gw = await client.db.giveaways.get(key);
    if (gw && !gw.ended) activeGiveaways.push(gw);
  }
  if (activeGiveaways.length === 0)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.info)
          .setDescription(
            "No active giveaways.\n\nCreate one with `" +
              client.prefix +
              "giveaway create`",
          ),
      ],
    });
  const embed = client
    .embed(client.colors.primary)
    .setAuthor({
      name: "Active Giveaways",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      activeGiveaways
        .map((gw) => {
          const prizeInfo = getPrizeInfo(gw.prize, {
            durationMs: gw.premiumDurationMs,
            text: gw.premiumDurationText,
          });
          return `**${gw.id}**\nPrize: ${prizeInfo.name}\nWinners: ${gw.winners} • Ends: <t:${Math.floor(gw.endsAt / 1000)}:R>`;
        })
        .join("\n\n"),
    )
    .setFooter({ text: `${activeGiveaways.length} active giveaway(s)` })
    .setTimestamp();
  await message.reply({ embeds: [embed] });
}

async function giveawayInfo(client, message, giveawayId) {
  if (!giveawayId)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("Please provide a giveaway ID."),
      ],
    });
  const giveaway = await client.db.giveaways.get(giveawayId.toUpperCase());
  if (!giveaway)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(`Giveaway \`${giveawayId}\` not found.`),
      ],
    });
  const prizeInfo = getPrizeInfo(giveaway.prize, {
    durationMs: giveaway.premiumDurationMs,
    text: giveaway.premiumDurationText,
  });
  const host = await client.users.fetch(giveaway.hostId).catch(() => null);
  const embed = client
    .embed(client.colors.info)
    .setAuthor({
      name: `Giveaway Info: ${giveaway.id}`,
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      `**Prize:** ${prizeInfo.name}\n` +
        (giveaway.prize === "premium"
          ? `**Premium Duration:** ${giveaway.premiumDurationText || "30 days"}\n`
          : "") +
        `**Winners:** ${giveaway.winners}\n` +
        `**Host:** ${host?.tag || giveaway.hostId}\n` +
        `**Status:** ${giveaway.ended ? "Ended" : "Active"}\n` +
        `**${giveaway.ended ? "Ended" : "Ends"}:** <t:${Math.floor((giveaway.endedAt || giveaway.endsAt) / 1000)}:R>\n` +
        `**Participants:** ${giveaway.participants?.length || "Counting..."}\n` +
        (giveaway.ended && giveaway.winnersIds?.length > 0
          ? `**Winners:** ${giveaway.winnersIds.map((id) => `<@${id}>`).join(", ")}\n`
          : "") +
        `\n**Channel:** <#${giveaway.channelId}>\n**Message ID:** \`${giveaway.messageId}\``,
    )
    .setFooter({ text: "NeroX Support Manager" })
    .setTimestamp();
  await message.reply({ embeds: [embed] });
}

async function deleteGiveaway(client, message, giveawayId) {
  if (!giveawayId)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription("Please provide a giveaway ID."),
      ],
    });
  const giveaway = await client.db.giveaways.get(giveawayId.toUpperCase());
  if (!giveaway)
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(`Giveaway \`${giveawayId}\` not found.`),
      ],
    });
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const giveawayMsg = await channel.messages.fetch(giveaway.messageId);
    await giveawayMsg.delete();
  } catch (err) {}
  await client.db.giveaways.delete(giveawayId.toUpperCase());
  await message.reply({
    embeds: [
      client
        .embed(client.colors.success)
        .setDescription(`Giveaway \`${giveawayId}\` has been deleted.`),
    ],
  });
}
