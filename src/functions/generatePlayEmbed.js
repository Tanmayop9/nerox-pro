
export const generatePlayEmbed = (client, player) => {
    const track = player.queue.current;
    if (!track)
        return client.embed().desc(`${client.emoji.error} No track details`);
    
    const { title, author } = track;
    const duration = track.isStream ? `LIVE` : client.formatDuration(track.length || 369);
    
    const embed = client
        .embed()
        .desc(
            `${client.emoji.music} **${title.length > 50 ? title.substring(0, 50) + '...' : title}**\n\n` +
            `${client.emoji.info} ${author}\n` +
            `${client.emoji.timer} ${duration}\n\n` +
            `Queue: ${player.queue.size} • Vol: ${player.volume}%`
        );
    
    return embed;
};
/**@codeStyle - https://google.github.io/styleguide/tsguide.html */
