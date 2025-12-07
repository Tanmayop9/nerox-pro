/**
 * Ready Event - Support Server Manager
 * Handles bot startup, giveaway management, and Lavalink stats
 */

import axios from 'axios';
import { endGiveaway } from '../lib/utils/giveawayUtils.js';

// Lavalink configs
const LAVALINK_HOST = process.env.LAVALINK_HOST || '98.83.6.213';
const LAVALINK_PORT = process.env.LAVALINK_PORT || '25570';
const LAVALINK_PASSWORD = process.env.LAVALINK_PASSWORD || 'Atom1';
const LAVALINK_STATS_CHANNEL = process.env.LAVALINK_STATS_CHANNEL || '292929';

export default {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`\n╔═══════════════════════════════════════════════════════╗`);
        console.log(`║          🤖 SUPPORT MANAGER BOT ONLINE 🤖            ║`);
        console.log(`╠═══════════════════════════════════════════════════════╣`);
        console.log(`║  Bot Tag: ${client.user.tag.padEnd(43)}║`);
        console.log(`║  Bot ID: ${client.user.id.padEnd(44)}║`);
        console.log(`║  Support Guild: ${(client.supportGuild || 'Not configured').padEnd(36)}║`);
        console.log(`║  Prefix: ${client.prefix.padEnd(46)}║`);
        console.log(`║  Servers: ${String(client.guilds.cache.size).padEnd(45)}║`);
        console.log(`║  Commands: ${String(client.commands.size).padEnd(44)}║`);
        console.log(`║  Status: Ready & Listening ✅                        ║`);
        console.log(`╚═══════════════════════════════════════════════════════╝\n`);

        // Set bot status
        client.user.setPresence({
            activities: [
                { name: 'NeroX Support', type: 3 }
            ],
            status: 'online',
        });

        // Giveaway timeouts map
        client.giveawayTimeouts = new Map();

        // Process any giveaways that expired while offline
        await processExpiredGiveaways(client);

        // Start periodic giveaway check (every 30 seconds)
        setInterval(() => checkActiveGiveaways(client), 30000);
        console.log('[Giveaway] Periodic check system started (30s interval)');

        // Start Lavalink stats (5s after startup, then every 1hr)
        setTimeout(() => sendLavalinkStats(client), 5000);
        setInterval(() => sendLavalinkStats(client), 3600000);
        console.log('[Lavalink] Stats update system started (1 hour interval)');
    }
};

// ==================== GIVEAWAY PERIODIC CHECKING ====================
async function checkActiveGiveaways(client) {
    try {
        const giveawayKeys = await client.db.giveaways.keys;
        for (const giveawayId of giveawayKeys) {
            try {
                const giveaway = await client.db.giveaways.get(giveawayId);
                if (!giveaway || giveaway.ended) continue;
                if (Date.now() >= giveaway.endsAt) {
                    await endGiveaway(client, giveawayId, giveaway);
                }
            } catch (err) {
                console.error(`[Giveaway] Error checking ${giveawayId}:`, err);
            }
        }
    } catch (error) {
        console.error('[Giveaway] Error in periodic check:', error);
    }
}

// ==================== GIVEAWAY PROCESS ON STARTUP ====================
async function processExpiredGiveaways(client) {
    try {
        const giveawayKeys = await client.db.giveaways.keys;
        let processed = 0;
        let active = 0;
        for (const giveawayId of giveawayKeys) {
            try {
                const giveaway = await client.db.giveaways.get(giveawayId);
                if (!giveaway || giveaway.ended) continue;
                if (Date.now() >= giveaway.endsAt) {
                    await endGiveaway(client, giveawayId, giveaway);
                    processed++;
                } else {
                    active++;
                }
            } catch (err) {
                console.error(`[Giveaway] Error processing ${giveawayId}:`, err);
            }
        }
        if (processed > 0 || active > 0) {
            console.log(`[Giveaway] Startup: ${processed} ended, ${active} active giveaways`);
        }
    } catch (error) {
        console.error('[Giveaway] Error processing expired giveaways:', error);
    }
}

// ==================== LAVALINK STATS ====================
async function sendLavalinkStats(client) {
    try {
        const channel = await client.channels.fetch(LAVALINK_STATS_CHANNEL).catch(() => null);
        if (!channel) {
            console.log('[Lavalink] Stats channel not found');
            return;
        }

        // Delete old stats messages
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (messages) {
            const toDelete = messages.filter(msg => {
                if (msg.author.id !== client.user.id) return true;
                const embed = msg.embeds[0];
                if (!embed) return true;
                return !embed.author?.name?.includes('Lavalink Stats');
            });
            if (toDelete.size > 0) {
                await channel.bulkDelete(toDelete, true).catch(async () => {
                    const msgs = [...toDelete.values()].slice(0, 10);
                    for (const msg of msgs) {
                        await msg.delete().catch(() => {});
                        await new Promise(r => setTimeout(r, 500));
                    }
                });
            }
        }

        // Fetch Lavalink stats
        const lavalinkStats = await fetchLavalinkStats();
        const statsEmbed = createLavalinkEmbed(client, lavalinkStats);

        // Edit existing stats message, if present
        const existingStats = messages?.find(msg => {
            if (msg.author.id !== client.user.id) return false;
            const embed = msg.embeds[0];
            return embed?.author?.name?.includes('Lavalink Stats');
        });
        if (existingStats) {
            await existingStats.edit({ embeds: [statsEmbed] }).catch(() => {
                channel.send({ embeds: [statsEmbed] });
            });
        } else {
            await channel.send({ embeds: [statsEmbed] });
        }
        console.log('[Lavalink] Stats updated successfully');
    } catch (error) {
        console.error('[Lavalink] Error sending stats:', error);
    }
}

async function fetchLavalinkStats() {
    try {
        const protocol = process.env.LAVALINK_SECURE === 'true' ? 'https' : 'http';
        const response = await axios.get(`${protocol}://${LAVALINK_HOST}:${LAVALINK_PORT}/v4/stats`, {
            headers: { 'Authorization': LAVALINK_PASSWORD },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error('[Lavalink] Failed to fetch stats:', error.message);
        return null;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMs(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function createLavalinkEmbed(client, stats) {
    if (!stats) {
        return client.embed()
            .setAuthor({
                name: 'Lavalink Stats',
                iconURL: client.user.displayAvatarURL()
            })
            .setDescription(
                `**Node:** ${LAVALINK_HOST}:${LAVALINK_PORT}\n` +
                `**Status:** Offline / Unreachable\n\n` +
                `Unable to fetch Lavalink statistics.\n` +
                `The node may be down or restarting.\n\n` +
                `*Last checked: <t:${Math.floor(Date.now() / 1000)}:R>*`
            )
            .setFooter({ text: 'Auto-updates every hour' })
            .setTimestamp();
    }

    const { players, playingPlayers, uptime, memory, cpu, frameStats } = stats;
    return client.embed(client.colors.primary)
        .setAuthor({
            name: 'Lavalink Stats',
            iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
            `<:neroxinfo:1446475383481303052> **Node Info**\n` +
            `Host: \`Nerox-Temp\`\n` +
            `Status: Online\n` +
            `Uptime: ${formatMs(uptime)}\n\n` +
            `<:neroxinfo:1446475383481303052> **Players**\n` +
            `Total: ${players}\n` +
            `Playing: ${playingPlayers}\n\n` +
            `<:neroxinfo:1446475383481303052> **Memory**\n` +
            `Used: ${formatBytes(memory.used)}\n` +
            `Free: ${formatBytes(memory.free)}\n` +
            `Allocated: ${formatBytes(memory.allocated)}\n` +
            `Reservable: ${formatBytes(memory.reservable)}\n\n` +
            `<:neroxinfo:1446475383481303052> **CPU**\n` +
            `Cores: ${cpu.cores}\n` +
            `System Load: ${(cpu.systemLoad * 100).toFixed(2)}%\n` +
            `Lavalink Load: ${(cpu.lavalinkLoad * 100).toFixed(2)}%\n` +
            (frameStats ? `\n**Frame Stats**\n` +
            `Sent: ${frameStats.sent}\n` +
            `Nulled: ${frameStats.nulled}\n` +
            `Deficit: ${frameStats.deficit}\n` : '') +
            `\n*Last updated: <t:${Math.floor(Date.now() / 1000)}:R>*`
        )
        .setFooter({ text: 'Auto-updates every hour' })
        .setTimestamp();
}