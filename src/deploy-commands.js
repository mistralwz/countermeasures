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
const body = commands.map((c) => c.data.toJSON());

try {
  console.log(`[Deploy] Registering ${body.length} commands...`);
  const route = GUILD_ID?.trim()
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID.trim())
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body });
  console.log(`[Deploy] Successfully registered commands.`);
} catch (err) {
  console.error('[Deploy] Failed to register:', err.message);
}
