import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import {
  getConfig,
  addTargetUserId,
  removeTargetUserId,
  setUwuMode,
  setDeleteOriginalMessage,
  setUwuChance,
  addSuppressKeyword,
  removeSuppressKeyword,
} from './config.js';

const execAsync = promisify(exec);

export const uwuCommand = {
  data: new SlashCommandBuilder()
    .setName('uwu')
    .setDescription('Manage uwuification target users and mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to be uwuified')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from being uwuified')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List targeted users'))
    .addSubcommand((sub) =>
      sub
        .setName('mode')
        .setDescription('Set how uwuified messages are handled')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Webhook or Reply mode')
            .setRequired(true)
            .addChoices(
              { name: 'Webhook (Impersonate & Delete)', value: 'webhook' },
              { name: 'Reply (Direct quote reply)', value: 'reply' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete_message')
        .setDescription('Toggle deleting the original message in webhook mode')
        .addBooleanOption((opt) =>
          opt
            .setName('enabled')
            .setDescription('True to delete original message, false to keep it')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('chance')
        .setDescription('Set or toggle random uwuify chance (e.g. 50% vs always 100%)')
        .addIntegerOption((opt) =>
          opt
            .setName('percent')
            .setDescription('Chance in percentage (0 to 100). Omit to toggle between 50% and 100%')
            .setMinValue(0)
            .setMaxValue(100)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = getConfig();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const ok = await addTargetUserId(user.id);
      await interaction.reply({
        content: ok ? `Added <@${user.id}> to uwu targets.` : `<@${user.id}> is already targeted.`,
        ephemeral: true,
      });
    } else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const ok = await removeTargetUserId(user.id);
      await interaction.reply({
        content: ok ? `Removed <@${user.id}> from uwu targets.` : `<@${user.id}> was not targeted.`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const list = cfg.targetUserIds.map((id, i) => `${i + 1}. <@${id}> (\`${id}\`)`).join('\n') || '_None_';
      const chancePct = Math.round((cfg.uwuChance ?? 1.0) * 100);
      const embed = new EmbedBuilder()
        .setTitle('Target Users')
        .setDescription(list)
        .setFooter({
          text: `Mode: ${cfg.uwuMode} | Delete Messages: ${cfg.deleteOriginalMessage !== false ? 'Enabled' : 'Disabled'} | Chance: ${chancePct}% | Total: ${cfg.targetUserIds.length}`,
        });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'mode') {
      const mode = interaction.options.getString('type');
      await setUwuMode(mode);
      await interaction.reply({ content: `Uwu mode set to: **${mode}**`, ephemeral: true });
    } else if (sub === 'delete_message') {
      const explicit = interaction.options.getBoolean('enabled');
      const nextVal = explicit !== null ? explicit : !cfg.deleteOriginalMessage;
      await setDeleteOriginalMessage(nextVal);
      await interaction.reply({
        content: `Original message deletion is now: **${nextVal ? 'Enabled' : 'Disabled'}**`,
        ephemeral: true,
      });
    } else if (sub === 'chance') {
      const explicit = interaction.options.getInteger('percent');
      let nextChance;
      if (explicit !== null) {
        nextChance = explicit / 100;
      } else {
        nextChance = (cfg.uwuChance ?? 1.0) >= 1.0 ? 0.5 : 1.0;
      }
      await setUwuChance(nextChance);
      const pctDisplay = `${Math.round(nextChance * 100)}%`;
      await interaction.reply({
        content: `🎲 Random uwuify chance is now: **${pctDisplay}**${nextChance === 1.0 ? ' (Always)' : ''}`,
        ephemeral: true,
      });
    }
  },
};

export const suppressCommand = {
  data: new SlashCommandBuilder()
    .setName('suppress')
    .setDescription('Manage keywords, domains, or file names for embed suppression')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a keyword, domain, or file name to suppress embeds')
        .addStringOption((opt) =>
          opt
            .setName('keyword')
            .setDescription('Domain, keyword, or file name (e.g. x.com, spoiler.mp4)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a keyword, domain, or file name')
        .addStringOption((opt) => opt.setName('keyword').setDescription('Keyword or file name to remove').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active keywords and file names')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = getConfig();

    if (sub === 'add') {
      const kw = interaction.options.getString('keyword');
      const ok = await addSuppressKeyword(kw);
      await interaction.reply({
        content: ok ? `Added \`${kw.toLowerCase()}\` to suppression list.` : `\`${kw}\` already in list.`,
        ephemeral: true,
      });
    } else if (sub === 'remove') {
      const kw = interaction.options.getString('keyword');
      const ok = await removeSuppressKeyword(kw);
      await interaction.reply({
        content: ok ? `Removed \`${kw}\` from suppression list.` : `\`${kw}\` not found in list.`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const list = cfg.suppressKeywords.map((k, i) => `${i + 1}. \`${k}\``).join('\n') || '_None_';
      const embed = new EmbedBuilder().setTitle('Suppressed Keywords').setDescription(list);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export const updateCommand = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Pull latest changes from git and restart the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { stdout, stderr } = await execAsync('git pull');
      const output = (stdout || stderr || 'Already up to date.').trim();

      await interaction.editReply({
        content: `🔄 **Git Pull Output:**\n\`\`\`\n${output.slice(0, 1800)}\n\`\`\`\nRestarting bot...`,
      });

      setTimeout(async () => {
        try {
          await interaction.client.destroy();
        } catch {}

        const isSupervised =
          process.env.pm_id !== undefined ||
          process.env.PM2_HOME !== undefined ||
          process.env.INVOCATION_ID !== undefined;

        if (!isSupervised) {
          const child = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit',
            cwd: process.cwd(),
            env: process.env,
          });
          child.unref();
        }
        process.exit(0);
      }, 1000);
    } catch (err) {
      console.error('[Update] Error during update:', err);
      await interaction.editReply({
        content: `❌ **Update Failed:**\n\`\`\`\n${(err.message || String(err)).slice(0, 1800)}\n\`\`\``,
      });
    }
  },
};

export const commands = [uwuCommand, suppressCommand, updateCommand];
export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
