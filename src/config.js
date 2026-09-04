import fs from 'node:fs';

const CONFIG_URL = new URL('../config.json', import.meta.url);
const DEFAULTS = {
  targetUserIds: [],
  targetEveryone: false,
  suppressKeywords: ['twitter.com', 'x.com', 'tiktok.com', 'instagram.com'],
  uwuMode: 'webhook',
  uwuChance: 1.0,
  deleteOriginalMessage: true,
};

let current = null;

export function loadConfig() {
  try {
    current = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_URL, 'utf-8')) };
  } catch {
    current = { ...DEFAULTS };
    fs.writeFileSync(CONFIG_URL, JSON.stringify(current, null, 2));
  }
  return current;
}

current = loadConfig();

export function getConfig() {
  return current;
}

let writeChain = Promise.resolve();
export function saveConfig() {
  writeChain = writeChain.then(async () => {
    const tmp = new URL(`../config.json.tmp`, import.meta.url);
    await fs.promises.writeFile(tmp, JSON.stringify(current, null, 2));
    await fs.promises.rename(tmp, CONFIG_URL);
  }).catch((err) => console.error('[Config] Save error:', err.message));
  return writeChain;
}

export const isTargetUser = (id) => Boolean(current.targetEveryone || current.targetUserIds.includes(id));

export async function setTargetEveryone(val) {
  current.targetEveryone = Boolean(val);
  await saveConfig();
  return current.targetEveryone;
}

export async function addTargetUserId(id) {
  if (current.targetUserIds.includes(id)) return false;
  current.targetUserIds.push(id);
  await saveConfig();
  return true;
}

export async function removeTargetUserId(id) {
  const i = current.targetUserIds.indexOf(id);
  if (i === -1) return false;
  current.targetUserIds.splice(i, 1);
  await saveConfig();
  return true;
}

export async function addSuppressKeyword(kw) {
  const norm = kw.trim().toLowerCase();
  if (!norm || current.suppressKeywords.includes(norm)) return false;
  current.suppressKeywords.push(norm);
  await saveConfig();
  return true;
}

export async function removeSuppressKeyword(kw) {
  const norm = kw.trim().toLowerCase();
  const i = current.suppressKeywords.indexOf(norm);
  if (i === -1) return false;
  current.suppressKeywords.splice(i, 1);
  await saveConfig();
  return true;
}

export async function setUwuMode(mode) {
  if (mode !== 'webhook' && mode !== 'reply') return false;
  current.uwuMode = mode;
  await saveConfig();
  return true;
}

export async function setDeleteOriginalMessage(val) {
  current.deleteOriginalMessage = Boolean(val);
  await saveConfig();
  return current.deleteOriginalMessage;
}

export async function setUwuChance(chance) {
  const num = Number(chance);
  if (isNaN(num) || num < 0 || num > 1) return false;
  current.uwuChance = num;
  await saveConfig();
  return current.uwuChance;
}


