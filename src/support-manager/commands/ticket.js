/**
 * Ticket System Command - Support Server Manager
 * Comprehensive ticket system with full configuration via commands
 * No hardcoded data - everything is configurable
 */

import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

export default {
    name: 'ticket',
    aliases: ['tickets', 't'],
    description: 'Comprehensive ticket management system',
    ownerOnly: false,
    cooldown: 3,

    async execute(client, message, args) {
        const subcommand = args[0]?.toLowerCase();
        const isOwner = client.owners.includes(message.author.id);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        // User commands (available to everyone)
        const userCommands = ['new', 'close', 'transcript'];
        // Admin commands (requires admin/owner)
        const adminCommands = ['setup', 'panel', 'config', 'category', 'add', 'remove', 'rename', 'delete', 'list', 'logs', 'reset'];

        if (!subcommand || ![...userCommands, ...adminCommands].includes(subcommand)) {
            return showHelp(client, message, isOwner || isAdmin);
        }

        // Check permissions for admin commands
        if (adminCommands.includes(subcommand) && !isOwner && !isAdmin) {
            return message.reply({
                embeds: [
                    client.embed(client.colors.error)
                        .setDescription('❌ You need Administrator permission to use this command!')
                ]
            });
        }

        try {
            switch (subcommand) {
                // User commands
                case 'new':
                    await createTicket(client, message, args.slice(1));
                    break;
                case 'close':
                    await closeTicket(client, message, args.slice(1));
                    break;
                case 'transcript':
                    await createTranscript(client, message);
                    break;

                // Admin commands
                case 'setup':
                    await setupTickets(client, message, args.slice(1));
                    break;
                case 'panel':
                    await sendPanel(client, message, args.slice(1));
                    break;
                case 'config':
                    await showConfig(client, message);
                    break;
                case 'category':
                    await manageCategories(client, message, args.slice(1));
                    break;
                case 'add':
                    await addUserToTicket(client, message, args.slice(1));
                    break;
                case 'remove':
                    await removeUserFromTicket(client, message, args.slice(1));
                    break;
                case 'rename':
                    await renameTicket(client, message, args.slice(1));
                    break;
                case 'delete':
                    await deleteTicket(client, message);
                    break;
                case 'list':
                    await listTickets(client, message, args.slice(1));
                    break;
                case 'logs':
                    await setLogChannel(client, message, args.slice(1));
                    break;
                case 'reset':
                    await resetConfig(client, message);
                    break;
            }
        } catch (error) {
            console.error('[Ticket] Error:', error);
            return message.reply({
                embeds: [
                    client.embed(client.colors.error)
                        .setDescription(`❌ An error occurred: ${error.message}`)
                ]
            });
        }
    }
};

// ==================== HELP COMMAND ====================
async function showHelp(client, message, isAdmin) {
    const embed = client.embed(client.colors.info)
        .setAuthor({
            name: '🎫 Ticket System',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `A comprehensive ticket system for managing support requests.\n\n` +
            `**User Commands:**\n` +
            `\`${client.prefix}ticket new [category] [reason]\` - Create a new ticket\n` +
            `\`${client.prefix}ticket close [reason]\` - Close current ticket\n` +
            `\`${client.prefix}ticket transcript\` - Generate ticket transcript\n`
        );

    if (isAdmin) {
        embed.addFields({
            name: '🔧 Admin Commands',
            value: 
                `\`${client.prefix}ticket setup\` - Interactive setup wizard\n` +
                `\`${client.prefix}ticket panel [channel]\` - Send ticket panel\n` +
                `\`${client.prefix}ticket config\` - View current configuration\n` +
                `\`${client.prefix}ticket category <add/remove/list> [name]\` - Manage categories\n` +
                `\`${client.prefix}ticket add <user>\` - Add user to ticket\n` +
                `\`${client.prefix}ticket remove <user>\` - Remove user from ticket\n` +
                `\`${client.prefix}ticket rename <name>\` - Rename current ticket\n` +
                `\`${client.prefix}ticket delete\` - Delete current ticket\n` +
                `\`${client.prefix}ticket list [user/open/closed/all]\` - List tickets\n` +
                `\`${client.prefix}ticket logs <channel>\` - Set log channel\n` +
                `\`${client.prefix}ticket reset\` - Reset all ticket configuration`
        });
    }

    embed.setFooter({ text: 'NeroX Support Manager' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_quick_create')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
    );

    await message.reply({ embeds: [embed], components: [row] });
}

// ==================== SETUP WIZARD ====================
async function setupTickets(client, message, args) {
    const guildId = message.guild.id;
    let config = await client.db.ticketConfig.get(guildId) || {};

    const embed = client.embed(client.colors.info)
        .setAuthor({
            name: '🔧 Ticket Setup Wizard',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `Welcome to the ticket setup wizard!\n\n` +
            `**Current Configuration:**\n` +
            `📁 Category: ${config.categoryId ? `<#${config.categoryId}>` : 'Not set'}\n` +
            `📝 Log Channel: ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}\n` +
            `👥 Support Role: ${config.supportRoleId ? `<@&${config.supportRoleId}>` : 'Not set'}\n` +
            `🏷️ Ticket Categories: ${config.ticketCategories?.length || 0}\n` +
            `📊 Total Tickets: ${config.ticketCount || 0}\n\n` +
            `Click the buttons below to configure each setting.`
        )
        .setFooter({ text: 'NeroX Support Manager' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_setup_category')
            .setLabel('Set Category')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📁'),
        new ButtonBuilder()
            .setCustomId('ticket_setup_logs')
            .setLabel('Set Log Channel')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝'),
        new ButtonBuilder()
            .setCustomId('ticket_setup_role')
            .setLabel('Set Support Role')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👥')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_setup_categories')
            .setLabel('Manage Categories')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏷️'),
        new ButtonBuilder()
            .setCustomId('ticket_setup_panel')
            .setLabel('Send Panel')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📤'),
        new ButtonBuilder()
            .setCustomId('ticket_setup_test')
            .setLabel('Test Setup')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🧪')
    );

    const reply = await message.reply({ embeds: [embed], components: [row1, row2] });

    const collector = reply.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'This is not for you!', ephemeral: true });
        }

        config = await client.db.ticketConfig.get(guildId) || {};

        switch (i.customId) {
            case 'ticket_setup_category':
                await i.reply({
                    content: '📁 Please mention the **category channel** where tickets will be created (e.g., mention or send category ID):',
                    ephemeral: true
                });
                await waitForCategorySetup(client, message, guildId, 'categoryId');
                break;

            case 'ticket_setup_logs':
                await i.reply({
                    content: '📝 Please mention the **log channel** for ticket logs:',
                    ephemeral: true
                });
                await waitForChannelSetup(client, message, guildId, 'logChannelId');
                break;

            case 'ticket_setup_role':
                await i.reply({
                    content: '👥 Please mention the **support role** that can view all tickets:',
                    ephemeral: true
                });
                await waitForRoleSetup(client, message, guildId);
                break;

            case 'ticket_setup_categories':
                await i.update({ components: [] });
                await manageCategories(client, message, ['list']);
                break;

            case 'ticket_setup_panel':
                await i.update({ components: [] });
                await sendPanel(client, message, []);
                break;

            case 'ticket_setup_test':
                await testSetup(client, i, guildId);
                break;
        }
    });

    collector.on('end', () => {
        reply.edit({ components: [] }).catch(() => {});
    });
}

async function waitForCategorySetup(client, message, guildId, field) {
    const filter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
    
    if (collected.size === 0) return;
    
    const response = collected.first();
    const categoryId = response.content.replace(/[<#>]/g, '');
    
    const category = message.guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
        return response.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Invalid category! Please provide a valid category ID.')]
        });
    }

    let config = await client.db.ticketConfig.get(guildId) || {};
    config[field] = categoryId;
    await client.db.ticketConfig.set(guildId, config);

    await response.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ Category set to **${category.name}**!`)]
    });
}

async function waitForChannelSetup(client, message, guildId, field) {
    const filter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
    
    if (collected.size === 0) return;
    
    const response = collected.first();
    const channel = response.mentions.channels.first() || message.guild.channels.cache.get(response.content);
    
    if (!channel || channel.type !== ChannelType.GuildText) {
        return response.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Invalid channel! Please mention a valid text channel.')]
        });
    }

    let config = await client.db.ticketConfig.get(guildId) || {};
    config[field] = channel.id;
    await client.db.ticketConfig.set(guildId, config);

    await response.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ Log channel set to ${channel}!`)]
    });
}

async function waitForRoleSetup(client, message, guildId) {
    const filter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
    
    if (collected.size === 0) return;
    
    const response = collected.first();
    const role = response.mentions.roles.first() || message.guild.roles.cache.get(response.content);
    
    if (!role) {
        return response.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Invalid role! Please mention a valid role.')]
        });
    }

    let config = await client.db.ticketConfig.get(guildId) || {};
    config.supportRoleId = role.id;
    await client.db.ticketConfig.set(guildId, config);

    await response.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ Support role set to ${role}!`)]
    });
}

async function testSetup(client, interaction, guildId) {
    const config = await client.db.ticketConfig.get(guildId) || {};
    const issues = [];

    if (!config.categoryId) {
        issues.push('❌ Ticket category not set');
    } else {
        const category = interaction.guild.channels.cache.get(config.categoryId);
        if (!category) issues.push('❌ Ticket category not found (deleted?)');
        else issues.push('✅ Ticket category configured');
    }

    if (!config.logChannelId) {
        issues.push('⚠️ Log channel not set (optional)');
    } else {
        const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
        if (!logChannel) issues.push('❌ Log channel not found (deleted?)');
        else issues.push('✅ Log channel configured');
    }

    if (!config.supportRoleId) {
        issues.push('⚠️ Support role not set (optional)');
    } else {
        const role = interaction.guild.roles.cache.get(config.supportRoleId);
        if (!role) issues.push('❌ Support role not found (deleted?)');
        else issues.push('✅ Support role configured');
    }

    const allGood = !issues.some(i => i.startsWith('❌'));

    await interaction.reply({
        embeds: [
            client.embed(allGood ? client.colors.success : client.colors.warning)
                .setAuthor({ name: '🧪 Setup Test Results', iconURL: client.user.displayAvatarURL() })
                .setDescription(issues.join('\n') + '\n\n' + (allGood ? '✅ **Ready to use!**' : '⚠️ **Please fix the issues above.**'))
        ],
        ephemeral: true
    });
}

// ==================== SEND PANEL ====================
async function sendPanel(client, message, args) {
    const guildId = message.guild.id;
    const config = await client.db.ticketConfig.get(guildId) || {};

    const channel = message.mentions.channels.first() || message.channel;
    const categories = config.ticketCategories || [];

    const embed = client.embed(client.colors.primary)
        .setAuthor({
            name: `${message.guild.name} - Support`,
            iconURL: message.guild.iconURL()
        })
        .setTitle('🎫 Create a Support Ticket')
        .setDescription(
            `Need help? Create a ticket and our support team will assist you!\n\n` +
            `**How it works:**\n` +
            `1️⃣ Click the button below or select a category\n` +
            `2️⃣ Describe your issue in the ticket channel\n` +
            `3️⃣ Wait for our support team to respond\n\n` +
            `*Please be patient and don't create multiple tickets for the same issue.*`
        )
        .setColor(config.embedColor || client.colors.primary)
        .setFooter({ text: 'NeroX Support System' })
        .setTimestamp();

    const components = [];

    // If categories exist, create a select menu
    if (categories.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_category_select')
            .setPlaceholder('📋 Select a category...')
            .addOptions(
                categories.map(cat => ({
                    label: cat.name,
                    value: cat.id,
                    description: cat.description || `Open a ${cat.name} ticket`,
                    emoji: cat.emoji || '🎫'
                }))
            );
        components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    // Always add a create button
    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_create_general')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
    );
    components.push(buttonRow);

    await channel.send({ embeds: [embed], components });

    if (channel.id !== message.channel.id) {
        await message.reply({
            embeds: [
                client.embed(client.colors.success)
                    .setDescription(`✅ Ticket panel sent to ${channel}!`)
            ]
        });
    }
}

// ==================== MANAGE CATEGORIES ====================
async function manageCategories(client, message, args) {
    const guildId = message.guild.id;
    const action = args[0]?.toLowerCase();
    let config = await client.db.ticketConfig.get(guildId) || {};
    config.ticketCategories = config.ticketCategories || [];

    if (!action || !['add', 'remove', 'list', 'edit'].includes(action)) {
        const embed = client.embed(client.colors.info)
            .setAuthor({ name: '🏷️ Ticket Categories', iconURL: client.user.displayAvatarURL() })
            .setDescription(
                `**Commands:**\n` +
                `\`${client.prefix}ticket category add <name> [emoji] [description]\`\n` +
                `\`${client.prefix}ticket category remove <name>\`\n` +
                `\`${client.prefix}ticket category list\`\n` +
                `\`${client.prefix}ticket category edit <name> <field> <value>\`\n\n` +
                `**Current Categories:** ${config.ticketCategories.length}`
            );
        return message.reply({ embeds: [embed] });
    }

    switch (action) {
        case 'add': {
            const name = args[1];
            if (!name) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ Please provide a category name!')]
                });
            }

            if (config.ticketCategories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ A category with this name already exists!')]
                });
            }

            const emoji = args[2] || '🎫';
            const description = args.slice(3).join(' ') || `Open a ${name} ticket`;

            const newCategory = {
                id: `cat_${Date.now()}`,
                name: name,
                emoji: emoji,
                description: description,
                createdAt: Date.now()
            };

            config.ticketCategories.push(newCategory);
            await client.db.ticketConfig.set(guildId, config);

            await message.reply({
                embeds: [
                    client.embed(client.colors.success)
                        .setDescription(`✅ Category **${emoji} ${name}** added!\n\n*${description}*`)
                ]
            });
            break;
        }

        case 'remove': {
            const name = args[1];
            if (!name) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ Please provide a category name!')]
                });
            }

            const index = config.ticketCategories.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
            if (index === -1) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ Category not found!')]
                });
            }

            const removed = config.ticketCategories.splice(index, 1)[0];
            await client.db.ticketConfig.set(guildId, config);

            await message.reply({
                embeds: [client.embed(client.colors.success).setDescription(`✅ Category **${removed.name}** removed!`)]
            });
            break;
        }

        case 'list': {
            if (config.ticketCategories.length === 0) {
                return message.reply({
                    embeds: [
                        client.embed(client.colors.info)
                            .setDescription(`📋 No ticket categories configured.\n\nUse \`${client.prefix}ticket category add <name>\` to add one!`)
                    ]
                });
            }

            const embed = client.embed(client.colors.primary)
                .setAuthor({ name: '🏷️ Ticket Categories', iconURL: client.user.displayAvatarURL() })
                .setDescription(
                    config.ticketCategories.map((cat, i) => 
                        `**${i + 1}. ${cat.emoji} ${cat.name}**\n` +
                        `   ID: \`${cat.id}\`\n` +
                        `   ${cat.description}`
                    ).join('\n\n')
                )
                .setFooter({ text: `Total: ${config.ticketCategories.length} categories` });

            await message.reply({ embeds: [embed] });
            break;
        }

        case 'edit': {
            const name = args[1];
            const field = args[2]?.toLowerCase();
            const value = args.slice(3).join(' ');

            if (!name || !field || !value) {
                return message.reply({
                    embeds: [
                        client.embed(client.colors.error)
                            .setDescription('❌ Usage: `ticket category edit <name> <emoji/description> <value>`')
                    ]
                });
            }

            const category = config.ticketCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
            if (!category) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ Category not found!')]
                });
            }

            if (!['emoji', 'description', 'name'].includes(field)) {
                return message.reply({
                    embeds: [client.embed(client.colors.error).setDescription('❌ Invalid field! Use: emoji, description, or name')]
                });
            }

            category[field] = value;
            await client.db.ticketConfig.set(guildId, config);

            await message.reply({
                embeds: [client.embed(client.colors.success).setDescription(`✅ Updated **${name}** ${field} to: ${value}`)]
            });
            break;
        }
    }
}

// ==================== CREATE TICKET ====================
async function createTicket(client, message, args) {
    const guildId = message.guild.id;
    const config = await client.db.ticketConfig.get(guildId) || {};

    if (!config.categoryId) {
        return message.reply({
            embeds: [
                client.embed(client.colors.error)
                    .setDescription('❌ Ticket system is not configured! Ask an admin to run `ticket setup`.')
            ]
        });
    }

    // Check if user already has an open ticket
    const existingTicket = await findUserOpenTicket(client, guildId, message.author.id);
    if (existingTicket) {
        return message.reply({
            embeds: [
                client.embed(client.colors.warning)
                    .setDescription(`⚠️ You already have an open ticket: <#${existingTicket.channelId}>\n\nPlease use that ticket or close it first.`)
            ]
        });
    }

    const category = message.guild.channels.cache.get(config.categoryId);
    if (!category) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Ticket category not found! Please reconfigure.')]
        });
    }

    // Determine ticket category if provided
    const categoryName = args[0];
    let ticketCategory = null;
    if (categoryName && config.ticketCategories?.length > 0) {
        ticketCategory = config.ticketCategories.find(c => 
            c.name.toLowerCase() === categoryName.toLowerCase() || c.id === categoryName
        );
    }

    const reason = args.slice(ticketCategory ? 1 : 0).join(' ') || 'No reason provided';
    config.ticketCount = (config.ticketCount || 0) + 1;
    await client.db.ticketConfig.set(guildId, config);

    const ticketNumber = config.ticketCount.toString().padStart(4, '0');
    const channelName = `ticket-${ticketNumber}`;

    // Create permission overwrites
    const permissionOverwrites = [
        {
            id: message.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: message.author.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }
    ];

    // Add support role if configured
    if (config.supportRoleId) {
        permissionOverwrites.push({
            id: config.supportRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
            ]
        });
    }

    // Create the ticket channel
    const ticketChannel = await message.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Ticket by ${message.author.tag} | Category: ${ticketCategory?.name || 'General'} | Created: ${new Date().toISOString()}`,
        permissionOverwrites
    });

    // Save ticket to database
    const ticketData = {
        id: `ticket_${Date.now()}`,
        number: config.ticketCount,
        channelId: ticketChannel.id,
        guildId: guildId,
        userId: message.author.id,
        userTag: message.author.tag,
        category: ticketCategory?.name || 'General',
        categoryId: ticketCategory?.id || null,
        reason: reason,
        status: 'open',
        createdAt: Date.now(),
        closedAt: null,
        closedBy: null,
        claimedBy: null,
        participants: [message.author.id],
        messageCount: 0
    };

    await client.db.tickets.set(ticketChannel.id, ticketData);

    // Create ticket welcome embed
    const welcomeEmbed = client.embed(client.colors.success)
        .setAuthor({
            name: `Ticket #${ticketNumber}`,
            iconURL: message.author.displayAvatarURL()
        })
        .setDescription(
            `Welcome ${message.author}! Your ticket has been created.\n\n` +
            `**Category:** ${ticketCategory?.emoji || '🎫'} ${ticketCategory?.name || 'General'}\n` +
            `**Reason:** ${reason}\n\n` +
            `Our support team will assist you shortly.\n` +
            `Please describe your issue in detail.`
        )
        .setFooter({ text: 'NeroX Support System' })
        .setTimestamp();

    const ticketButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✋'),
        new ButtonBuilder()
            .setCustomId('ticket_transcript')
            .setLabel('Transcript')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📝')
    );

    await ticketChannel.send({
        content: `${message.author} ${config.supportRoleId ? `<@&${config.supportRoleId}>` : ''}`,
        embeds: [welcomeEmbed],
        components: [ticketButtons]
    });

    // Send confirmation to user
    await message.reply({
        embeds: [
            client.embed(client.colors.success)
                .setDescription(`✅ Your ticket has been created: ${ticketChannel}\n\nPlease describe your issue there.`)
        ]
    });

    // Log ticket creation
    await logTicketAction(client, config, 'created', ticketData, message.author);
}

// ==================== CLOSE TICKET ====================
async function closeTicket(client, message, args) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    if (ticketData.status === 'closed') {
        return message.reply({
            embeds: [client.embed(client.colors.warning).setDescription('⚠️ This ticket is already closed!')]
        });
    }

    const reason = args.join(' ') || 'No reason provided';
    const config = await client.db.ticketConfig.get(message.guild.id) || {};

    // Update ticket status
    ticketData.status = 'closed';
    ticketData.closedAt = Date.now();
    ticketData.closedBy = message.author.id;
    ticketData.closeReason = reason;
    await client.db.tickets.set(message.channel.id, ticketData);

    // Create transcript before closing
    const transcript = await generateTranscript(client, message.channel, ticketData);

    const closeEmbed = client.embed(client.colors.warning)
        .setAuthor({ name: '🔒 Ticket Closed', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `This ticket has been closed by ${message.author}.\n\n` +
            `**Reason:** ${reason}\n` +
            `**Ticket:** #${ticketData.number.toString().padStart(4, '0')}\n` +
            `**Duration:** ${formatDuration(Date.now() - ticketData.createdAt)}`
        )
        .setFooter({ text: 'This channel will be deleted in 10 seconds...' })
        .setTimestamp();

    const reopenButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_reopen')
            .setLabel('Reopen')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔓'),
        new ButtonBuilder()
            .setCustomId('ticket_delete_now')
            .setLabel('Delete Now')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
    );

    await message.channel.send({ embeds: [closeEmbed], components: [reopenButton] });

    // Log ticket closure
    await logTicketAction(client, config, 'closed', ticketData, message.author, reason, transcript);

    // Delete after 10 seconds unless reopened
    setTimeout(async () => {
        const currentData = await client.db.tickets.get(message.channel.id);
        if (currentData && currentData.status === 'closed') {
            await message.channel.delete().catch(() => {});
        }
    }, 10000);
}

// ==================== TRANSCRIPT ====================
async function createTranscript(client, message) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    const transcript = await generateTranscript(client, message.channel, ticketData);

    await message.reply({
        embeds: [
            client.embed(client.colors.success)
                .setAuthor({ name: '📝 Transcript Generated', iconURL: client.user.displayAvatarURL() })
                .setDescription(`Transcript saved with ${transcript.messageCount} messages.`)
        ]
    });
}

async function generateTranscript(client, channel, ticketData) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();

    const transcript = {
        ticketId: ticketData.id,
        ticketNumber: ticketData.number,
        channelName: channel.name,
        createdBy: ticketData.userTag,
        createdAt: ticketData.createdAt,
        closedAt: ticketData.closedAt || Date.now(),
        messageCount: sortedMessages.length,
        messages: sortedMessages.map(m => ({
            author: m.author.tag,
            authorId: m.author.id,
            content: m.content,
            embeds: m.embeds.length,
            attachments: m.attachments.map(a => a.url),
            timestamp: m.createdTimestamp
        }))
    };

    await client.db.ticketTranscripts.set(ticketData.id, transcript);
    return transcript;
}

// ==================== ADD/REMOVE USER ====================
async function addUserToTicket(client, message, args) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    const target = message.mentions.members.first() || 
        await message.guild.members.fetch(args[0]).catch(() => null);

    if (!target) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Please mention a user to add!')]
        });
    }

    await message.channel.permissionOverwrites.create(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });

    if (!ticketData.participants.includes(target.id)) {
        ticketData.participants.push(target.id);
        await client.db.tickets.set(message.channel.id, ticketData);
    }

    await message.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ ${target} has been added to this ticket.`)]
    });
}

async function removeUserFromTicket(client, message, args) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    const target = message.mentions.members.first() || 
        await message.guild.members.fetch(args[0]).catch(() => null);

    if (!target) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Please mention a user to remove!')]
        });
    }

    if (target.id === ticketData.userId) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ You cannot remove the ticket creator!')]
        });
    }

    await message.channel.permissionOverwrites.delete(target);

    ticketData.participants = ticketData.participants.filter(id => id !== target.id);
    await client.db.tickets.set(message.channel.id, ticketData);

    await message.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ ${target} has been removed from this ticket.`)]
    });
}

// ==================== RENAME TICKET ====================
async function renameTicket(client, message, args) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    const newName = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (!newName || newName.length < 2) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Please provide a valid name!')]
        });
    }

    await message.channel.setName(newName);

    await message.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ Ticket renamed to **${newName}**!`)]
    });
}

// ==================== DELETE TICKET ====================
async function deleteTicket(client, message) {
    const ticketData = await client.db.tickets.get(message.channel.id);

    if (!ticketData) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ This is not a ticket channel!')]
        });
    }

    const config = await client.db.ticketConfig.get(message.guild.id) || {};

    // Generate transcript before deletion
    await generateTranscript(client, message.channel, ticketData);

    await message.channel.send({
        embeds: [
            client.embed(client.colors.error)
                .setDescription('🗑️ This ticket will be deleted in 5 seconds...')
        ]
    });

    // Log deletion
    await logTicketAction(client, config, 'deleted', ticketData, message.author);

    setTimeout(async () => {
        await message.channel.delete().catch(() => {});
        await client.db.tickets.delete(message.channel.id);
    }, 5000);
}

// ==================== LIST TICKETS ====================
async function listTickets(client, message, args) {
    const guildId = message.guild.id;
    const filter = args[0]?.toLowerCase() || 'open';

    const allTickets = await client.db.tickets.keys;
    const tickets = [];

    for (const key of allTickets) {
        const ticket = await client.db.tickets.get(key);
        if (ticket && ticket.guildId === guildId) {
            tickets.push(ticket);
        }
    }

    let filtered = tickets;

    if (filter === 'open') {
        filtered = tickets.filter(t => t.status === 'open');
    } else if (filter === 'closed') {
        filtered = tickets.filter(t => t.status === 'closed');
    } else if (filter !== 'all') {
        // Assume it's a user ID or mention
        const userId = filter.replace(/[<@!>]/g, '');
        filtered = tickets.filter(t => t.userId === userId);
    }

    if (filtered.length === 0) {
        return message.reply({
            embeds: [client.embed(client.colors.info).setDescription('📋 No tickets found with the specified filter.')]
        });
    }

    const embed = client.embed(client.colors.primary)
        .setAuthor({ name: '📋 Ticket List', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            filtered.slice(0, 15).map(t => {
                const statusEmoji = t.status === 'open' ? '🟢' : '🔴';
                const channel = message.guild.channels.cache.get(t.channelId);
                return `${statusEmoji} **#${t.number.toString().padStart(4, '0')}** - ${channel ? channel : 'Deleted'}\n` +
                    `   User: <@${t.userId}> | ${t.category}`;
            }).join('\n\n') +
            (filtered.length > 15 ? `\n\n*...and ${filtered.length - 15} more*` : '')
        )
        .setFooter({ text: `Total: ${filtered.length} tickets | Filter: ${filter}` });

    await message.reply({ embeds: [embed] });
}

// ==================== SET LOG CHANNEL ====================
async function setLogChannel(client, message, args) {
    const guildId = message.guild.id;
    const channel = message.mentions.channels.first() || 
        message.guild.channels.cache.get(args[0]);

    if (!channel) {
        return message.reply({
            embeds: [client.embed(client.colors.error).setDescription('❌ Please mention a valid channel!')]
        });
    }

    let config = await client.db.ticketConfig.get(guildId) || {};
    config.logChannelId = channel.id;
    await client.db.ticketConfig.set(guildId, config);

    await message.reply({
        embeds: [client.embed(client.colors.success).setDescription(`✅ Ticket log channel set to ${channel}!`)]
    });
}

// ==================== SHOW CONFIG ====================
async function showConfig(client, message) {
    const guildId = message.guild.id;
    const config = await client.db.ticketConfig.get(guildId) || {};

    const embed = client.embed(client.colors.info)
        .setAuthor({ name: '⚙️ Ticket Configuration', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `**Category:** ${config.categoryId ? `<#${config.categoryId}>` : '❌ Not set'}\n` +
            `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : '❌ Not set'}\n` +
            `**Support Role:** ${config.supportRoleId ? `<@&${config.supportRoleId}>` : '❌ Not set'}\n` +
            `**Total Tickets Created:** ${config.ticketCount || 0}\n` +
            `**Ticket Categories:** ${config.ticketCategories?.length || 0}\n\n` +
            (config.ticketCategories?.length > 0 
                ? `**Categories:**\n${config.ticketCategories.map(c => `• ${c.emoji} ${c.name}`).join('\n')}`
                : '*No categories configured*')
        )
        .setFooter({ text: 'NeroX Support Manager' });

    await message.reply({ embeds: [embed] });
}

// ==================== RESET CONFIG ====================
async function resetConfig(client, message) {
    const guildId = message.guild.id;

    const confirmEmbed = client.embed(client.colors.warning)
        .setAuthor({ name: '⚠️ Confirm Reset', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `Are you sure you want to reset all ticket configuration?\n\n` +
            `This will:\n` +
            `• Remove all ticket categories\n` +
            `• Reset ticket count\n` +
            `• Clear all settings\n\n` +
            `**This action cannot be undone!**`
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_reset_confirm')
            .setLabel('Yes, Reset')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('ticket_reset_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    const reply = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'This is not for you!', ephemeral: true });
        }

        if (i.customId === 'ticket_reset_confirm') {
            await client.db.ticketConfig.delete(guildId);
            await i.update({
                embeds: [client.embed(client.colors.success).setDescription('✅ Ticket configuration has been reset!')],
                components: []
            });
        } else {
            await i.update({
                embeds: [client.embed(client.colors.info).setDescription('❌ Reset cancelled.')],
                components: []
            });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            reply.edit({ components: [] }).catch(() => {});
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================
async function findUserOpenTicket(client, guildId, userId) {
    const allTickets = await client.db.tickets.keys;
    for (const key of allTickets) {
        const ticket = await client.db.tickets.get(key);
        if (ticket && ticket.guildId === guildId && ticket.userId === userId && ticket.status === 'open') {
            return ticket;
        }
    }
    return null;
}

async function logTicketAction(client, config, action, ticketData, user, reason = null, transcript = null) {
    if (!config.logChannelId) return;

    try {
        const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
        if (!logChannel) return;

        const colors = {
            created: '#00FF7F',
            closed: '#FFD93D',
            deleted: '#FF6B6B',
            reopened: '#6C63FF'
        };

        const embed = client.embed(colors[action] || client.colors.info)
            .setAuthor({
                name: `Ticket ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setDescription(
                `**Ticket:** #${ticketData.number.toString().padStart(4, '0')}\n` +
                `**User:** <@${ticketData.userId}> (${ticketData.userTag})\n` +
                `**Category:** ${ticketData.category}\n` +
                `**${action === 'created' ? 'Created' : 'Action'} by:** ${user.tag}\n` +
                (reason ? `**Reason:** ${reason}\n` : '') +
                (transcript ? `**Messages:** ${transcript.messageCount}\n` : '') +
                (ticketData.closedAt ? `**Duration:** ${formatDuration(ticketData.closedAt - ticketData.createdAt)}` : '')
            )
            .setFooter({ text: `Ticket ID: ${ticketData.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('[Ticket] Log error:', error);
    }
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

// Export functions for event handlers
export { createTicket, closeTicket, generateTranscript, logTicketAction, findUserOpenTicket };
