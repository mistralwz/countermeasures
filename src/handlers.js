import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getConfig, isTargetUser } from './config.js';
import { uwuify, isUwufiable } from './uwuify.js';

const webhookCache = new Map();

async function getWebhook(channel, client) {
  const target = channel.isThread?.() ? channel.parent : channel;
  if (!target?.fetchWebhooks) return null;

  if (webhookCache.has(target.id)) return webhookCache.get(target.id);

  try {
    const webhooks = await target.fetchWebhooks();
    let hook = webhooks.find((w) => w.owner?.id === client.user.id);
    if (!hook) {
      hook = await target.createWebhook({ name: 'Countermeasures', reason: 'Uwuify impersonation' });
    }
    webhookCache.set(target.id, hook);
    return hook;
  } catch (err) {
    console.error(`[Webhook] Error in #${target.name}:`, err.message);
    return null;
  }
}

export async function handleUwu(message) {
  if (!message.author || message.author.bot || message.webhookId) return;
  if (!isTargetUser(message.author.id)) return;

  const text = message.content?.trim() || '';
  if (!isUwufiable(text)) return;

  const cfg = getConfig();
  const chance = cfg.uwuChance ?? 1.0;
  if (chance < 1.0 && (chance <= 0 || Math.random() > chance)) return;

  const uwuText = uwuify(text);
  if (!uwuText || uwuText === text) return;

  const files = message.attachments.map((a) => a.url);
  const perms = message.channel.permissionsFor?.(message.client.user);

  // Webhook Impersonation
  if (cfg.uwuMode === 'webhook' && perms?.has(PermissionFlagsBits.ManageWebhooks) && perms?.has(PermissionFlagsBits.ManageMessages)) {
    try {
      const hook = await getWebhook(message.channel, message.client);
      if (hook) {
        if (cfg.deleteOriginalMessage !== false) {
          await message.delete().catch(() => {});
        }
        await hook.send({
          content: uwuText || undefined,
          username: (message.member?.displayName || message.author.username).slice(0, 80),
          avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 512 }),
          files: files.length ? files : undefined,
          threadId: message.channel.isThread?.() ? message.channel.id : undefined,
          allowedMentions: { parse: ['users'] },
        });
        return;
      }
    } catch (err) {
      console.error('[Uwu] Webhook failed, fallback to reply:', err.message);
    }
  }

  // Reply Fallback
  if (uwuText) {
    await message.reply({ content: uwuText, allowedMentions: { repliedUser: false } }).catch(() => {});
  }
}

export async function handleEmbeds(message) {
  if (!message || message.flags?.has(MessageFlags.SuppressEmbeds)) return;

  const cfg = getConfig();
  if (!cfg.suppressKeywords?.length) return;

  const content = (message.content || '').toLowerCase();
  const fileNames = message.attachments?.map((a) => (a.name || '').toLowerCase()) || [];

  const shouldSuppress = cfg.suppressKeywords.some((kw) => {
    if (!kw) return false;
    const k = kw.toLowerCase();
    return content.includes(k) || fileNames.some((name) => name.includes(k));
  });

  if (!shouldSuppress) return;

  if (message.guild && !message.channel.permissionsFor?.(message.client.user)?.has(PermissionFlagsBits.ManageMessages)) {
    return;
  }

  try {
    await message.suppressEmbeds(true);
  } catch (err) {
    if (err.code !== 10008 && err.code !== 50013) {
      console.error('[Embeds] Suppress failed:', err.message);
    }
  }
}
