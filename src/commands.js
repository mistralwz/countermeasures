import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import {
  getConfig,
  addTargetUserId,
  removeTargetUserId,
  setUwuMode,
  setGlobalChance,
  addSuppressKeyword,
  removeSuppressKeyword,
  toggleFeature,
} from './config.js';

export const uwuCommand = {
  data: new SlashCommandBuilder()
    .setName('uwu')
    .setDescription('Manage uwuification target users, chance, and mode')
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
    .addSubcommand((sub) => sub.setName('list').setDescription('List targeted users, global chance, and status'))
    .addSubcommand((sub) =>
      sub
        .setName('chance')
        .setDescription('Set random uwuify chance for everyone in the server')
        .addIntegerOption((opt) =>
          opt
            .setName('percent')
            .setDescription('Chance percentage (0-100, 0 = disabled)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Toggle uwuification feature on or off')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable (true) or disable (false). Omit to flip.')
        )
    )
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
    } else if (sub === 'chance') {
      const pct = interaction.options.getInteger('percent');
      const val = await setGlobalChance(pct / 100);
      await interaction.reply({
        content:
          val > 0
            ? `🎲 Global uwu chance set to **${pct}%** (messages from anyone have a ${pct}% chance of being uwuified).`
            : `🎲 Global uwu chance **disabled** (only targeted users will be uwuified).`,
        ephemeral: true,
      });
    } else if (sub === 'toggle') {
      const explicit = interaction.options.getBoolean('enabled');
      const state = await toggleFeature('uwu', explicit);
      await interaction.reply({
        content: `${state ? '✅' : '⏸️'} Uwuification is now **${state ? 'ENABLED' : 'DISABLED'}**.`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const list = cfg.targetUserIds.map((id, i) => `${i + 1}. <@${id}> (\`${id}\`)`).join('\n') || '_None_';
      const globalPct = Math.round((cfg.globalChance || 0) * 100);
      const isEnabled = cfg.uwuEnabled !== false;
      const embed = new EmbedBuilder()
        .setTitle('Uwuify Configuration')
        .setDescription(`**Targeted Users:**\n${list}`)
        .addFields(
          {
            name: '⚡ Feature Status',
            value: isEnabled ? '✅ **Enabled**' : '⏸️ **Disabled** (Paused)',
            inline: true,
          },
          {
            name: '🎲 Global Random Chance',
            value: `${globalPct}% (${globalPct > 0 ? 'Active for everyone' : 'Disabled'})`,
            inline: true,
          }
        )
        .setFooter({ text: `Mode: ${cfg.uwuMode} | Targets: ${cfg.targetUserIds.length}` });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'mode') {
      const mode = interaction.options.getString('type');
      await setUwuMode(mode);
      await interaction.reply({ content: `Uwu mode set to: **${mode}**`, ephemeral: true });
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
    .addSubcommand((sub) => sub.setName('list').setDescription('List active keywords, file names, and status'))
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Toggle embed suppression feature on or off')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable (true) or disable (false). Omit to flip.')
        )
    ),

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
    } else if (sub === 'toggle') {
      const explicit = interaction.options.getBoolean('enabled');
      const state = await toggleFeature('suppress', explicit);
      await interaction.reply({
        content: `${state ? '✅' : '⏸️'} Embed suppression is now **${state ? 'ENABLED' : 'DISABLED'}**.`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      const list = cfg.suppressKeywords.map((k, i) => `${i + 1}. \`${k}\``).join('\n') || '_None_';
      const isEnabled = cfg.suppressEnabled !== false;
      const embed = new EmbedBuilder()
        .setTitle('Suppressed Keywords')
        .setDescription(list)
        .addFields({
          name: '⚡ Feature Status',
          value: isEnabled ? '✅ **Enabled**' : '⏸️ **Disabled** (Paused)',
        });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export const toggleCommand = {
  data: new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Toggle bot features (uwuify or embed suppression) on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName('feature')
        .setDescription('Feature to toggle')
        .setRequired(true)
        .addChoices(
          { name: 'Uwuify', value: 'uwu' },
          { name: 'Embed Suppression', value: 'suppress' }
        )
    )
    .addBooleanOption((opt) =>
      opt.setName('enabled').setDescription('Enable (true) or disable (false). Omit to flip.')
    ),

  async execute(interaction) {
    const feature = interaction.options.getString('feature');
    const explicit = interaction.options.getBoolean('enabled');
    const state = await toggleFeature(feature, explicit);
    const name = feature === 'uwu' ? 'Uwuification' : 'Embed Suppression';
    await interaction.reply({
      content: `${state ? '✅' : '⏸️'} **${name}** is now **${state ? 'ENABLED' : 'DISABLED'}**.`,
      ephemeral: true,
    });
  },
};

export const commands = [uwuCommand, suppressCommand, toggleCommand];
export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
