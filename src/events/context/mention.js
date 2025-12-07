import { limited } from '../../utils/ratelimiter.js';
const event = 'mention';
export default class Mention {
    constructor() {
        this.name = event;
        this.execute = async (client, ctx) => {
            if (limited(ctx.author.id))
                return void client.emit('blUser', ctx);
            
            // Get guild-specific prefix if it exists
            const guildPrefix = await client.db.prefix.get(ctx.guild.id);
            const prefix = guildPrefix || client.prefix;
            
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(`${client.emoji.info} Prefix: \`${prefix}\`\n` +
                        `${client.emoji.info} Use \`${prefix}help\``),
                ],
            });
        };
    }
}
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
