/**
 * Interaction Create Event - Support Server Manager
 * Handles button interactions for giveaways and tickets
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export default {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    // Handle button interactions
    if (interaction.isButton()) {
      await handleButtonInteraction(client, interaction);
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(client, interaction);
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(client, interaction);
      return;
    }
  },
};

// ==================== BUTTON HANDLER ====================
async function handleButtonInteraction(client, interaction) {
  const customId = interaction.customId;

  // Giveaway buttons
  if (customId.startsWith("gw_")) {
    if (customId.startsWith("gw_enter_")) {
      await handleGiveawayEntry(client, interaction);
    } else if (customId.startsWith("gw_participants_")) {
      await handleParticipantsView(client, interaction);
    }
    return;
  }

  // Ticket buttons
  if (customId.startsWith("ticket_")) {
    await handleTicketButton(client, interaction);
    return;
  }

  // NoPrefix buttons
  if (customId.startsWith("np_")) {
    await handleNoPrefixButton(client, interaction);
    return;
  }
}

// ==================== TICKET BUTTON HANDLER ====================
async function handleTicketButton(client, interaction) {
  const customId = interaction.customId;

  try {
    switch (customId) {
      case "ticket_create_general":
      case "ticket_quick_create":
        await createTicketFromButton(client, interaction, null);
        break;

      case "ticket_close":
        await closeTicketFromButton(client, interaction);
        break;

      case "ticket_claim":
        await claimTicket(client, interaction);
        break;

      case "ticket_transcript":
        await generateTranscriptFromButton(client, interaction);
        break;

      case "ticket_reopen":
        await reopenTicket(client, interaction);
        break;

      case "ticket_delete_now":
        await deleteTicketNow(client, interaction);
        break;

      default:
        if (customId.startsWith("ticket_setup_")) {
          // Setup buttons are handled in the command
          return;
        }
    }
  } catch (error) {
    console.error("[Ticket Button] Error:", error);
    await interaction
      .reply({
        content: "❌ An error occurred while processing your request.",
        ephemeral: true,
      })
      .catch(() => {});
  }
}

// ==================== CREATE TICKET FROM BUTTON ====================
async function createTicketFromButton(client, interaction, categoryId) {
  const guildId = interaction.guild.id;
  const config = (await client.db.ticketConfig.get(guildId)) || {};

  if (!config.categoryId) {
    return interaction.reply({
      content: "❌ Ticket system is not configured! Ask an admin to set it up.",
      ephemeral: true,
    });
  }

  // Check if user already has an open ticket
  const allTickets = await client.db.tickets.keys;
  for (const key of allTickets) {
    const ticket = await client.db.tickets.get(key);
    if (
      ticket &&
      ticket.guildId === guildId &&
      ticket.userId === interaction.user.id &&
      ticket.status === "open"
    ) {
      return interaction.reply({
        content: `⚠️ You already have an open ticket: <#${ticket.channelId}>`,
        ephemeral: true,
      });
    }
  }

  // Get ticket category
  let ticketCategory = null;
  if (categoryId && config.ticketCategories?.length > 0) {
    ticketCategory = config.ticketCategories.find((c) => c.id === categoryId);
  }

  // Show reason modal
  const modal = new ModalBuilder()
    .setCustomId(`ticket_reason_modal_${categoryId || "general"}`)
    .setTitle("Create Support Ticket");

  const reasonInput = new TextInputBuilder()
    .setCustomId("ticket_reason")
    .setLabel("What do you need help with?")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Please describe your issue in detail...")
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

// ==================== CLOSE TICKET FROM BUTTON ====================
async function closeTicketFromButton(client, interaction) {
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  if (ticketData.status === "closed") {
    return interaction.reply({
      content: "⚠️ This ticket is already closed!",
      ephemeral: true,
    });
  }

  // Show close reason modal
  const modal = new ModalBuilder()
    .setCustomId("ticket_close_modal")
    .setTitle("Close Ticket");

  const reasonInput = new TextInputBuilder()
    .setCustomId("close_reason")
    .setLabel("Reason for closing (optional)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter reason...")
    .setRequired(false)
    .setMaxLength(200);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

// ==================== CLAIM TICKET ====================
async function claimTicket(client, interaction) {
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  const config = (await client.db.ticketConfig.get(interaction.guild.id)) || {};
  const isOwner = client.owners.includes(interaction.user.id);
  const isAdmin = interaction.member?.permissions.has(
    PermissionFlagsBits.Administrator,
  );
  const isSupportRole =
    config.supportRoleId &&
    interaction.member?.roles.cache.has(config.supportRoleId);

  if (!isOwner && !isAdmin && !isSupportRole) {
    return interaction.reply({
      content: "❌ You do not have permission to claim tickets!",
      ephemeral: true,
    });
  }

  if (ticketData.claimedBy) {
    const claimer = await client.users
      .fetch(ticketData.claimedBy)
      .catch(() => null);
    return interaction.reply({
      content: `⚠️ This ticket is already claimed by ${claimer?.tag || "someone"}!`,
      ephemeral: true,
    });
  }

  ticketData.claimedBy = interaction.user.id;
  await client.db.tickets.set(interaction.channel.id, ticketData);

  const embed = client
    .embed(client.colors.success)
    .setDescription(
      `✋ **${interaction.user.tag}** has claimed this ticket!\n\nThey will be assisting you.`,
    );

  await interaction.reply({ embeds: [embed] });

  // Update channel name to show claimed
  const ticketNumber = ticketData.number.toString().padStart(4, "0");
  await interaction.channel.setName(`claimed-${ticketNumber}`).catch(() => {});
}

// ==================== GENERATE TRANSCRIPT FROM BUTTON ====================
async function generateTranscriptFromButton(client, interaction) {
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const sortedMessages = [...messages.values()].reverse();

  const transcript = {
    ticketId: ticketData.id,
    ticketNumber: ticketData.number,
    channelName: interaction.channel.name,
    createdBy: ticketData.userTag,
    createdAt: ticketData.createdAt,
    generatedAt: Date.now(),
    messageCount: sortedMessages.length,
    messages: sortedMessages.map((m) => ({
      author: m.author.tag,
      authorId: m.author.id,
      content: m.content,
      embeds: m.embeds.length,
      attachments: m.attachments.map((a) => a.url),
      timestamp: m.createdTimestamp,
    })),
  };

  await client.db.ticketTranscripts.set(ticketData.id, transcript);

  await interaction.editReply({
    content: `✅ Transcript saved! ${transcript.messageCount} messages recorded.`,
  });
}

// ==================== REOPEN TICKET ====================
async function reopenTicket(client, interaction) {
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  const config = (await client.db.ticketConfig.get(interaction.guild.id)) || {};
  const isOwner = client.owners.includes(interaction.user.id);
  const isAdmin = interaction.member?.permissions.has(
    PermissionFlagsBits.Administrator,
  );
  const isSupportRole =
    config.supportRoleId &&
    interaction.member?.roles.cache.has(config.supportRoleId);
  const isTicketOwner = ticketData.userId === interaction.user.id;

  if (!isOwner && !isAdmin && !isSupportRole && !isTicketOwner) {
    return interaction.reply({
      content: "❌ You do not have permission to reopen this ticket!",
      ephemeral: true,
    });
  }

  ticketData.status = "open";
  ticketData.closedAt = null;
  ticketData.closedBy = null;
  await client.db.tickets.set(interaction.channel.id, ticketData);

  const ticketNumber = ticketData.number.toString().padStart(4, "0");
  await interaction.channel.setName(`ticket-${ticketNumber}`).catch(() => {});

  const embed = client
    .embed(client.colors.success)
    .setDescription(`🔓 **${interaction.user.tag}** has reopened this ticket!`);

  const ticketButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒"),
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✋")
      .setDisabled(!!ticketData.claimedBy),
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Transcript")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📝"),
  );

  await interaction.update({ embeds: [embed], components: [ticketButtons] });
}

// ==================== DELETE TICKET NOW ====================
async function deleteTicketNow(client, interaction) {
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  const isOwner = client.owners.includes(interaction.user.id);
  const isAdmin = interaction.member?.permissions.has(
    PermissionFlagsBits.Administrator,
  );

  if (!isOwner && !isAdmin) {
    return interaction.reply({
      content: "❌ Only administrators can force delete tickets!",
      ephemeral: true,
    });
  }

  await interaction.reply({ content: "🗑️ Deleting ticket..." });

  setTimeout(async () => {
    await interaction.channel.delete().catch(() => {});
    await client.db.tickets.delete(interaction.channel.id);
  }, 2000);
}

// ==================== SELECT MENU HANDLER ====================
async function handleSelectMenuInteraction(client, interaction) {
  const customId = interaction.customId;

  if (customId === "ticket_category_select") {
    const categoryId = interaction.values[0];
    await createTicketFromButton(client, interaction, categoryId);
  }
}

// ==================== MODAL SUBMIT HANDLER ====================
async function handleModalSubmit(client, interaction) {
  const customId = interaction.customId;

  if (customId.startsWith("ticket_reason_modal_")) {
    await handleTicketCreationModal(client, interaction);
    return;
  }

  if (customId === "ticket_close_modal") {
    await handleTicketCloseModal(client, interaction);
    return;
  }
}

async function handleTicketCreationModal(client, interaction) {
  const categoryId = interaction.customId.replace("ticket_reason_modal_", "");
  const reason = interaction.fields.getTextInputValue("ticket_reason");

  const guildId = interaction.guild.id;
  const config = (await client.db.ticketConfig.get(guildId)) || {};

  if (!config.categoryId) {
    return interaction.reply({
      content: "❌ Ticket system is not configured!",
      ephemeral: true,
    });
  }

  // Double check for existing ticket
  const allTickets = await client.db.tickets.keys;
  for (const key of allTickets) {
    const ticket = await client.db.tickets.get(key);
    if (
      ticket &&
      ticket.guildId === guildId &&
      ticket.userId === interaction.user.id &&
      ticket.status === "open"
    ) {
      return interaction.reply({
        content: `⚠️ You already have an open ticket: <#${ticket.channelId}>`,
        ephemeral: true,
      });
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const category = interaction.guild.channels.cache.get(config.categoryId);
  if (!category) {
    return interaction.editReply({
      content: "❌ Ticket category not found! Please contact an admin.",
    });
  }

  // Get ticket category
  let ticketCategory = null;
  if (categoryId !== "general" && config.ticketCategories?.length > 0) {
    ticketCategory = config.ticketCategories.find((c) => c.id === categoryId);
  }

  config.ticketCount = (config.ticketCount || 0) + 1;
  await client.db.ticketConfig.set(guildId, config);

  const ticketNumber = config.ticketCount.toString().padStart(4, "0");
  const channelName = `ticket-${ticketNumber}`;

  // Create permission overwrites
  const permissionOverwrites = [
    {
      id: interaction.guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (config.supportRoleId) {
    permissionOverwrites.push({
      id: config.supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  // Create ticket channel
  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Ticket by ${interaction.user.tag} | Category: ${ticketCategory?.name || "General"} | Created: ${new Date().toISOString()}`,
    permissionOverwrites,
  });

  // Save ticket data
  const ticketData = {
    id: `ticket_${Date.now()}`,
    number: config.ticketCount,
    channelId: ticketChannel.id,
    guildId: guildId,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    category: ticketCategory?.name || "General",
    categoryId: ticketCategory?.id || null,
    reason: reason,
    status: "open",
    createdAt: Date.now(),
    closedAt: null,
    closedBy: null,
    claimedBy: null,
    participants: [interaction.user.id],
    messageCount: 0,
  };

  await client.db.tickets.set(ticketChannel.id, ticketData);

  // Create welcome embed
  const welcomeEmbed = client
    .embed(client.colors.success)
    .setAuthor({
      name: `Ticket #${ticketNumber}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setDescription(
      `Welcome ${interaction.user}! Your ticket has been created.\n\n` +
        `**Category:** ${ticketCategory?.emoji || "🎫"} ${ticketCategory?.name || "General"}\n` +
        `**Reason:** ${reason}\n\n` +
        `Our support team will assist you shortly.\n` +
        `Please wait patiently and provide any additional information if needed.`,
    )
    .setFooter({ text: "NeroX Support System" })
    .setTimestamp();

  const ticketButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒"),
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✋"),
    new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Transcript")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📝"),
  );

  await ticketChannel.send({
    content: `${interaction.user} ${config.supportRoleId ? `<@&${config.supportRoleId}>` : ""}`,
    embeds: [welcomeEmbed],
    components: [ticketButtons],
  });

  await interaction.editReply({
    content: `✅ Your ticket has been created: ${ticketChannel}`,
  });

  // Log ticket creation
  if (config.logChannelId) {
    const logChannel = await client.channels
      .fetch(config.logChannelId)
      .catch(() => null);
    if (logChannel) {
      const logEmbed = client
        .embed(client.colors.success)
        .setAuthor({
          name: "Ticket Created",
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `**Ticket:** #${ticketNumber}\n` +
            `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Category:** ${ticketCategory?.name || "General"}\n` +
            `**Reason:** ${reason.substring(0, 200)}${reason.length > 200 ? "..." : ""}`,
        )
        .setFooter({ text: `Ticket ID: ${ticketData.id}` })
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  }
}

async function handleTicketCloseModal(client, interaction) {
  const reason =
    interaction.fields.getTextInputValue("close_reason") ||
    "No reason provided";
  const ticketData = await client.db.tickets.get(interaction.channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ This is not a ticket channel!",
      ephemeral: true,
    });
  }

  const config = (await client.db.ticketConfig.get(interaction.guild.id)) || {};

  // Update ticket status
  ticketData.status = "closed";
  ticketData.closedAt = Date.now();
  ticketData.closedBy = interaction.user.id;
  ticketData.closeReason = reason;
  await client.db.tickets.set(interaction.channel.id, ticketData);

  // Generate transcript
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const sortedMessages = [...messages.values()].reverse();

  const transcript = {
    ticketId: ticketData.id,
    ticketNumber: ticketData.number,
    channelName: interaction.channel.name,
    createdBy: ticketData.userTag,
    createdAt: ticketData.createdAt,
    closedAt: Date.now(),
    messageCount: sortedMessages.length,
    messages: sortedMessages.map((m) => ({
      author: m.author.tag,
      authorId: m.author.id,
      content: m.content,
      embeds: m.embeds.length,
      attachments: m.attachments.map((a) => a.url),
      timestamp: m.createdTimestamp,
    })),
  };

  await client.db.ticketTranscripts.set(ticketData.id, transcript);

  // Calculate duration
  const duration = Date.now() - ticketData.createdAt;
  const durationStr = formatDuration(duration);

  const closeEmbed = client
    .embed(client.colors.warning)
    .setAuthor({
      name: "🔒 Ticket Closed",
      iconURL: client.user.displayAvatarURL(),
    })
    .setDescription(
      `This ticket has been closed by ${interaction.user}.\n\n` +
        `**Reason:** ${reason}\n` +
        `**Ticket:** #${ticketData.number.toString().padStart(4, "0")}\n` +
        `**Duration:** ${durationStr}\n` +
        `**Messages:** ${transcript.messageCount}`,
    )
    .setFooter({ text: "This channel will be deleted in 10 seconds..." })
    .setTimestamp();

  const reopenButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_reopen")
      .setLabel("Reopen")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔓"),
    new ButtonBuilder()
      .setCustomId("ticket_delete_now")
      .setLabel("Delete Now")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
  );

  await interaction.reply({ embeds: [closeEmbed], components: [reopenButton] });

  // Log ticket closure
  if (config.logChannelId) {
    const logChannel = await client.channels
      .fetch(config.logChannelId)
      .catch(() => null);
    if (logChannel) {
      const logEmbed = client
        .embed(client.colors.warning)
        .setAuthor({
          name: "Ticket Closed",
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `**Ticket:** #${ticketData.number.toString().padStart(4, "0")}\n` +
            `**User:** ${ticketData.userTag}\n` +
            `**Closed by:** ${interaction.user.tag}\n` +
            `**Reason:** ${reason}\n` +
            `**Duration:** ${durationStr}\n` +
            `**Messages:** ${transcript.messageCount}`,
        )
        .setFooter({ text: `Ticket ID: ${ticketData.id}` })
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  // Delete channel after 10 seconds
  setTimeout(async () => {
    const currentData = await client.db.tickets.get(interaction.channel.id);
    if (currentData && currentData.status === "closed") {
      await interaction.channel.delete().catch(() => {});
    }
  }, 10000);
}

// ==================== NOPREFIX BUTTON HANDLER ====================
async function handleNoPrefixButton(client, interaction) {
  // These are handled in the noprefix command collector
  // Just acknowledge if somehow reached here
  await interaction.deferUpdate().catch(() => {});
}

// ==================== GIVEAWAY HANDLERS ====================
async function handleGiveawayEntry(client, interaction) {
  const giveawayId = interaction.customId.replace("gw_enter_", "");

  try {
    const giveaway = await client.db.giveaways.get(giveawayId);

    if (!giveaway) {
      return interaction.reply({
        content: "This giveaway no longer exists.",
        ephemeral: true,
      });
    }

    if (giveaway.ended) {
      return interaction.reply({
        content: "This giveaway has already ended.",
        ephemeral: true,
      });
    }

    const message = interaction.message;
    const reaction = message.reactions.cache.get("🎉");

    if (reaction) {
      const users = await reaction.users.fetch();
      if (users.has(interaction.user.id)) {
        return interaction.reply({
          content: "You're already entered. Good luck!",
          ephemeral: true,
        });
      }
    }

    return interaction.reply({
      content: "React with 🎉 on the message to enter.",
      ephemeral: true,
    });
  } catch (error) {
    console.error("[Giveaway] Entry error:", error);
    return interaction.reply({
      content: "An error occurred. Please try reacting manually.",
      ephemeral: true,
    });
  }
}

async function handleParticipantsView(client, interaction) {
  const giveawayId = interaction.customId.replace("gw_participants_", "");

  try {
    const giveaway = await client.db.giveaways.get(giveawayId);

    if (!giveaway) {
      return interaction.reply({
        content: "This giveaway no longer exists.",
        ephemeral: true,
      });
    }

    const message = interaction.message;
    const reaction = message.reactions.cache.get("🎉");
    let count = 0;

    if (reaction) {
      const users = await reaction.users.fetch();
      count = users.filter((u) => !u.bot).size;
    }

    const prizeInfo = getPrizeInfo(giveaway.prize);
    const timeLeft = giveaway.endsAt - Date.now();
    const timeStr =
      timeLeft > 0 ? `<t:${Math.floor(giveaway.endsAt / 1000)}:R>` : "Ended";

    const embed = client
      .embed(client.colors.info)
      .setAuthor({
        name: "Giveaway Info",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(
        `**Prize:** ${prizeInfo.name}\n` +
          `**Winners:** ${giveaway.winners}\n` +
          `**Participants:** ${count}\n` +
          `**Ends:** ${timeStr}\n\n` +
          `${giveaway.ended ? "This giveaway has ended." : "React with 🎉 to enter."}`,
      )
      .setFooter({ text: `ID: ${giveawayId}` });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    console.error("[Giveaway] Participants view error:", error);
    return interaction.reply({
      content: "An error occurred.",
      ephemeral: true,
    });
  }
}

function getPrizeInfo(prize) {
  const prizes = {
    noprefix: { emoji: "", name: "No Prefix Access" },
    premium: { emoji: "", name: "Premium (30 days)" },
  };
  return prizes[prize] || { emoji: "", name: prize };
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
