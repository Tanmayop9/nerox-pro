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
                        .setAuthor({
                            name: `Invite ${client.user.username}`,
                            iconURL: client.user.displayAvatarURL()
                        })
                        .desc(
                            `Add me to your server using one of the links below.\n\n` +
                            `**Recommended:** Basic permissions required for music playback.\n` +
                            `**Administrator:** Full permissions for all features.`
                        )
                        .footer({ 
                            text: `${client.guilds.cache.size} servers`,
                            iconURL: ctx.author.displayAvatarURL()
                        })
                ],
                components: [
                    new ActionRowBuilder().addComponents([
                        client.button().link('Invite (Basic)', client.invite.required()),
                        client.button().link('Invite (Admin)', client.invite.admin()),
                    ]),
                ],
            });
        };
    }
}
