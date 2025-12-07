/**
 * Lavalink Status Command - Support Server Manager
 * Display lavalink nodes status from lava.json
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  name: "lavalink",
  aliases: ["lava", "lavastatus", "nodes"],
  description: "Shows lavalink nodes status",
  cooldown: 5,

  async execute(client, message) {
    // Load lavalink configuration from lava.json
    let lavaConfig;
    try {
      const configPath = resolve(__dirname, "../../../lava.json");
      lavaConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch (error) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setTitle("❌ Configuration Error")
            .setDescription(`Failed to load lava.json: ${error.message}`),
        ],
      });
    }

    if (!lavaConfig.nodes || lavaConfig.nodes.length === 0) {
      return message.reply({
        embeds: [
          client
            .embed(client.colors.error)
            .setTitle("❌ No Nodes Found")
            .setDescription("No lavalink nodes are configured in lava.json"),
        ],
      });
    }

    const statusEmbed = client
      .embed(client.colors.info)
      .setAuthor({
        name: "Checking Lavalink Nodes...",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription("Please wait while we check the status of all nodes...")
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [statusEmbed] });

    // Check status of each node
    const nodeEmbeds = [];

    for (const node of lavaConfig.nodes) {
      const nodeStatus = await checkNodeStatus(node);

      let statusEmoji;
      let statusText;
      let embedColor;

      if (nodeStatus.online) {
        statusEmoji = "🟢";
        statusText = "Online";
        embedColor = client.colors.success;
      } else {
        statusEmoji = "🔴";
        statusText = "Offline";
        embedColor = client.colors.error;
      }

      const embed = client
        .embed(embedColor)
        .setAuthor({
          name: `${node.name}`,
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `**Status:** ${statusEmoji} ${statusText}\n` +
            `**Host:** \`${node.host}\`\n` +
            `**Port:** \`${node.port}\`\n` +
            `**Secure:** ${node.secure ? "🔒 Yes" : "🔓 No"}\n` +
            `**Priority:** ${node.priority || 1}\n\n` +
            (nodeStatus.online
              ? `**Players:** ${nodeStatus.stats?.players || 0}\n` +
                `**Playing:** ${nodeStatus.stats?.playingPlayers || 0}\n` +
                `**Uptime:** ${formatUptime(nodeStatus.stats?.uptime || 0)}\n` +
                `**Memory:** ${formatMemory(nodeStatus.stats?.memory)}\n` +
                `**CPU:** ${nodeStatus.stats?.cpu ? `${(nodeStatus.stats.cpu.systemLoad * 100).toFixed(2)}%` : "N/A"}`
              : `**Reason:** ${nodeStatus.error || "Connection failed"}`),
        )
        .setFooter({
          text: `Checked at`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      nodeEmbeds.push(embed);
    }

    // Update message with all node statuses
    await statusMessage.edit({ embeds: nodeEmbeds });
  },
};

/**
 * Check if a lavalink node is online
 */
async function checkNodeStatus(node) {
  try {
    const protocol = node.secure ? "https" : "http";
    const url = `${protocol}://${node.host}:${node.port}/version`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        Authorization: node.password,
      },
    });

    // Try to get stats endpoint
    let stats = null;
    try {
      const statsUrl = `${protocol}://${node.host}:${node.port}/v4/stats`;
      const statsResponse = await axios.get(statsUrl, {
        timeout: 5000,
        headers: {
          Authorization: node.password,
        },
      });
      stats = statsResponse.data;
    } catch (e) {
      // Stats endpoint might not be available, that's okay
    }

    return {
      online: true,
      version: response.data,
      stats: stats,
    };
  } catch (error) {
    return {
      online: false,
      error: error.message,
    };
  }
}

/**
 * Format uptime in human readable format
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format memory in human readable format
 */
function formatMemory(memory) {
  if (!memory) return "N/A";

  const used = (memory.used / 1024 / 1024).toFixed(2);
  const allocated = (memory.allocated / 1024 / 1024).toFixed(2);
  const reservable = (memory.reservable / 1024 / 1024).toFixed(2);

  return `${used}MB / ${allocated}MB (${reservable}MB reservable)`;
}
