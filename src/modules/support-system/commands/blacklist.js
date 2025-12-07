/**
 * Blacklist Command - Support Server Manager
 * Manage blacklisted users
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { josh } from '../../core/utilities/josh.js';

export default {
    name: 'blacklist',
    aliases: ['bl', 'ban'],
    description: 'Manage blacklisted users',
    ownerOnly: true,
    cooldown: 3,

    async execute(client, message, args) {
        const action = args[0]?.toLowerCase();
        const blacklistDb = josh('blacklist');

        if (!action || !['add', 'remove', 'list', 'check'].includes(action)) {
            const embed = client.embed(client.colors.info)
                .setAuthor({
                    name: '🚫 Blacklist Management',
                    iconURL: client.user.displayAvatarURL()
                })
                .setDescription(
                    `Manage blacklisted users who cannot use the bot.\n\n` +
                    `**Commands:**\n` +
                    `\`${client.prefix}blacklist add <user> [reason]\` - Blacklist a user\n` +
                    `\`${client.prefix}blacklist remove <user>\` - Remove from blacklist\n` +
                    `\`${client.prefix}blacklist check <user>\` - Check if blacklisted\n` +
                    `\`${client.prefix}blacklist list\` - View all blacklisted users`
                )
                .setFooter({ text: 'NeroX Support Manager' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('bl_list')
                    .setLabel('View All')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );

            const reply = await message.reply({ embeds: [embed], components: [row] });

            const collector = reply.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'This is not for you!', ephemeral: true });
                }
                if (i.customId === 'bl_list') {
                    await i.deferUpdate();
                    await listBlacklist(client, message, blacklistDb, reply);
                }
            });
            collector.on('end', () => {
                reply.edit({ components: [] }).catch(() => {});
            });
            return;
        }

        switch (action) {
            case 'add':
                await addBlacklist(client, message, args.slice(1), blacklistDb);
                break;
            case 'remove':
                await removeBlacklist(client, message, args.slice(1), blacklistDb);
                break;
            case 'check':
                await checkBlacklist(client, message, args.slice(1), blacklistDb);
                break;
            case 'list':
                await listBlacklist(client, message, blacklistDb);
                break;
        }
    }
};

async function addBlacklist(client, message, args, db) {
    const target = message.mentions.users.first() || 
        await client.users.fetch(args[0]).catch(() => null);

    if (!target) {
        return message.reply({
            embeds: [
                client.embed(client.colors.error)
                    .setDescription('⚠️ Please mention a user or provide a valid ID.')
            ]
        });
    }

    if (client.owners.includes(target.id)) {
        return message.reply({
            embeds: [
                client.embed(client.colors.error)
                    .setDescription('❌ You cannot blacklist a bot owner!')
            ]
        });
    }

    const existing = await db.get(target.id);
    if (existing) {
        return message.reply({
            embeds: [
                client.embed(client.colors.warning)
                    .setDescription(`⚠️ **${target.tag}** is already blacklisted!`)
            ]
        });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await db.set(target.id, {
        reason: reason,
        blacklistedBy: message.author.id,
        blacklistedAt: Date.now()
    });

    const embed = client.embed(client.colors.error)
        .setAuthor({
            name: '🚫 User Blacklisted',
            iconURL: client.user.displayAvatarURL()
        })
        .setThumbnail(target.displayAvatarURL())
        .setDescription(
            `**${target.tag}** has been blacklisted!\n\n` +
            `**Reason:** ${reason}\n` +
            `**Blacklisted By:** ${message.author.tag}`
        )
        .setFooter({ text: 'NeroX Support Manager' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Try to DM the user
    try {
        await target.send({
            embeds: [
                client.embed(client.colors.error)
                    .setAuthor({
                        name: '🚫 You have been blacklisted',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(
                        `You have been blacklisted from using **NeroX**.\n\n` +
                        `**Reason:** ${reason}\n\n` +
                        `If you believe this is a mistake, please contact support.`
                    )
                    .setFooter({ text: 'NeroX Studios' })
            ]
        });
    } catch (error) {
        // User has DMs disabled
    }
}

async function removeBlacklist(client, message, args, db) {
    const target = message.mentions.users.first() || 
        await client.users.fetch(args[0]).catch(() => null);

    if (!target) {
        return message.reply({
            embeds: [
                client.embed(client.colors.error)
                    .setDescription('⚠️ Please mention a user or provide a valid ID.')
            ]
        });
    }

    const existing = await db.get(target.id);
    if (!existing) {
        return message.reply({
            embeds: [
                client.embed(client.colors.warning)
                    .setDescription(`⚠️ **${target.tag}** is not blacklisted.`)
            ]
        });
    }

    await db.delete(target.id);

    await message.reply({
        embeds: [
            client.embed(client.colors.success)
                .setDescription(`✅ Removed **${target.tag}** from the blacklist.`)
        ]
    });

    // Try to DM the user
    try {
        await target.send({
            embeds: [
                client.embed(client.colors.success)
                    .setAuthor({
                        name: '✅ Blacklist Removed',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(
                        `You have been removed from the **NeroX** blacklist!\n\n` +
                        `You can now use the bot again. Welcome back! 💕`
                    )
                    .setFooter({ text: 'NeroX Studios' })
            ]
        });
    } catch (error) {
        // User has DMs disabled
    }
}

async function checkBlacklist(client, message, args, db) {
    const target = message.mentions.users.first() || 
        await client.users.fetch(args[0]).catch(() => null);

    if (!target) {
        return message.reply({
            embeds: [
                client.embed(client.colors.error)
                    .setDescription('⚠️ Please mention a user or provide a valid ID.')
            ]
        });
    }

    const data = await db.get(target.id);

    if (!data) {
        return message.reply({
            embeds: [
                client.embed(client.colors.success)
                    .setThumbnail(target.displayAvatarURL())
                    .setDescription(
                        `**${target.tag}** is not blacklisted! ✅`
                    )
            ]
        });
    }

    const blacklistedBy = await client.users.fetch(data.blacklistedBy).catch(() => null);

    const embed = client.embed(client.colors.error)
        .setAuthor({
            name: '🚫 Blacklist Status',
            iconURL: target.displayAvatarURL()
        })
        .setThumbnail(target.displayAvatarURL())
        .setDescription(
            `**User:** ${target.tag}\n` +
            `**ID:** \`${target.id}\`\n\n` +
            `**Status:** Blacklisted ❌\n` +
            `**Reason:** ${data.reason || 'No reason'}\n` +
            `**Blacklisted By:** ${blacklistedBy?.tag || data.blacklistedBy}\n` +
            `**Blacklisted At:** <t:${Math.floor(data.blacklistedAt / 1000)}:R>`
        )
        .setFooter({ text: 'NeroX Support Manager' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function listBlacklist(client, message, db, editMsg = null) {
    const keys = await db.keys;

    if (keys.length === 0) {
        const embed = client.embed(client.colors.info)
            .setDescription('📋 No users are blacklisted.');
        if (editMsg) {
            return editMsg.edit({ embeds: [embed], components: [] });
        }
        return message.reply({ embeds: [embed] });
    }

    const users = [];
    for (const id of keys) {
        const data = await db.get(id);
        const user = await client.users.fetch(id).catch(() => null);
        if (user) {
            users.push(`🚫 **${user.tag}** - ${data?.reason || 'No reason'}`);
        } else {
            users.push(`🚫 \`${id}\` - ${data?.reason || 'No reason'}`);
        }
    }

    const embed = client.embed(client.colors.error)
        .setAuthor({
            name: '🚫 Blacklisted Users',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            users.slice(0, 20).join('\n') +
            (users.length > 20 ? `\n\n*... and ${users.length - 20} more*` : '') +
            `\n\n*Total: ${users.length} user(s)*`
        )
        .setFooter({ text: 'NeroX Support Manager' })
        .setTimestamp();

    if (editMsg) {
        return editMsg.edit({ embeds: [embed], components: [] });
    }
    return message.reply({ embeds: [embed] });
}
