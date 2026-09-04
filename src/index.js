import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { commandMap } from './commands.js';
import { handleUwu, handleEmbeds } from './handlers.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[Countermeasures] Online as ${c.user.tag} across ${c.guilds.cache.size} guild(s).`);
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

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Startup] Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('[Startup] Login failed:', err.message);
  process.exit(1);
});
