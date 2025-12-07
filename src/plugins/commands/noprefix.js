/**
 * NoPrefix Command - Support Server Manager
 * Manage no-prefix access for users (Duration-based with expiry)
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "noprefix",
  aliases: ["nop", "np"],
  description: "Manage no-prefix users (duration-based)",
  ownerOnly: true,
  cooldown: 3,

  async execute(client, message, args) {
    const action = args[0]?.toLowerCase();

    if (
      !action ||
      !["add", "remove", "list", "check", "extend"].includes(action)
    ) {
      const embed = client
        .embed(client.colors.info)
        .setAuthor({
          name: "⚡ No Prefix Management",
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `Manage no-prefix access for users with duration support.\n\n` +
            `**Commands:**\n` +
            `\`${client.prefix}noprefix add <user> <duration>\` - Grant no-prefix\n` +
            `\`${client.prefix}noprefix extend <user> <duration>\` - Extend duration\n` +
            `\`${client.prefix}noprefix remove <user>\` - Remove no-prefix\n` +
            `\`${client.prefix}noprefix check <user>\` - Check status\n` +
            `\`${client.prefix}noprefix list\` - View all users\n\n` +
            `**Duration formats:**\n` +
            `\`1d\` = 1 day, \`1w\` = 1 week, \`1m\` = 1 month\n` +
            `\`1y\` = 1 year, \`perm\` = Permanent`,
        )
        .setFooter({ text: "NeroX Support Manager" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("np_list")
          .setLabel("View All Users")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📋"),
        new ButtonBuilder()
          .setCustomId("np_expired")
          .setLabel("Check Expired")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⏰"),
      );

      const reply = await message.reply({ embeds: [embed], components: [row] });

      const collector = reply.createMessageComponentCollector({ time: 60000 });
      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: "This is not for you!", ephemeral: true });
        }
        if (i.customId === "np_list") {
          await i.deferUpdate();
          await listNoPrefix(client, message, reply);
        } else if (i.customId === "np_expired") {
          await i.deferUpdate();
          await checkExpiredNoPrefix(client, message, reply);
        }
      });
      collector.on("end", () => {
        reply.edit({ components: [] }).catch(() => {});
      });
      return;
    }

    switch (action) {
      case "add":
        await addNoPrefix(client, message, args.slice(1));
        break;
      case "extend":
        await extendNoPrefix(client, message, args.slice(1));
        break;
      case "remove":
        await removeNoPrefix(client, message, args.slice(1));
        break;
      case "check":
        await checkNoPrefix(client, message, args.slice(1));
        break;
      case "list":
        await listNoPrefix(client, message);
        break;
    }
  },
};

function parseDuration(str) {
  if (!str) return null;
  str = str.toLowerCase();
  if (str === "perm" || str === "permanent")
    return { ms: 0, text: "Permanent", permanent: true };

  const match = str.match(/^(\d+)(d|w|m|y)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    d: 86400000, // 1 day
    w: 604800000, // 1 week
    m: 2592000000, // 30 days
    y: 31536000000, // 365 days
  };

  const unitNames = {
    d: "day",
    w: "week",
    m: "month",
    y: "year",
  };

  return {
    ms: value * multipliers[unit],
    text: `${value} ${unitNames[unit]}${value > 1 ? "s" : ""}`,
    permanent: false,
  };
}

async function addNoPrefix(client, message, args) {
  const target =
    message.mentions.users.first() ||
    (await client.users.fetch(args[0]).catch(() => null));

  if (!target) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("⚠️ Please mention a user or provide a valid ID."),
      ],
    });
  }

  const durationStr = args[1] || "30d";
  const duration = parseDuration(durationStr);

  if (!duration) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(
            "⚠️ Invalid duration format.\n\nValid: `1d`, `1w`, `1m`, `1y`, `perm`",
          ),
      ],
    });
  }

  const existing = await client.db.noPrefix.get(target.id);
  if (existing && typeof existing === "object" && existing.expiresAt) {
    if (
      existing.permanent ||
      (existing.expiresAt && existing.expiresAt > Date.now())
    ) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.warning)
            .setDescription(
              `⚠️ **${target.tag}** already has no-prefix!\n\n` +
                `${existing.permanent ? "**Status:** Permanent" : `**Expires:** <t:${Math.floor(existing.expiresAt / 1000)}:R>`}\n\n` +
                `Use \`${client.prefix}noprefix extend\` to extend their duration.`,
            ),
        ],
      });
    }
  }

  const noPrefixData = {
    grantedAt: Date.now(),
    grantedBy: message.author.id,
    permanent: duration.permanent,
    expiresAt: duration.permanent ? null : Date.now() + duration.ms,
    durationText: duration.text,
  };

  await client.db.noPrefix.set(target.id, noPrefixData);

  const embed = client
    .embed(client.colors.success)
    .setAuthor({
      name: "⚡ No Prefix Granted",
      iconURL: client.user.displayAvatarURL(),
    })
    .setThumbnail(target.displayAvatarURL())
    .setDescription(
      `**${target.tag}** has been granted No Prefix access!\n\n` +
        `**Duration:** ${duration.text}\n` +
        `${duration.permanent ? "**Expires:** Never" : `**Expires:** <t:${Math.floor(noPrefixData.expiresAt / 1000)}:R>`}\n\n` +
        `They can now use commands without typing the prefix! ⚡`,
    )
    .setFooter({
      text: `Granted by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`np_check_${target.id}`)
      .setLabel("View Status")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋"),
  );

  await message.reply({ embeds: [embed], components: [row] });

  // Try to DM the user
  try {
    await target.send({
      embeds: [
        client
          .embed(client.colors.success)
          .setAuthor({
            name: "⚡ You got No Prefix!",
            iconURL: client.user.displayAvatarURL(),
          })
          .setDescription(
            `You've been granted **No Prefix** access on **NeroX**!\n\n` +
              `**Duration:** ${duration.text}\n` +
              `${duration.permanent ? "**Expires:** Never" : `**Expires:** <t:${Math.floor(noPrefixData.expiresAt / 1000)}:R>`}\n\n` +
              `You can now use commands without typing the prefix! ✨`,
          )
          .setFooter({ text: "NeroX Studios" }),
      ],
    });
  } catch (error) {
    // User has DMs disabled
  }
}

async function extendNoPrefix(client, message, args) {
  const target =
    message.mentions.users.first() ||
    (await client.users.fetch(args[0]).catch(() => null));

  if (!target) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("⚠️ Please mention a user or provide a valid ID."),
      ],
    });
  }

  const existing = await client.db.noPrefix.get(target.id);
  if (
    !existing ||
    (typeof existing === "object" &&
      existing.expiresAt &&
      existing.expiresAt < Date.now() &&
      !existing.permanent)
  ) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription(
            `⚠️ **${target.tag}** doesn't have active no-prefix. Use \`add\` instead.`,
          ),
      ],
    });
  }

  if (existing.permanent) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.info)
          .setDescription(
            `ℹ️ **${target.tag}** already has permanent no-prefix!`,
          ),
      ],
    });
  }

  const durationStr = args[1] || "30d";
  const duration = parseDuration(durationStr);

  if (!duration) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription(
            "⚠️ Invalid duration format.\n\nValid: `1d`, `1w`, `1m`, `1y`, `perm`",
          ),
      ],
    });
  }

  let newExpiresAt;
  if (duration.permanent) {
    newExpiresAt = null;
    existing.permanent = true;
  } else {
    newExpiresAt = (existing.expiresAt || Date.now()) + duration.ms;
    existing.expiresAt = newExpiresAt;
  }
  existing.extendedBy = message.author.id;
  existing.extendedAt = Date.now();

  await client.db.noPrefix.set(target.id, existing);

  const embed = client
    .embed(client.colors.success)
    .setAuthor({
      name: "⚡ No Prefix Extended",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      `Extended **${target.tag}**'s no-prefix by **${duration.text}**!\n\n` +
        `${duration.permanent ? "**New Expiry:** Never (Permanent)" : `**New Expiry:** <t:${Math.floor(newExpiresAt / 1000)}:R>`}`,
    )
    .setFooter({ text: `Extended by ${message.author.tag}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function removeNoPrefix(client, message, args) {
  const target =
    message.mentions.users.first() ||
    (await client.users.fetch(args[0]).catch(() => null));

  if (!target) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("⚠️ Please mention a user or provide a valid ID."),
      ],
    });
  }

  const hasNoPrefix = await client.db.noPrefix.get(target.id);
  if (!hasNoPrefix) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.warning)
          .setDescription(`⚠️ **${target.tag}** doesn't have no-prefix.`),
      ],
    });
  }

  await client.db.noPrefix.delete(target.id);

  await message.reply({
    embeds: [
      client
        .embed(client.colors.success)
        .setDescription(`✅ Removed no-prefix from **${target.tag}**.`),
    ],
  });
}

async function checkNoPrefix(client, message, args) {
  const target =
    message.mentions.users.first() ||
    (await client.users.fetch(args[0]).catch(() => null));

  if (!target) {
    return message.reply({
      embeds: [
        client
          .embed(client.colors.error)
          .setDescription("⚠️ Please mention a user or provide a valid ID."),
      ],
    });
  }

  const data = await client.db.noPrefix.get(target.id);

  let isActive = false;
  let statusText = "";

  if (data) {
    if (data === true) {
      // Legacy format (permanent)
      isActive = true;
      statusText = "**Status:** Active (Permanent - Legacy)\n";
    } else if (typeof data === "object") {
      if (data.permanent) {
        isActive = true;
        statusText = `**Status:** Active ✅\n**Type:** Permanent ♾️\n`;
      } else if (data.expiresAt && data.expiresAt > Date.now()) {
        isActive = true;
        const daysLeft = Math.ceil((data.expiresAt - Date.now()) / 86400000);
        statusText = `**Status:** Active ✅\n**Expires:** <t:${Math.floor(data.expiresAt / 1000)}:R>\n**Days Left:** ${daysLeft}\n`;
      } else {
        statusText = `**Status:** Expired ❌\n**Expired:** <t:${Math.floor(data.expiresAt / 1000)}:R>\n`;
      }
      if (data.grantedBy) {
        const granter = await client.users
          .fetch(data.grantedBy)
          .catch(() => null);
        statusText += `**Granted By:** ${granter?.tag || data.grantedBy}\n`;
      }
    }
  } else {
    statusText = "**Status:** Not Active ❌\n";
  }

  const embed = client
    .embed(isActive ? client.colors.success : client.colors.info)
    .setAuthor({
      name: "⚡ No Prefix Status",
      iconURL: target.displayAvatarURL(),
    })
    .setThumbnail(target.displayAvatarURL())
    .setDescription(
      `**User:** ${target.tag}\n` + `**ID:** \`${target.id}\`\n\n` + statusText,
    )
    .setFooter({ text: "NeroX Support Manager" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function listNoPrefix(client, message, editMsg = null) {
  const keys = await client.db.noPrefix.keys;

  if (keys.length === 0) {
    const embed = client
      .embed(client.colors.info)
      .setDescription("📋 No users have no-prefix access yet.");
    if (editMsg) {
      return editMsg.edit({ embeds: [embed], components: [] });
    }
    return message.reply({ embeds: [embed] });
  }

  const activeUsers = [];
  const expiredUsers = [];
  const permanentUsers = [];

  for (const id of keys) {
    const data = await client.db.noPrefix.get(id);
    const user = await client.users.fetch(id).catch(() => null);
    if (!user) continue;

    if (data === true || (typeof data === "object" && data.permanent)) {
      permanentUsers.push(`⚡ **${user.tag}** - Permanent`);
    } else if (typeof data === "object" && data.expiresAt) {
      if (data.expiresAt > Date.now()) {
        const daysLeft = Math.ceil((data.expiresAt - Date.now()) / 86400000);
        activeUsers.push(`✅ **${user.tag}** - ${daysLeft}d left`);
      } else {
        expiredUsers.push(`❌ **${user.tag}** - Expired`);
      }
    }
  }

  const embed = client
    .embed(client.colors.primary)
    .setAuthor({
      name: "⚡ No Prefix Users",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      (permanentUsers.length > 0
        ? `**♾️ Permanent (${permanentUsers.length})**\n${permanentUsers.join("\n")}\n\n`
        : "") +
        (activeUsers.length > 0
          ? `**🟢 Active (${activeUsers.length})**\n${activeUsers.join("\n")}\n\n`
          : "") +
        (expiredUsers.length > 0
          ? `**🔴 Expired (${expiredUsers.length})**\n${expiredUsers.join("\n")}\n\n`
          : "") +
        `*Total: ${keys.length} user(s)*`,
    )
    .setFooter({ text: "NeroX Support Manager" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("np_cleanup")
      .setLabel("Remove Expired")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️")
      .setDisabled(expiredUsers.length === 0),
  );

  if (editMsg) {
    return editMsg.edit({ embeds: [embed], components: [row] });
  }

  const reply = await message.reply({ embeds: [embed], components: [row] });

  const collector = reply.createMessageComponentCollector({ time: 60000 });
  collector.on("collect", async (i) => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "This is not for you!", ephemeral: true });
    }
    if (i.customId === "np_cleanup") {
      await i.deferUpdate();
      await cleanupExpiredNoPrefix(client, message, reply);
    }
  });
  collector.on("end", () => {
    reply.edit({ components: [] }).catch(() => {});
  });
}

async function checkExpiredNoPrefix(client, message, editMsg = null) {
  const keys = await client.db.noPrefix.keys;
  const expiredUsers = [];

  for (const id of keys) {
    const data = await client.db.noPrefix.get(id);
    if (
      typeof data === "object" &&
      !data.permanent &&
      data.expiresAt &&
      data.expiresAt < Date.now()
    ) {
      const user = await client.users.fetch(id).catch(() => null);
      if (user) {
        expiredUsers.push(`❌ **${user.tag}** (\`${id}\`)`);
      }
    }
  }

  const embed = client
    .embed(
      expiredUsers.length > 0 ? client.colors.warning : client.colors.success,
    )
    .setAuthor({
      name: "⏰ Expired No-Prefix Users",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      expiredUsers.length > 0
        ? `Found **${expiredUsers.length}** expired user(s):\n\n${expiredUsers.join("\n")}`
        : "✅ No expired no-prefix users found!",
    )
    .setFooter({ text: "NeroX Support Manager" })
    .setTimestamp();

  if (editMsg) {
    return editMsg.edit({ embeds: [embed], components: [] });
  }
  return message.reply({ embeds: [embed] });
}

async function cleanupExpiredNoPrefix(client, message, editMsg) {
  const keys = await client.db.noPrefix.keys;
  let removed = 0;

  for (const id of keys) {
    const data = await client.db.noPrefix.get(id);
    if (
      typeof data === "object" &&
      !data.permanent &&
      data.expiresAt &&
      data.expiresAt < Date.now()
    ) {
      await client.db.noPrefix.delete(id);
      removed++;
    }
  }

  const embed = client
    .embed(client.colors.success)
    .setDescription(`🗑️ Removed **${removed}** expired no-prefix user(s).`);

  await editMsg.edit({ embeds: [embed], components: [] });
}
