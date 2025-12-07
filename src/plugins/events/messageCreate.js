/**
 * Message Create Event - Support Server Manager
 */

import { Collection } from "discord.js";

export default {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = client.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command =
      client.commands.get(commandName) ||
      client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    if (!command) return;

    // Check if command is owner only
    if (command.ownerOnly && !client.owners.includes(message.author.id)) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setTitle(`${client.emoji.cross} Access Denied`)
            .setDescription(
              `This command is restricted to bot owners only.\n\n**Need Help?** Contact the bot developer for assistance.`,
            )
            .setFooter({ text: `Requested by ${message.author.tag}` }),
        ],
      });
    }

    // Check if command is support guild only
    if (command.supportOnly && message.guild.id !== client.supportGuild) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setTitle(`${client.emoji.cross} Wrong Server`)
            .setDescription(
              `This command can only be used in the official support server.\n\n**Support Server:** Join our support server to use this command!`,
            )
            .setFooter({ text: `Requested by ${message.author.tag}` }),
        ],
      });
    }

    // Cooldown handling
    if (!client.cooldowns.has(command.name)) {
      client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return message.reply({
          embeds: [
            client
              .embed(client.colors.warning)
              .setTitle(`${client.emoji.warn} Slow Down!`)
              .setDescription(
                `You're using commands too quickly!\n\n**Wait Time:** ${timeLeft.toFixed(1)} seconds\n**Tip:** Take your time to avoid cooldowns! ⏰`,
              )
              .setFooter({ text: `Command: ${command.name}` }),
          ],
        });
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Execute command
    try {
      await command.execute(client, message, args);
    } catch (error) {
      console.error(
        `[Support Manager] Error executing ${command.name}:`,
        error,
      );
      await message
        .reply({
          embeds: [
            client
              .embed(client.colors.error)
              .setTitle(`${client.emoji.cross} Command Error`)
              .setDescription(
                `Oops! Something went wrong while executing this command.\n\n**Error:** \`${error.message}\`\n\n**Need Help?** Contact support if this persists.`,
              )
              .setFooter({ text: `Command: ${command.name}` })
              .setTimestamp(),
          ],
        })
        .catch(() => {
          // Fallback: send a simple message if embed fails
          message
            .reply(`${client.emoji.cross} An error occurred: ${error.message}`)
            .catch(() => {});
        });
    }
  },
};
