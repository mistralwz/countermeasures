import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { commandMap, commands } from './commands.js';
import { handleUwu, handleEmbeds } from './handlers.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Purge stale guild-level commands from joined guilds so they don't shadow global commands.
 */
async function purgeGuildCommands(clientInstance, targetGuildId = null) {
  for (const [id, guild] of clientInstance.guilds.cache) {
    if (targetGuildId && id === targetGuildId) continue;
    try {
      const existing = await guild.commands.fetch();
      if (existing.size > 0) {
        await guild.commands.set([]);
        console.log(`[Commands] Purged ${existing.size} stale guild command(s) from "${guild.name}" (${id}).`);
      }
    } catch (e) {
      console.warn(`[Commands] Could not purge commands for "${guild.name}":`, e.message);
    }
  }
}

// Standalone one-shot cleaner flag: npm run clear-guilds
if (process.argv.includes('--clear-guilds')) {
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Cleaner] Online as ${c.user.tag}. Checking ${c.guilds.cache.size} guild(s) for stale commands...`);
    await purgeGuildCommands(c);
    console.log('[Cleaner] All stale guild commands purged. Exiting.');
    client.destroy();
    process.exit(0);
  });
} else {
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Countermeasures] Online as ${c.user.tag} across ${c.guilds.cache.size} guild(s).`);

    try {
      const body = commands.map((cmd) => cmd.data.toJSON());
      const guildId = process.env.GUILD_ID?.trim();

      if (guildId) {
        await c.application.commands.set(body, guildId);
        console.log(`[Commands] Synced ${body.length} commands to guild ${guildId}.`);
        await purgeGuildCommands(c, guildId);
      } else {
        // Purge any stale guild-level commands so they don't shadow global commands
        await purgeGuildCommands(c);
        await c.application.commands.set(body);
        console.log(`[Commands] Synced ${body.length} commands globally.`);
      }
    } catch (err) {
      console.error('[Commands] Auto-sync failed on startup:', err.message);
    }
  });

  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;
    const cmd = commandMap.get(i.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(i);
    } catch (err) {
      console.error(`[Command] Error /${i.commandName}:`, err.message);
      const reply = { content: '❌ Command error.', ephemeral: true };
      if (i.replied || i.deferred) await i.followUp(reply).catch(() => {});
      else await i.reply(reply).catch(() => {});
    }
  });

  client.on(Events.MessageCreate, async (msg) => {
    await handleUwu(msg);
    if (!msg.deleted) await handleEmbeds(msg);
  });

  client.on(Events.MessageUpdate, async (_, newMsg) => {
    const msg = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
    if (msg) await handleEmbeds(msg);
  });
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Startup] Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('[Startup] Login failed:', err.message);
  process.exit(1);
});
