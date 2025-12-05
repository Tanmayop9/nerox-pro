import { execute } from '../../functions/context/execute.js';
import { resolveNsfw } from '../../functions/context/resolveNsfw.js';
import { resolvePerms } from '../../functions/context/resolvePerms.js';
import { enforceAdmin } from '../../functions/context/enforceAdmin.js';
import { resolveVoice } from '../../functions/context/resolveVoice.js';
import { resolvePlayer } from '../../functions/context/resolvePlayer.js';
import { isUnderCooldown } from '../../functions/context/checkCooldown.js';
import { resolvePrefix } from '../../functions/context/resolvePrefix.js';
import { resolveCommand } from '../../functions/context/resolveCommand.js';
import { resolveBotAdmin } from '../../functions/context/resolveBotAdmin.js';

const event = 'ctxCreate';

// Helper function to check if noPrefix is active (with expiry support)
function isNoPrefixActive(noPrefixData) {
    if (!noPrefixData) return false;
    
    // Legacy format (just true) - treat as permanent
    if (noPrefixData === true) return true;
    
    // New format with object
    if (typeof noPrefixData === 'object') {
        // Permanent noprefix
        if (noPrefixData.permanent) return true;
        
        // Check expiry
        if (noPrefixData.expiresAt) {
            return noPrefixData.expiresAt > Date.now();
        }
        
        // If no expiresAt and not permanent, treat as active (backwards compatibility)
        return true;
    }
    
    return false;
}

// Helper function to check if premium is active (with expiry support)
function isPremiumActive(premiumData) {
    if (!premiumData) return false;
    
    // Check if it's an object with expiry
    if (typeof premiumData === 'object') {
        // Permanent premium
        if (premiumData.permanent) return true;
        
        // Check expiry - if expiresAt is null, treat as permanent
        if (premiumData.expiresAt === null) return true;
        
        // Check if not expired
        if (premiumData.expiresAt) {
            return premiumData.expiresAt > Date.now();
        }
        
        // If has redeemedAt but no expiresAt, treat as active (backwards compatibility)
        if (premiumData.redeemedAt) return true;
    }
    
    // Legacy format or simple truthy value
    return !!premiumData;
}

export default class ContextCreate {
    constructor() {
        this.name = event;
        this.execute = async (client, ctx) => {
            if (!ctx) return;

            const [owner, admin, noPrefixData, bl, premiumData] = await Promise.all([
                client.owners.includes(ctx.author.id),
                client.admins.includes(ctx.author.id),
                client.db.noPrefix.get(ctx.author.id),
                client.db.blacklist.get(ctx.author.id),
                client.db.botstaff.get(ctx.author.id), // Premium Users - get full data for expiry check
            ]);

            const botAdmin = owner || admin ? true : false;
            const np = botAdmin || isNoPrefixActive(noPrefixData) ? true : false;
            const staff = isPremiumActive(premiumData);

            if (bl) return;
            if (!(await resolvePerms.basic(ctx))) return;
            if (ctx.content.match(new RegExp(`^<@!?${client.user.id}>( |)$`))) return void client.emit('mention', ctx);

            const resolvedPrefix = await resolvePrefix(ctx, np);
            if (resolvedPrefix === null) return;

            const { command, args } = await resolveCommand(ctx, resolvedPrefix);
            if (!command) return;

            if (!botAdmin && (await isUnderCooldown(ctx, command))) return;
            if (!(await enforceAdmin(ctx))) return;
            if (!(await resolvePerms.user(ctx, command, botAdmin))) return;
            if (!(await resolveBotAdmin(ctx, command))) return;

            // Premium users can use the bot during maintenance
            if (client.underMaintenance && !(botAdmin || staff)) return void client.emit('underMaintenance', ctx);

            if (args[0]?.toLowerCase() === '-guide') return void client.emit('infoRequested', ctx, command);
            if (!(await resolveVoice(ctx, command))) return;
            if (!(await resolvePlayer(ctx, command))) return;
            if (!(await resolveNsfw(ctx, command))) return;

            await execute(ctx, command, args);
        };
    }
}

/**@codeStyle - https://google.github.io/styleguide/tsguide.html */