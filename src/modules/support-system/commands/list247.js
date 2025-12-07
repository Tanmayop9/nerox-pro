/**
 * List 24/7 Command - Support Server Manager
 * Lists all guilds with 24/7 mode enabled from main bot
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { josh } from '../../core/utilities/josh.js';

export default {
    name: 'list247',
    aliases: ['247list', 'tfs', 'twentyfourseven'],
    description: 'List all guilds with 24/7 mode enabled',
    ownerOnly: true,
    cooldown: 5,

    async execute(client, message, args) {
        // Access the main bot's 24/7 database
        const twoFourSevenDb = josh('twoFourSeven');
        
        try {
            const keys = await twoFourSevenDb.keys;
            
            if (keys.length === 0) {
                return message.reply({
                    embeds: [
                        client.embed(client.colors.info)
                            .setAuthor({
                                name: '🌙 24/7 Mode - Active Guilds',
                                iconURL: client.user.displayAvatarURL()
                            })
                            .setDescription('No guilds have 24/7 mode enabled.')
                    ]
                });
            }

            const guildsData = [];
            for (const guildId of keys) {
                const data = await twoFourSevenDb.get(guildId);
                if (data) {
                    guildsData.push({
                        id: guildId,
                        textId: data.textId,
                        voiceId: data.voiceId
                    });
                }
            }

            const perPage = 10;
            const totalPages = Math.ceil(guildsData.length / perPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * perPage;
                const end = start + perPage;
                const pageData = guildsData.slice(start, end);

                return client.embed(client.colors.primary)
                    .setAuthor({
                        name: '🌙 24/7 Mode - Active Guilds',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(
                        pageData.map((g, i) => 
                            `**${start + i + 1}.** \`${g.id}\`\n` +
                            `   📝 Text: \`${g.textId}\` | 🔊 Voice: \`${g.voiceId}\``
                        ).join('\n\n')
                    )
                    .setFooter({ 
                        text: `Page ${page + 1}/${totalPages} • Total: ${guildsData.length} guild(s)` 
                    })
                    .setTimestamp();
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('247_first')
                        .setLabel('≪')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('247_prev')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('247_page')
                        .setLabel(`${page + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('247_next')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('247_last')
                        .setLabel('≫')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );
            };

            const reply = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: totalPages > 1 ? [generateButtons(currentPage)] : []
            });

            if (totalPages > 1) {
                const collector = reply.createMessageComponentCollector({ time: 120000 });
                
                collector.on('collect', async i => {
                    if (i.user.id !== message.author.id) {
                        return i.reply({ content: 'This is not for you!', ephemeral: true });
                    }

                    switch (i.customId) {
                        case '247_first': currentPage = 0; break;
                        case '247_prev': currentPage = Math.max(0, currentPage - 1); break;
                        case '247_next': currentPage = Math.min(totalPages - 1, currentPage + 1); break;
                        case '247_last': currentPage = totalPages - 1; break;
                    }

                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [generateButtons(currentPage)]
                    });
                });

                collector.on('end', () => {
                    reply.edit({ components: [] }).catch(() => {});
                });
            }

        } catch (error) {
            console.error('[List247] Error:', error);
            return message.reply({
                embeds: [
                    client.embed(client.colors.error)
                        .setDescription(`❌ Error fetching 24/7 data: ${error.message}`)
                ]
            });
        }
    }
};
