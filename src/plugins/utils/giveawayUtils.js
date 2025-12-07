/**
 * Giveaway Utility Functions - Support Server Manager
 * Shared functions for giveaway management
 */

// ==================== END GIVEAWAY LOGIC ====================
export async function endGiveaway(
  client,
  giveawayId,
  overrideGiveawayObj = null,
) {
  const giveaway =
    overrideGiveawayObj || (await client.db.giveaways.get(giveawayId));
  if (!giveaway || giveaway.ended) return;

  try {
    // Fetch channel/msg
    const channel = await client.channels
      .fetch(giveaway.channelId)
      .catch(() => null);
    if (!channel) {
      await client.db.giveaways.set(giveawayId, { ...giveaway, ended: true });
      return;
    }
    const giveawayMsg = await channel.messages
      .fetch(giveaway.messageId)
      .catch(() => null);
    if (!giveawayMsg) {
      await client.db.giveaways.set(giveawayId, { ...giveaway, ended: true });
      return;
    }

    // Get 🎉 participants
    const reaction = giveawayMsg.reactions.cache.get("🎉");
    let participants = [];
    if (reaction) {
      const users = await reaction.users.fetch();
      participants = users.filter((u) => !u.bot).map((u) => u.id);
    }
    // Random winners
    const winners = [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(giveaway.winners, shuffled.length); i++) {
      winners.push(shuffled[i]);
    }

    // Mark as ended in DB
    await client.db.giveaways.set(giveawayId, {
      ...giveaway,
      ended: true,
      winnersIds: winners,
      participants: participants,
      endedAt: Date.now(),
    });

    // Prize logic
    const prizeInfo = getPrizeInfo(giveaway.prize, {
      durationMs: giveaway.premiumDurationMs,
      text: giveaway.premiumDurationText,
      raw: undefined,
    });
    for (const winnerId of winners) {
      try {
        if (giveaway.prize === "noprefix") {
          // Set noprefix with permanent duration for giveaway winners
          await client.db.noPrefix.set(winnerId, {
            grantedAt: Date.now(),
            grantedBy: "Giveaway",
            permanent: true,
            expiresAt: null,
            durationText: "Permanent (Giveaway)",
          });
        } else if (giveaway.prize === "premium") {
          let setObj;
          if (giveaway.premiumDurationMs == null) {
            setObj = {
              expiresAt: Date.now() + 30 * 86400000,
              redeemedAt: Date.now(),
              addedBy: "Giveaway",
            };
          } else if (giveaway.premiumDurationMs === 0) {
            setObj = {
              expiresAt: null,
              redeemedAt: Date.now(),
              addedBy: "Giveaway",
              permanent: true,
            };
          } else {
            setObj = {
              expiresAt: Date.now() + giveaway.premiumDurationMs,
              redeemedAt: Date.now(),
              addedBy: "Giveaway",
            };
          }
          await client.db.botstaff.set(winnerId, setObj);
        }
      } catch (err) {
        console.error(`[Giveaway] Failed to apply prize to ${winnerId}:`, err);
      }
    }
    // Expiry text
    let expiresText = "";
    if (giveaway.prize === "premium") {
      if (giveaway.premiumDurationMs === 0)
        expiresText = "Expires In - Permanent";
      else
        expiresText = `Expires In - ${giveaway.premiumDurationText || "30 days"}`;
    } else if (giveaway.prize === "noprefix") {
      expiresText = `Expires In - Permanent Access.`;
    }
    // Winner content + embed
    const winnerContent = `**Congratulations** ${winners.map((id) => `<@${id}>`).join(", ")}! You won ${prizeInfo.name}.`;
    const rewardEmbed = client
      .embed()
      .setAuthor({
        name: "Rewards I've given you",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(`Static: ${prizeInfo.name}\n${expiresText}\n`)
      .setTimestamp();

    if (winners.length > 0) {
      await channel.send({ content: winnerContent, embeds: [rewardEmbed] });
    }

    const endedEmbed = client
      .embed()
      .setAuthor({
        name: "GIVEAWAY ENDED",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(
        `**Prize:** ${prizeInfo.name}\n` +
          (giveaway.prize === "premium"
            ? `**Premium Duration:** ${giveaway.premiumDurationText || "30 days"}\n`
            : "") +
          `**Entries:** ${participants.length}\n` +
          `**Winner${winners.length !== 1 ? "s" : ""}:** ${winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "No valid entries"}\n\n` +
          `${winners.length > 0 ? "Congratulations! Prizes applied." : "No winners this time."}`,
      )
      .setFooter({ text: `ID: ${giveawayId} | Ended` })
      .setTimestamp();

    await giveawayMsg.edit({ embeds: [endedEmbed] });
  } catch (error) {
    console.error(`[Giveaway] Error ending giveaway ${giveawayId}:`, error);
    await client.db.giveaways.set(giveawayId, { ...giveaway, ended: true });
  }
}

// ==================== SCHEDULE GIVEAWAY END ====================
export function scheduleGiveawayEnd(client, giveawayId, delay) {
  if (delay > 3600000) {
    console.log(
      `[Giveaway] ${giveawayId} scheduled for ${Math.round(delay / 60000)} minutes via periodic check`,
    );
    return;
  }
  const timeoutId = setTimeout(async () => {
    try {
      const giveaway = await client.db.giveaways.get(giveawayId);
      if (giveaway && !giveaway.ended) {
        await endGiveaway(client, giveawayId);
      }
    } catch (error) {
      console.error(
        `[Giveaway] Error in scheduled end for ${giveawayId}:`,
        error,
      );
    }
  }, delay);
  if (!client.giveawayTimeouts) client.giveawayTimeouts = new Map();
  client.giveawayTimeouts.set(giveawayId, timeoutId);
}

// ==================== UTILS ====================
export function getPrizeInfo(prize, premiumDurInfo) {
  const prizes = {
    noprefix: { emoji: "", name: "No Prefix Access" },
    premium: {
      emoji: "",
      name: `Premium ${premiumDurInfo?.text ? `(${premiumDurInfo.text})` : "(30 days)"}`,
    },
  };
  return prizes[prize] || { emoji: "", name: prize };
}

export function parseDuration(str) {
  if (!str || typeof str !== "string") return null;
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  if (isNaN(value) || value <= 0) return null;
  const unit = match[2].toLowerCase();
  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export function parsePremiumDuration(str) {
  str = str.toLowerCase();
  if (str === "perm" || str === "permanent")
    return { durationMs: 0, text: "Permanent", raw: str };
  if (/^\d+d$/.test(str)) {
    const n = parseInt(str.replace("d", ""));
    if (n > 0 && n <= 365)
      return {
        durationMs: n * 86400000,
        text: `${n} day${n > 1 ? "s" : ""}`,
        raw: str,
      };
  }
  if (/^\d+w$/.test(str)) {
    const n = parseInt(str.replace("w", ""));
    if (n > 0 && n <= 52)
      return {
        durationMs: n * 7 * 86400000,
        text: `${n} week${n > 1 ? "s" : ""}`,
        raw: str,
      };
  }
  if (/^\d+m$/.test(str)) {
    const n = parseInt(str.replace("m", ""));
    if (n > 0 && n <= 12)
      return {
        durationMs: n * 30 * 86400000,
        text: `${n} month${n > 1 ? "s" : ""}`,
        raw: str,
      };
  }
  if (/^\d+y$/.test(str)) {
    const n = parseInt(str.replace("y", ""));
    if (n > 0 && n <= 10)
      return {
        durationMs: n * 365 * 86400000,
        text: `${n} year${n > 1 ? "s" : ""}`,
        raw: str,
      };
  }
  return null;
}
