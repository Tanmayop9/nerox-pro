import { Command } from '../../classes/abstract/command.js';

export default class ClearLikes extends Command {
    constructor() {
        super(...arguments);
        this.aliases = ['clearliked', 'cl'];
        this.description = 'Clear all your liked songs';
    }

    execute = async (client, ctx) => {
        const likedSongs = (await client.db.likedSongs.get(ctx.author.id)) || [];

        if (likedSongs.length === 0) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} **No Liked Songs!**\n\n` +
                            `${client.emoji.info1} You don't have any liked songs to clear!`
                        ),
                ],
            });
            return;
        }

        const count = likedSongs.length;

        await client.db.likedSongs.delete(ctx.author.id);

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .desc(
                        `${client.emoji.check} **Liked Songs Cleared!**\n\n` +
                        `${client.emoji.info} Successfully removed **${count}** songs from your liked songs!\n\n` +
                        `${client.emoji.info1} Use \`${client.prefix}like\` to start building your collection again!`
                    ),
            ],
        });
    };
}
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
