import { ActionRowBuilder } from 'discord.js';
import { Command } from '../../classes/abstract/command.js';

export default class Invite extends Command {
    constructor() {
        super(...arguments);
        this.aliases = ['inv'];
        this.description = 'Bot invite link';
        this.execute = async (client, ctx) => {
            await ctx.reply({
                embeds: [
                    client.embed()
                        .desc(
                            `${client.emoji.info} Invite ${client.user.username}\n\n` +
                            `Basic: Music permissions\n` +
                            `Admin: All features`
                        )
                ],
                components: [
                    new ActionRowBuilder().addComponents([
                        client.button().link('Basic', client.invite.required()),
                        client.button().link('Admin', client.invite.admin()),
                    ]),
                ],
            });
        };
    }
}
