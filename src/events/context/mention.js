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
                        .desc(`Yo ${ctx.author}, welcome to your ultimate bot experience.\n\n` +
      `My prefix for this server is **\`${prefix}\`** – stay ahead, stay smooth.\n` +
      `What's the move today? Let's make it iconic.\n\n` +
      `Hit **\`${prefix}help\`** and let's roll.`),
                ],
            });
        };
    }
}
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
