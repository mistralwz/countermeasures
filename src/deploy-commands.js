import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands.js';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('[Deploy] Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const isClear = process.argv.includes('--clear');
const body = isClear ? [] : commands.map((c) => c.data.toJSON());

async function run() {
  try {
    if (isClear) {
      console.log('[Deploy] Wiping ALL slash commands (guild and global)...');
      if (GUILD_ID?.trim()) {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID.trim()), { body: [] });
        console.log(`[Deploy] Cleared guild commands for ${GUILD_ID.trim()}.`);
      }
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      console.log('[Deploy] Cleared global commands.');
      console.log('[Deploy] All commands wiped cleanly.');
      return;
    }

    if (GUILD_ID?.trim()) {
      console.log(`[Deploy] Registering ${body.length} commands to guild ${GUILD_ID.trim()}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID.trim()), { body });
      console.log(`[Deploy] Successfully updated guild commands.`);
    } else {
      console.log(`[Deploy] Registering ${body.length} commands globally...`);
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
      console.log(`[Deploy] Successfully updated global commands.`);
    }
  } catch (err) {
    console.error('[Deploy] Error:', err.message);
  }
}

run();
