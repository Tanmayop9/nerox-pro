/**
 * Help Command - Support Server Manager
 * Shows all support manager commands with improved UI
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";

export default {
  name: "shelp",
  aliases: ["sh", "supporthelp", "help"],
  description: "Shows support manager commands",
  cooldown: 3,

  async execute(client, message, args) {
    const isOwner = client.owners.includes(message.author.id);

    // Command categories
    const categories = {
      general: {
        emoji: client.emoji.info1,
        name: "General",
        commands: [
          { name: "shelp", desc: "Help menu" },
          { name: "sstats", desc: "Statistics" },
        ],
      },
      tickets: {
        emoji: client.emoji.info1,
        name: "Tickets",
        commands: [
          { name: "ticket new", desc: "Create ticket" },
          { name: "ticket close", desc: "Close ticket" },
          { name: "ticket setup", desc: "Setup system (Admin)" },
          { name: "ticket panel", desc: "Send panel (Admin)" },
          { name: "ticket config", desc: "View config (Admin)" },
        ],
      },
      giveaways: {
        emoji: client.emoji.heart,
        name: "Giveaways",
        commands: [
          { name: "giveaway create", desc: "Create giveaway" },
          { name: "giveaway end", desc: "End early" },
          { name: "giveaway reroll", desc: "Reroll winners" },
          { name: "giveaway list", desc: "List active" },
        ],
      },
      management: {
        emoji: client.emoji.premium,
        name: "Management",
        commands: [
          { name: "noprefix add/remove", desc: "Manage no-prefix" },
          { name: "premium add/remove", desc: "Manage premium" },
          { name: "blacklist add/remove", desc: "Manage blacklist" },
        ],
      },
      moderation: {
        emoji: client.emoji.warning,
        name: "Moderation",
        commands: [
          { name: "warn", desc: "Warn user" },
          { name: "warnings", desc: "View warnings" },
          { name: "clearwarns", desc: "Clear warnings" },
        ],
      },
      botinfo: {
        emoji: client.emoji.music,
        name: "Bot Info",
        commands: [
          { name: "list247", desc: "List 24/7 guilds" },
          { name: "lavalink", desc: "Lavalink nodes status" },
        ],
      },
    };

    if (isOwner) {
      categories.owner = {
        emoji: client.emoji.premium,
        name: "Owner",
        commands: [{ name: "announce", desc: "Announcement" }],
      };
    }

    const generateMainEmbed = () => {
      return client
        .embed()
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `\`\`\`\n` +
            `Prefix: ${client.prefix}\n` +
            `Commands: ${Object.values(categories).reduce((acc, cat) => acc + cat.commands.length, 0)}\n` +
            `\`\`\`\n` +
            Object.entries(categories)
              .map(([key, cat]) => `${cat.emoji} **${cat.name}**`)
              .join("\n"),
        );
    };

    const generateCategoryEmbed = (categoryKey) => {
      const cat = categories[categoryKey];
      return client
        .embed()
        .setAuthor({
          name: cat.name,
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          cat.commands
            .map(
              (cmd) =>
                `${client.emoji.info1} \`${client.prefix}${cmd.name}\`\n└ ${cmd.desc}`,
            )
            .join("\n\n"),
        );
    };

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category")
      .setPlaceholder("Select category")
      .addOptions([
        {
          label: "Home",
          value: "home",
          description: "Main menu",
          emoji: client.emoji.info,
        },
        ...Object.entries(categories).map(([key, cat]) => ({
          label: cat.name,
          value: key,
          description: `${cat.commands.length} commands`,
        })),
      ]);

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help_tickets")
        .setLabel("Tickets")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("help_giveaways")
        .setLabel("Giveaways")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("help_management")
        .setLabel("Management")
        .setStyle(ButtonStyle.Secondary),
    );

    const reply = await message.reply({
      embeds: [generateMainEmbed()],
      components: [new ActionRowBuilder().addComponents(selectMenu), buttonRow],
    });

    const collector = reply.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "This menu is not for you!",
          ephemeral: true,
        });
      }

      let categoryKey = null;

      if (i.isStringSelectMenu()) {
        categoryKey = i.values[0];
      } else if (i.isButton()) {
        categoryKey = i.customId.replace("help_", "");
      }

      if (categoryKey === "home" || !categoryKey) {
        await i.update({ embeds: [generateMainEmbed()] });
      } else if (categories[categoryKey]) {
        await i.update({ embeds: [generateCategoryEmbed(categoryKey)] });
      }
    });

    collector.on("end", () => {
      selectMenu.setDisabled(true);
      reply
        .edit({
          components: [new ActionRowBuilder().addComponents(selectMenu)],
        })
        .catch(() => {});
    });
  },
};
