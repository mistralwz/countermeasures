import assert from 'node:assert/strict';
import { uwuify, isUwufiable } from '../src/uwuify.js';
import {
  getConfig,
  addTargetUserId,
  removeTargetUserId,
  isTargetUser,
  addSuppressKeyword,
  removeSuppressKeyword,
  setUwuMode,
  setGlobalChance,
  toggleFeature,
} from '../src/config.js';
import { uwuCommand, suppressCommand, toggleCommand } from '../src/commands.js';
import { buildReplyEmbed } from '../src/handlers.js';

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
  }
}

async function runTests() {
  console.log('🧪 Testing Countermeasures...');

  await test('Uwuify sound transformations', () => {
    const res = uwuify('hello world, this is a real test!', { faceChance: 0, stutterChance: 0 });
    assert.match(res, /hewwo/i);
    assert.match(res, /wowwd/i);
    assert.match(res, /weaw/i);
  });

  await test('Uwuify vocabulary replacements', () => {
    const res = uwuify('stop, that small cat is so cute and fluffy, please love it!', { faceChance: 0, stutterChance: 0 });
    assert.match(res, /yamete/i);
    assert.match(res, /smol/i);
    assert.match(res, /kawaii~/i);
    assert.match(res, /floofy/i);
    assert.match(res, /pwease/i);
    assert.match(res, /wuv/i);
  });

  await test('Uwuify preserves URLs', () => {
    const url = 'https://twitter.com/user/status/123456?ref=real_test';
    const res = uwuify(`Check link: ${url}`, { faceChance: 0, stutterChance: 0 });
    assert.ok(res.includes(url));
  });

  await test('Uwuify preserves Discord emojis and mentions', () => {
    const emoji = '<:pepe:123456789012345678>';
    const mention = '<@1234567890>';
    const res = uwuify(`Look at ${emoji} and ${mention}`, { faceChance: 0, stutterChance: 0 });
    assert.ok(res.includes(emoji));
    assert.ok(res.includes(mention));
  });

  await test('Config manager targets', async () => {
    const id = '111222333444555666';
    await removeTargetUserId(id);
    assert.strictEqual(isTargetUser(id), false);
    await addTargetUserId(id);
    assert.strictEqual(isTargetUser(id), true);
    await removeTargetUserId(id);
    assert.strictEqual(isTargetUser(id), false);
  });

  await test('Config manager keywords & mode', async () => {
    await addSuppressKeyword('TestKeyword.com');
    assert.ok(getConfig().suppressKeywords.includes('testkeyword.com'));
    await removeSuppressKeyword('testkeyword.com');
    assert.strictEqual(getConfig().suppressKeywords.includes('testkeyword.com'), false);

    await setUwuMode('reply');
    assert.strictEqual(getConfig().uwuMode, 'reply');
    await setUwuMode('webhook');
    assert.strictEqual(getConfig().uwuMode, 'webhook');

    await setGlobalChance(0.25);
    assert.strictEqual(getConfig().globalChance, 0.25);
    await setGlobalChance(0);
    assert.strictEqual(getConfig().globalChance, 0);
  });

  await test('Commands serialize to Discord JSON', () => {
    assert.strictEqual(uwuCommand.data.toJSON().name, 'uwu');
    assert.strictEqual(suppressCommand.data.toJSON().name, 'suppress');
  });

  await test('File name suppression matching logic', () => {
    const keywords = ['spoiler.mp4', 'secret.pdf', 'tiktok.com'];
    const msgWithAttachment = {
      content: 'Here is a file',
      attachments: [{ name: 'SPOILER.MP4' }],
    };
    const msgWithUrlFile = {
      content: 'Check out https://example.com/files/secret.pdf',
      attachments: [],
    };
    const msgNormal = {
      content: 'Just chatting',
      attachments: [{ name: 'cute_cat.png' }],
    };

    const check = (msg) => {
      const content = msg.content.toLowerCase();
      const files = msg.attachments.map((a) => a.name.toLowerCase());
      return keywords.some((kw) => content.includes(kw) || files.some((f) => f.includes(kw)));
    };

    assert.strictEqual(check(msgWithAttachment), true);
    assert.strictEqual(check(msgWithUrlFile), true);
    assert.strictEqual(check(msgNormal), false);
  });

  await test('Unuwuifiable messages are detected correctly', () => {
    assert.strictEqual(isUwufiable('https://x.com/status/12345'), false);
    assert.strictEqual(isUwufiable('<:pepe:123456789012345678>'), false);
    assert.strictEqual(isUwufiable('```js const x = 1; ```'), false);
    assert.strictEqual(isUwufiable('`inline code`'), false);
    assert.strictEqual(isUwufiable('12345 67890'), false);
    assert.strictEqual(isUwufiable('👍 🎉'), false);
    assert.strictEqual(isUwufiable('<@1234567890>'), false);
    assert.strictEqual(isUwufiable('hello world'), true);
    assert.strictEqual(isUwufiable('hello https://x.com'), true);
  });

  await test('Messages with only an image or image link are never uwuified', () => {
    // 1. Direct image upload with no text
    const imgUpload = { content: '', attachments: [{ url: 'https://cdn.discordapp.com/attachments/1/2/cat.png' }] };
    const text1 = imgUpload.content?.trim() || '';
    assert.strictEqual(!text1 || !isUwufiable(text1), true);

    // 2. Pure image link (e.g. imgur, tenor, or cdn link)
    const imgLink = { content: 'https://i.imgur.com/cat.png', attachments: [] };
    const text2 = imgLink.content?.trim() || '';
    assert.strictEqual(!text2 || !isUwufiable(text2), true);

    // 3. Image with caption
    const imgWithCaption = { content: 'Look at this cat', attachments: [{ url: 'https://cdn.../cat.png' }] };
    const text3 = imgWithCaption.content?.trim() || '';
    assert.strictEqual(!text3 || !isUwufiable(text3), false);
  });

  await test('Feature toggles enable and disable features correctly', async () => {
    // Test uwu toggle
    await toggleFeature('uwu', false);
    assert.strictEqual(getConfig().uwuEnabled, false);
    await toggleFeature('uwu');
    assert.strictEqual(getConfig().uwuEnabled, true);

    // Test suppress toggle
    await toggleFeature('suppress', false);
    assert.strictEqual(getConfig().suppressEnabled, false);
    await toggleFeature('suppress');
    assert.strictEqual(getConfig().suppressEnabled, true);

    // Test toggle command JSON definition
    const toggleJson = toggleCommand.data.toJSON();
    assert.strictEqual(toggleJson.name, 'toggle');
    assert.strictEqual(toggleJson.options.length, 2);
  });

  await test('buildReplyEmbed returns null when no reference exists', async () => {
    const embed = await buildReplyEmbed({ reference: null });
    assert.strictEqual(embed, null);
    const embed2 = await buildReplyEmbed({});
    assert.strictEqual(embed2, null);
  });

  await test('buildReplyEmbed creates rich embed when reference resolves', async () => {
    const mockMessage = {
      guildId: '111',
      channelId: '222',
      reference: { messageId: '333', channelId: '222' },
      fetchReference: async () => ({
        id: '333',
        content: 'Check out this cool test message!',
        author: {
          username: 'tester',
          displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/1/avatar.png',
        },
        attachments: new Map(),
      }),
    };

    const embed = await buildReplyEmbed(mockMessage);
    assert.ok(embed);
    const json = embed.toJSON();
    assert.strictEqual(json.author.name, 'tester ↩️');
    assert.strictEqual(json.author.icon_url, 'https://cdn.discordapp.com/avatars/1/avatar.png');
    assert.ok(json.description.includes('https://discord.com/channels/111/222/333'));
    assert.ok(json.description.includes('Check out this cool test message!'));
  });

  await test('buildReplyEmbed truncates long text and notes attachments', async () => {
    const longContent = 'A'.repeat(200);
    const mockMessage = {
      guildId: '111',
      channelId: '222',
      reference: { messageId: '444', channelId: '222' },
      fetchReference: async () => ({
        id: '444',
        content: longContent,
        author: {
          username: 'uploader',
          displayAvatarURL: () => null,
        },
        attachments: new Map([['att1', { name: 'photo.png' }]]),
      }),
    };

    const embed = await buildReplyEmbed(mockMessage);
    const json = embed.toJSON();
    assert.ok(json.description.includes('… 📎'));
    assert.ok(json.description.length < 250);
  });

  await test('buildReplyEmbed creates fallback jump link if fetchReference fails', async () => {
    const mockMessage = {
      guildId: '111',
      channelId: '222',
      reference: { messageId: '555', channelId: '222' },
      fetchReference: async () => {
        throw new Error('Unknown Message');
      },
    };

    const embed = await buildReplyEmbed(mockMessage);
    assert.ok(embed);
    const json = embed.toJSON();
    assert.strictEqual(json.description, '**[Replying to message](https://discord.com/channels/111/222/555)** ↩️');
  });

  console.log(`\nResults: ${passed}/${total} passed.`);
  if (passed !== total) process.exit(1);
}

runTests();
