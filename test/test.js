import assert from 'node:assert/strict';
import { uwuify } from '../src/uwuify.js';
import {
  getConfig,
  addTargetUserId,
  removeTargetUserId,
  isTargetUser,
  addSuppressKeyword,
  removeSuppressKeyword,
  setUwuMode,
} from '../src/config.js';
import { uwuCommand, suppressCommand } from '../src/commands.js';

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
  });

  await test('Commands serialize to Discord JSON', () => {
    assert.strictEqual(uwuCommand.data.toJSON().name, 'uwu');
    assert.strictEqual(suppressCommand.data.toJSON().name, 'suppress');
  });

  console.log(`\nResults: ${passed}/${total} passed.`);
  if (passed !== total) process.exit(1);
}

runTests();
