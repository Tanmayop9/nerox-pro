import { Command } from '../../bot/structures/abstract/command.js';

export default class SearchEngine extends Command {
    constructor() {
        super(...arguments);
        this.aliases = ['se', 'engine', 'searchprovider'];
        this.usage = '[engine]';
        this.description = 'Set your preferred search engine (Premium Only)';
        this.options = [
            {
                name: 'engine',
                opType: 'string',
                description: 'Select search engine',
                required: false,
                choices: [
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'YouTube Music', value: 'youtubemusic' },
                    { name: 'Spotify', value: 'spotify' },
                    { name: 'SoundCloud', value: 'soundcloud' },
                    { name: 'Apple Music', value: 'applemusic' },
                    { name: 'Deezer', value: 'deezer' },
                ],
            },
        ];
        this.execute = async (client, ctx, args) => {
            const { prem, check, cross, info } = client.emoji;
            
            // Check if user is premium
            const isPremium = await client.db.botstaff.get(ctx.author.id);
            
            if (!isPremium) {
                return ctx.reply({
                    embeds: [
                        client.embed()
                            .desc(`${cross} This is a **premium-only** feature!\n\n${prem} Upgrade to premium to customize your search engine and unlock exclusive features.`)
                            .setColor('#FFD700')
                    ]
                });
            }
            
            // If no engine specified, show current setting
            if (!args.length) {
                const userPrefs = await client.db.userPreferences.get(ctx.author.id) || {};
                const currentEngine = userPrefs.searchEngine || 'youtube';
                
                const engineEmojis = {
                    youtube: '🎥',
                    youtubemusic: '🎵',
                    spotify: '🎧',
                    soundcloud: '☁️',
                    applemusic: '🍎',
                    deezer: '🎶'
                };
                
                const engineNames = {
                    youtube: 'YouTube',
                    youtubemusic: 'YouTube Music',
                    spotify: 'Spotify',
                    soundcloud: 'SoundCloud',
                    applemusic: 'Apple Music',
                    deezer: 'Deezer'
                };
                
                const allEngines = Object.keys(engineEmojis)
                    .map(eng => {
                        const isActive = eng === currentEngine;
                        return `${isActive ? check : '➤'} ${engineEmojis[eng]} **${engineNames[eng]}**${isActive ? ' *(Active)*' : ''}`;
                    })
                    .join('\n');
                
                return ctx.reply({
                    embeds: [
                        client.embed()
                            .setTitle(`${prem} Search Engine Settings`)
                            .desc(`**Current Engine:** ${engineEmojis[currentEngine]} ${engineNames[currentEngine]}\n\n**Available Engines:**\n${allEngines}\n\n${info} Use \`searchengine <engine>\` to change your default search engine.`)
                            .setColor('#FFD700')
                    ]
                });
            }
            
            // Validate engine
            const validEngines = ['youtube', 'youtubemusic', 'spotify', 'soundcloud', 'applemusic', 'deezer'];
            const engine = args[0].toLowerCase();
            
            if (!validEngines.includes(engine)) {
                return ctx.reply({
                    embeds: [
                        client.embed()
                            .desc(`${cross} Invalid search engine!\n\n**Valid options:** youtube, youtubemusic, spotify, soundcloud, applemusic, deezer`)
                    ]
                });
            }
            
            // Get or create user preferences
            let userPrefs = await client.db.userPreferences.get(ctx.author.id) || {};
            userPrefs.searchEngine = engine;
            
            // Save preferences
            await client.db.userPreferences.set(ctx.author.id, userPrefs);
            
            const engineEmojis = {
                youtube: '🎥',
                youtubemusic: '🎵',
                spotify: '🎧',
                soundcloud: '☁️',
                applemusic: '🍎',
                deezer: '🎶'
            };
            
            const engineNames = {
                youtube: 'YouTube',
                youtubemusic: 'YouTube Music',
                spotify: 'Spotify',
                soundcloud: 'SoundCloud',
                applemusic: 'Apple Music',
                deezer: 'Deezer'
            };
            
            return ctx.reply({
                embeds: [
                    client.embed()
                        .desc(`${check} Search engine updated successfully!\n\n**New Default:** ${engineEmojis[engine]} ${engineNames[engine]}\n\n${info} All your music searches will now use this engine by default.`)
                        .setColor('#00FF00')
                ]
            });
        };
    }
}

/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
