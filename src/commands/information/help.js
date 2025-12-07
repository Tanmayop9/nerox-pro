import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { filter } from '../../utils/filter.js';
import { Command } from '../../classes/abstract/command.js';

export default class Help extends Command {
	constructor() {
		super(...arguments);
		this.aliases = ['h'];
		this.description = 'Displays the command list.';
	}

	async execute(client, ctx) {
		const allCommands = client.commands.reduce((acc, cmd) => {
			if (['owner', 'mod', 'debug'].includes(cmd.category)) return acc;
			acc[cmd.category] ||= [];
			acc[cmd.category].push({
				name: cmd.name,
				description: cmd.description?.length > 30 
					? cmd.description.substring(0, 27) + '...' 
					: cmd.description || 'No description',
			});
			return acc;
		}, {});

		const categories = client.categories
			.sort((b, a) => b.length - a.length)
			.filter(category => !['owner', 'mod', 'debug'].includes(category));

		const totalCommands = client.commands.filter(cmd => !['owner', 'mod', 'debug'].includes(cmd.category)).size;

		const embed = client.embed()
			.desc(
				`${client.emoji.info} Prefix: \`${client.prefix}\`\n` +
				`${client.emoji.info} Commands: \`${totalCommands}\`\n\n` +
				`\`<>\` = required | \`[]\` = optional`
			);

		const menu = new StringSelectMenuBuilder()
			.setCustomId('menu')
			.setPlaceholder('Select a category')
			.setMaxValues(1)
			.addOptions([
				{
					label: 'Home',
					value: 'home',
					description: 'Main menu',
				},
				...categories.map(category => ({
					label: category.charAt(0).toUpperCase() + category.slice(1),
					value: category,
					description: `${allCommands[category]?.length || 0} commands`,
				})),
				{
					label: 'All Commands',
					value: 'all',
					description: 'View all commands',
				},
			]);

		const reply = await ctx.reply({
			embeds: [embed],
			components: [new ActionRowBuilder().addComponents(menu)],
		});

		const collector = reply.createMessageComponentCollector({
			idle: 60000,
			filter: i => filter(i, ctx),
		});

		collector.on('collect', async interaction => {
			await interaction.deferUpdate();
			const selected = interaction.values[0];

			switch (selected) {
				case 'home':
					await reply.edit({ embeds: [embed] });
					break;

				case 'all':
					const allEmbed = client.embed()
						.desc(
							Object.entries(allCommands)
								.sort((a, b) => a[0].localeCompare(b[0]))
								.map(([cat, cmds]) =>
									`**${cat.charAt(0).toUpperCase() + cat.slice(1)}**\n` +
									`${cmds.map(cmd => `\`${cmd.name}\``).join(' ')}`
								).join('\n\n')
						);
					await reply.edit({ embeds: [allEmbed] });
					break;

				default:
					const selectedCommands = allCommands[selected] || [];
					const categoryEmbed = client.embed()
						.desc(
							selectedCommands.length
								? selectedCommands.map(cmd =>
									`\`${client.prefix}${cmd.name}\` - ${cmd.description}`
								  ).join('\n')
								: 'No commands'
						);

					await reply.edit({ embeds: [categoryEmbed] });
					break;
			}
		});

		collector.on('end', async () => {
			menu.setDisabled(true);
			await reply.edit({ 
				components: [new ActionRowBuilder().addComponents(menu)] 
			}).catch(() => null);
		});
	}
}
