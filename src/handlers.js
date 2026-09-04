import { PermissionFlagsBits, MessageFlags, AttachmentBuilder } from 'discord.js';
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

  const cfg = getConfig();
  const isTarget = isTargetUser(message.author.id);
  const hitGlobal = (cfg.globalChance || 0) > 0 && Math.random() < cfg.globalChance;

  // Trigger if explicitly targeted OR if random global chance hits
  if (!isTarget && !hitGlobal) return;

  const text = message.content?.trim() || '';
  // Skip if empty or unuwuifiable (only URLs, emojis, code blocks, or attachments)
  if (!text || !isUwufiable(text)) return;

  const uwuText = uwuify(text);
  // Skip if content did not change at all
  if (!uwuText || uwuText.trim() === text) return;

  // Download attachments into memory before deleting original message
  let validFiles = [];
  if (message.attachments?.size > 0) {
    const downloaded = await Promise.all(
      Array.from(message.attachments.values()).map(async (att) => {
        try {
          const res = await fetch(att.url);
          if (!res.ok) return null;
          const buf = Buffer.from(await res.arrayBuffer());
          return new AttachmentBuilder(buf, {
            name: att.name,
            description: att.description || undefined,
          });
        } catch (err) {
          console.error('[Uwu] Failed to download attachment:', err.message);
          return null;
        }
      })
    );
    validFiles = downloaded.filter(Boolean);
  }

  const perms = message.channel.permissionsFor?.(message.client.user);

  // Webhook Impersonation
  if (cfg.uwuMode === 'webhook' && perms?.has(PermissionFlagsBits.ManageWebhooks) && perms?.has(PermissionFlagsBits.ManageMessages)) {
    try {
      const hook = await getWebhook(message.channel, message.client);
      if (hook) {
        // Send webhook with re-uploaded attachments first
        await hook.send({
          content: uwuText || undefined,
          username: (message.member?.displayName || message.author.username).slice(0, 80),
          avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 512 }),
          files: validFiles.length ? validFiles : undefined,
          threadId: message.channel.isThread?.() ? message.channel.id : undefined,
          allowedMentions: { parse: ['users'] },
        });

        // Delete original message ONLY after webhook delivery succeeds
        if (cfg.deleteOriginalMessage !== false) {
          await message.delete().catch(() => {});
        }
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
  const fileNames = Array.from(message.attachments?.values() || []).map((a) => (a.name || '').toLowerCase());

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
