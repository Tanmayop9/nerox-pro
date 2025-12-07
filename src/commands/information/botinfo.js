import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import os from 'os';
import moment from 'moment';
import { Command } from '../../classes/abstract/command.js';
import { filter } from '../../utils/filter.js';

export default class BotInfo extends Command {
	constructor() {
		super(...arguments);
		this.description = 'Peek behind the scenes of the bot\'s core.';
	}

	async execute(client, ctx) {
		const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
		const uptime = moment.duration(client.uptime).humanize();
		const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
		const cpuModel = os.cpus()[0].model;
		const nodeVersion = process.version;
		const platform = os.platform();
		const architecture = os.arch();
		const ping = client.ws.ping;
		const totalGuilds = client.guilds.cache.size;
		const totalChannels = client.channels.cache.size;
		const commandsCount = client.commands.size;
		const activePlayers = client.manager?.players?.size || 0;
		const shardCount = client.options.shardCount || 1;

		const embed = client.embed()
			.desc(
				`${client.emoji.info} Servers: **${totalGuilds.toLocaleString()}**\n` +
				`${client.emoji.info} Users: **${totalUsers.toLocaleString()}**\n` +
				`${client.emoji.info} Shards: **${shardCount}**\n` +
				`${client.emoji.info} Players: **${activePlayers}**\n` +
				`${client.emoji.info} Uptime: **${uptime}**\n` +
				`${client.emoji.info} Ping: **${ping}ms**`
			);

		const menu = new StringSelectMenuBuilder()
			.setCustomId('botinfo')
			.setPlaceholder('Select section')
			.setMaxValues(1)
			.addOptions([
				{
					label: 'Overview',
					value: 'overview',
					description: 'Main info',
				},
				{
					label: 'System',
					value: 'system',
					description: 'Technical info',
				},
				{
					label: 'Developer',
					value: 'developer',
					description: 'Creator info',
				},
				{
					label: 'Stats',
					value: 'stats',
					description: 'Statistics',
				},
			]);

		const msg = await ctx.reply({
			embeds: [embed],
			components: [new ActionRowBuilder().addComponents(menu)],
		});

		const collector = msg.createMessageComponentCollector({
			idle: 30000,
			filter: i => filter(i, ctx),
		});

		collector.on('collect', async interaction => {
			await interaction.deferUpdate();
			const choice = interaction.values[0];

			let updatedEmbed;

			if (choice === 'overview') {
				updatedEmbed = client.embed()
					.desc(
						`${client.emoji.info} Servers: **${totalGuilds.toLocaleString()}**\n` +
						`${client.emoji.info} Users: **${totalUsers.toLocaleString()}**\n` +
						`${client.emoji.info} Shards: **${shardCount}**\n` +
						`${client.emoji.info} Players: **${activePlayers}**\n` +
						`${client.emoji.info} Uptime: **${uptime}**\n` +
						`${client.emoji.info} Ping: **${ping}ms**\n` +
						`${client.emoji.info} Prefix: \`${client.prefix}\`\n` +
						`${client.emoji.info} Channels: **${totalChannels.toLocaleString()}**`
					);
			} else if (choice === 'system') {
				updatedEmbed = client.embed()
					.desc(
						`${client.emoji.info} CPU: **${cpuModel}**\n` +
						`${client.emoji.info} Memory: **${memoryUsage} MB**\n` +
						`${client.emoji.info} Platform: **${platform}**\n` +
						`${client.emoji.info} Architecture: **${architecture}**\n` +
						`${client.emoji.info} Node.js: **${nodeVersion}**`
					);
			} else if (choice === 'developer') {
				updatedEmbed = client.embed()
					.desc(
						`${client.emoji.info} Team: **NeroX Studios**\n` +
						`${client.emoji.info} Version: **1.0.0**\n` +
						`${client.emoji.info} Framework: **Discord.js v14**\n` +
						`${client.emoji.info} Database: **MongoDB**\n` +
						`${client.emoji.info} **[Support](https://discord.gg/duM4dkbz9N)**`
					);
			} else if (choice === 'stats') {
				updatedEmbed = client.embed()
					.desc(
						`${client.emoji.info} Commands: **${commandsCount}**\n` +
						`${client.emoji.info} Shard: **0/${shardCount}**\n` +
						`${client.emoji.info} Latency: **${ping}ms**\n` +
						`${client.emoji.info} Cache: **${client.users.cache.size}** users\n` +
						`${client.emoji.info} Active: **${activePlayers}** players`
					);
			}

			await msg.edit({ embeds: [updatedEmbed] });
		});

		collector.on('end', async () => {
			await msg.edit({ components: [] }).catch(() => null);
		});
	}
}
