import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import {
  getConfig,
  addTargetUserId,
  removeTargetUserId,
  setUwuMode,
  addSuppressKeyword,
  removeSuppressKeyword,
} from './config.js';

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
      const embed = new EmbedBuilder()
        .setTitle('Target Users')
        .setDescription(list)
        .setFooter({ text: `Mode: ${cfg.uwuMode} | Total: ${cfg.targetUserIds.length}` });
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
    .setDescription('Manage link domains/keywords for embed suppression')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a keyword/domain to suppress embeds')
        .addStringOption((opt) => opt.setName('keyword').setDescription('Domain or keyword').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a keyword/domain')
        .addStringOption((opt) => opt.setName('keyword').setDescription('Domain or keyword').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active keywords')),

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

export const commands = [uwuCommand, suppressCommand];
export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
