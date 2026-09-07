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

// CLI inspection tool: npm run list-commands
if (process.argv.includes('--list-commands')) {
  client.once(Events.ClientReady, async (c) => {
    console.log(`\n📋 Inspecting registered commands for ${c.user.tag}...`);
    const globals = await c.application.commands.fetch();
    console.log(`\n🌐 Global Commands (${globals.size}):`);
    if (globals.size === 0) console.log('   (None)');
    else globals.forEach((cmd) => console.log(`   - /${cmd.name} (id: ${cmd.id}): ${cmd.description}`));

    console.log(`\n🏰 Guild Commands across ${c.guilds.cache.size} server(s):`);
    for (const [id, guild] of c.guilds.cache) {
      const gCmds = await guild.commands.fetch().catch(() => null);
      console.log(`   Server "${guild.name}" (${id}): ${gCmds?.size || 0} command(s)`);
      gCmds?.forEach((cmd) => console.log(`      - /${cmd.name} (id: ${cmd.id}): ${cmd.description}`));
    }
    client.destroy();
    process.exit(0);
  });
} else if (process.argv.includes('--clear-global')) {
  // One-shot wipe global commands: npm run clear-global
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Cleaner] Wiping ALL global commands for ${c.user.tag}...`);
    await c.application.commands.set([]);
    console.log('[Cleaner] Successfully wiped all global commands. Exiting.');
    client.destroy();
    process.exit(0);
  });
} else if (process.argv.includes('--clear-guilds')) {
  // One-shot wipe guild commands: npm run clear-guilds
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Cleaner] Wiping guild commands across ${c.guilds.cache.size} server(s)...`);
    await purgeGuildCommands(c);
    console.log('[Cleaner] All guild commands purged. Exiting.');
    client.destroy();
    process.exit(0);
  });
} else if (process.argv.includes('--clear-all')) {
  // One-shot wipe everything: npm run clear-all
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Cleaner] Wiping ALL global and guild commands for ${c.user.tag}...`);
    await c.application.commands.set([]);
    await purgeGuildCommands(c);
    console.log('[Cleaner] Completely wiped all global and guild commands. Exiting.');
    client.destroy();
    process.exit(0);
  });
} else {
  // Standard bot runtime
  client.once(Events.ClientReady, async (c) => {
    console.log(`[Countermeasures] Online as ${c.user.tag} across ${c.guilds.cache.size} guild(s).`);

    try {
      const body = commands.map((cmd) => cmd.data.toJSON());
      const guildId = process.env.GUILD_ID?.trim();

      if (guildId) {
        const synced = await c.application.commands.set(body, guildId);
        console.log(`[Commands] Synced ${synced.size} command(s) to guild ${guildId}: ${synced.map((cmd) => '/' + cmd.name).join(', ')}.`);

        // Clear global commands so they don't duplicate or conflict with guild commands
        const currentGlobals = await c.application.commands.fetch();
        if (currentGlobals.size > 0) {
          await c.application.commands.set([]);
          console.log(`[Commands] Purged ${currentGlobals.size} stale global command(s).`);
        }
        await purgeGuildCommands(c, guildId);
      } else {
        // Purge any stale guild-level commands so they don't shadow global commands
        await purgeGuildCommands(c);
        const synced = await c.application.commands.set(body);
        console.log(`[Commands] Synced ${synced.size} global command(s): ${synced.map((cmd) => '/' + cmd.name).join(', ')}.`);
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
