
export const generatePlayEmbed = (client, player) => {
    const track = player.queue.current;
    if (!track)
        return client.embed().desc(`${client.emoji.error} No track details`);
    
    const { title, author } = track;
    const duration = track.isStream ? `LIVE` : client.formatDuration(track.length || 369);
    const displayTitle = title.length > 45 ? title.substring(0, 42) + '...' : title;
    
    const embed = client
        .embed()
        .desc(
            `**${displayTitle}**\n` +
            `${author}\n\n` +
            `\`\`\`\n` +
            `Duration: ${duration}\n` +
            `Queue: ${player.queue.size} tracks\n` +
            `Volume: ${player.volume}%\n` +
            `\`\`\``
        );
    
    return embed;
};
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
