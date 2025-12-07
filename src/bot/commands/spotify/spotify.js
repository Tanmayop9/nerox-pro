import { Command } from '../../bot/structures/abstract/command.js';
import { getPrefix } from '../../lib/utils/getPrefix.js';

export default class Spotify extends Command {
    constructor() {
        super(...arguments);
        this.description = 'Spotify integration commands';
        this.usage = '<login|profile|playlist|logout|searchplaylist> [args]';
        this.options = [
            {
                name: 'action',
                opType: 'string',
                description: 'Spotify action to perform',
                required: true,
                choices: [
                    { name: 'login', value: 'login' },
                    { name: 'profile', value: 'profile' },
                    { name: 'playlist', value: 'playlist' },
                    { name: 'logout', value: 'logout' },
                    { name: 'searchplaylist', value: 'searchplaylist' },
                ],
            },
            {
                name: 'url',
                opType: 'string',
                description: 'Spotify profile URL (for login)',
                required: false,
            },
            {
                name: 'query',
                opType: 'string',
                description: 'Search query (for searchplaylist)',
                required: false,
            },
        ];
    }

    execute = async (client, ctx, args) => {
        if (!args.length) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.info} **Spotify Commands**\n\n` +
                            `${client.emoji.info1} **login <profile_url>** - Link your Spotify profile\n` +
                            `${client.emoji.info1} **profile** - View your linked Spotify profile\n` +
                            `${client.emoji.info1} **playlist** - View your Spotify playlists\n` +
                            `${client.emoji.info1} **logout** - Unlink your Spotify profile\n` +
                            `${client.emoji.info1} **searchplaylist <query>** - Search for Spotify playlists`
                        ),
                ],
            });
            return;
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'login':
                await this.handleLogin(client, ctx, args.slice(1));
                break;
            case 'profile':
                await this.handleProfile(client, ctx);
                break;
            case 'playlist':
                await this.handlePlaylist(client, ctx);
                break;
            case 'logout':
                await this.handleLogout(client, ctx);
                break;
            case 'searchplaylist':
                await this.handleSearchPlaylist(client, ctx, args.slice(1));
                break;
            default:
                const prefix = await getPrefix(client, ctx.guild.id);
                await ctx.reply({
                    embeds: [
                        client
                            .embed()
                            .desc(`${client.emoji.cross} Invalid action. Use \`${prefix}spotify\` to see available commands.`),
                    ],
                });
        }
    };

    handleLogin = async (client, ctx, args) => {
        const prefix = await getPrefix(client, ctx.guild.id);
        if (!args.length) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} Please provide your Spotify profile URL!\n\n` +
                            `${client.emoji.info1} **Example:** \`${prefix}spotify login https://open.spotify.com/user/username\``
                        ),
                ],
            });
            return;
        }

        const profileUrl = args[0];
        
        // Validate Spotify URL format
        const spotifyUrlRegex = /^https?:\/\/(open\.)?spotify\.com\/user\/[\w-]+/;
        if (!spotifyUrlRegex.test(profileUrl)) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} Invalid Spotify profile URL!\n\n` +
                            `${client.emoji.info1} **Format:** \`https://open.spotify.com/user/username\``
                        ),
                ],
            });
            return;
        }

        // Extract username from URL
        const username = profileUrl.match(/\/user\/([\w-]+)/)?.[1];
        
        await client.db.spotify.set(ctx.author.id, {
            profileUrl: profileUrl,
            username: username,
            linkedAt: Date.now(),
        });

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .desc(
                        `${client.emoji.check} **Spotify Account Linked!**\n\n` +
                        `${client.emoji.info} **Username:** ${username}\n` +
                        `${client.emoji.info} **Profile:** [Click Here](${profileUrl})\n\n` +
                        `${client.emoji.info1} Use \`${prefix}spotify profile\` to view your profile!`
                    ),
            ],
        });
    };

    handleProfile = async (client, ctx) => {
        const prefix = await getPrefix(client, ctx.guild.id);
        const spotifyData = await client.db.spotify.get(ctx.author.id);
        
        if (!spotifyData) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} You haven't linked your Spotify account yet!\n\n` +
                            `${client.emoji.info1} Use \`${prefix}spotify login <profile_url>\` to link your account.`
                        ),
                ],
            });
            return;
        }

        const linkedDate = new Date(spotifyData.linkedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .setTitle(`${ctx.author.username}'s Spotify Profile`)
                    .desc(
                        `${client.emoji.info} **Username:** ${spotifyData.username}\n` +
                        `${client.emoji.info} **Profile:** [Click Here](${spotifyData.profileUrl})\n` +
                        `${client.emoji.info} **Linked Since:** ${linkedDate}`
                    )
                    .setThumbnail(ctx.author.displayAvatarURL({ dynamic: true })),
            ],
        });
    };

    handlePlaylist = async (client, ctx) => {
        const prefix = await getPrefix(client, ctx.guild.id);
        const spotifyData = await client.db.spotify.get(ctx.author.id);
        
        if (!spotifyData) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} You haven't linked your Spotify account yet!\n\n` +
                            `${client.emoji.info1} Use \`${prefix}spotify login <profile_url>\` to link your account.`
                        ),
                ],
            });
            return;
        }

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .desc(
                        `${client.emoji.check} **Your Spotify Playlists**\n\n` +
                        `${client.emoji.info} Visit your profile to view all playlists:\n` +
                        `${client.emoji.info1} [Click Here](${spotifyData.profileUrl})\n\n` +
                        `${client.emoji.info} You can also search for public playlists using:\n` +
                        `${client.emoji.info1} \`${prefix}spotify searchplaylist <query>\``
                    ),
            ],
        });
    };

    handleLogout = async (client, ctx) => {
        const spotifyData = await client.db.spotify.get(ctx.author.id);
        
        if (!spotifyData) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(`${client.emoji.cross} You don't have a linked Spotify account!`),
                ],
            });
            return;
        }

        await client.db.spotify.delete(ctx.author.id);

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .desc(
                        `${client.emoji.check} **Spotify Account Unlinked!**\n\n` +
                        `${client.emoji.info} Your Spotify profile has been disconnected successfully.`
                    ),
            ],
        });
    };

    handleSearchPlaylist = async (client, ctx, args) => {
        const prefix = await getPrefix(client, ctx.guild.id);
        if (!args.length) {
            await ctx.reply({
                embeds: [
                    client
                        .embed()
                        .desc(
                            `${client.emoji.cross} Please provide a search query!\n\n` +
                            `${client.emoji.info1} **Example:** \`${prefix}spotify searchplaylist chill vibes\``
                        ),
                ],
            });
            return;
        }

        const query = args.join(' ');
        const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}/playlists`;

        await ctx.reply({
            embeds: [
                client
                    .embed()
                    .desc(
                        `${client.emoji.check} **Searching for:** "${query}"\n\n` +
                        `${client.emoji.info} [Click Here to View Results](${searchUrl})\n\n` +
                        `${client.emoji.info1} You can play any Spotify playlist using:\n` +
                        `${client.emoji.info1} \`${prefix}play <spotify_playlist_url>\``
                    ),
            ],
        });
    };
}
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
