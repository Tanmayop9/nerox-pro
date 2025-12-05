/**
 * Help Command - Support Server Manager
 * Shows all support manager commands with improved UI
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';

export default {
    name: 'shelp',
    aliases: ['sh', 'supporthelp', 'help'],
    description: 'Shows support manager commands',
    cooldown: 3,

    async execute(client, message, args) {
        const isOwner = client.owners.includes(message.author.id);

        // Command categories
        const categories = {
            general: {
                emoji: '📋',
                name: 'General',
                commands: [
                    { name: 'shelp', desc: 'Shows this help menu' },
                    { name: 'sstats', desc: 'Support manager statistics' },
                ]
            },
            tickets: {
                emoji: '🎫',
                name: 'Tickets',
                commands: [
                    { name: 'ticket new', desc: 'Create a new ticket' },
                    { name: 'ticket close', desc: 'Close current ticket' },
                    { name: 'ticket setup', desc: 'Setup ticket system (Admin)' },
                    { name: 'ticket panel', desc: 'Send ticket panel (Admin)' },
                    { name: 'ticket config', desc: 'View ticket config (Admin)' },
                ]
            },
            giveaways: {
                emoji: '🎉',
                name: 'Giveaways',
                commands: [
                    { name: 'giveaway create', desc: 'Create a giveaway' },
                    { name: 'giveaway end', desc: 'End a giveaway early' },
                    { name: 'giveaway reroll', desc: 'Reroll winners' },
                    { name: 'giveaway list', desc: 'List active giveaways' },
                ]
            },
            management: {
                emoji: '⚙️',
                name: 'User Management',
                commands: [
                    { name: 'noprefix add/remove', desc: 'Manage no-prefix users' },
                    { name: 'premium add/remove', desc: 'Manage premium users' },
                    { name: 'blacklist add/remove', desc: 'Manage blacklisted users' },
                ]
            },
            moderation: {
                emoji: '🔨',
                name: 'Moderation',
                commands: [
                    { name: 'warn', desc: 'Warn a user' },
                    { name: 'warnings', desc: 'View user warnings' },
                    { name: 'clearwarns', desc: 'Clear user warnings' },
                ]
            },
            botinfo: {
                emoji: '🤖',
                name: 'Bot Info',
                commands: [
                    { name: 'list247', desc: 'List 24/7 enabled guilds' },
                ]
            }
        };

        if (isOwner) {
            categories.owner = {
                emoji: '👑',
                name: 'Owner',
                commands: [
                    { name: 'announce', desc: 'Make an announcement' },
                ]
            };
        }

        const generateMainEmbed = () => {
            return client.embed(client.colors.primary)
                .setAuthor({
                    name: `${client.user.username} Help Center`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(
                    `Welcome to **${client.user.username}** Help Center!\n\n` +
                    `**Prefix:** \`${client.prefix}\`\n` +
                    `**Commands:** ${Object.values(categories).reduce((acc, cat) => acc + cat.commands.length, 0)}\n\n` +
                    `Select a category below to view commands, or use the buttons to navigate.\n\n` +
                    Object.entries(categories).map(([key, cat]) => 
                        `${cat.emoji} **${cat.name}** - ${cat.commands.length} commands`
                    ).join('\n')
                )
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();
        };

        const generateCategoryEmbed = (categoryKey) => {
            const cat = categories[categoryKey];
            return client.embed(client.colors.primary)
                .setAuthor({
                    name: `${cat.emoji} ${cat.name} Commands`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setDescription(
                    cat.commands.map(cmd => 
                        `**\`${client.prefix}${cmd.name}\`**\n└ ${cmd.desc}`
                    ).join('\n\n')
                )
                .setFooter({ 
                    text: `${cat.commands.length} commands • Use the menu to navigate`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();
        };

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('📚 Select a category...')
            .addOptions([
                {
                    label: 'Home',
                    value: 'home',
                    description: 'Return to main menu',
                    emoji: '🏠'
                },
                ...Object.entries(categories).map(([key, cat]) => ({
                    label: cat.name,
                    value: key,
                    description: `View ${cat.commands.length} ${cat.name.toLowerCase()} commands`,
                    emoji: cat.emoji
                }))
            ]);

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help_tickets')
                .setLabel('Tickets')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫'),
            new ButtonBuilder()
                .setCustomId('help_giveaways')
                .setLabel('Giveaways')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉'),
            new ButtonBuilder()
                .setCustomId('help_management')
                .setLabel('Management')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️')
        );

        const reply = await message.reply({
            embeds: [generateMainEmbed()],
            components: [
                new ActionRowBuilder().addComponents(selectMenu),
                buttonRow
            ]
        });

        const collector = reply.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'This menu is not for you!', ephemeral: true });
            }

            let categoryKey = null;

            if (i.isStringSelectMenu()) {
                categoryKey = i.values[0];
            } else if (i.isButton()) {
                categoryKey = i.customId.replace('help_', '');
            }

            if (categoryKey === 'home' || !categoryKey) {
                await i.update({ embeds: [generateMainEmbed()] });
            } else if (categories[categoryKey]) {
                await i.update({ embeds: [generateCategoryEmbed(categoryKey)] });
            }
        });

        collector.on('end', () => {
            selectMenu.setDisabled(true);
            reply.edit({ 
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            }).catch(() => {});
        });
    }
};
