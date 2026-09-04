const FACES = [
  '(・ω・)',
  '(✿◡‿◡)',
  '(* ^ ω ^)',
  '(o´∀`o)',
  '(≧◡≦)',
  '( ᴜ ω ᴜ )',
  '(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)',
  '(◕‿◕✿)',
  '( ◡‿◡ *)',
  'UwU',
  'OwO',
  '>w<',
  ':3',
  'nya~',
  '(*>ω<)',
];

const ACTIONS = [
  '*blushes*',
  '*notices*',
  '*pounces*',
  '*giggles*',
  '*wiggles*',
  '*sweats*',
  '*purrs*',
  '*nuzzles*',
  '*boops your nose*',
];

const WORD_REPLACEMENTS = [
  [/\bsmall\b/gi, 'smol'],
  [/\bcute\b/gi, 'kawaii~'],
  [/\bfluff\b/gi, 'floof'],
  [/\bfluffy\b/gi, 'floofy'],
  [/\blove\b/gi, 'wuv'],
  [/\bplease\b/gi, 'pwease'],
  [/\bthanks\b/gi, 'thankies'],
  [/\bthank you\b/gi, 'thankies'],
  [/\bhello\b/gi, 'hewwo'],
  [/\bhi\b/gi, 'hewwo'],
  [/\bstop\b/gi, 'yamete'],
  [/\bwhat\b/gi, 'wat'],
  [/\bgod\b/gi, 'kami-sama'],
  [/\bgood\b/gi, 'gud'],
  [/\bgreat\b/gi, 'gweat'],
  [/\bfather\b/gi, 'daddy'],
  [/\bdad\b/gi, 'daddy'],
  [/\bmother\b/gi, 'mommy'],
  [/\bmom\b/gi, 'mommy'],
];

const PROTECTED = /(```[\s\S]*?```|`[^`]+`|<a?:[a-zA-Z0-9_]+:[0-9]+>|<@&?[0-9]+>|<#[0-9]+>|<t:[0-9]+(?::[a-zA-Z])?>|https?:\/\/[^\s]+)/g;

function matchCase(source, target) {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

export function uwuify(text, options = {}) {
  if (!text || typeof text !== 'string') return text || '';

  const stutterChance = options.stutterChance ?? 0.15;
  const faceChance = options.faceChance ?? 0.35;
  const actionChance = options.actionChance ?? 0.08;

  const items = [];
  let out = text.replace(PROTECTED, (m) => {
    items.push(m);
    return `\uFFF0${items.length - 1}\uFFF1`;
  });

  // 1. Vocabulary replacements (protected so their intended spelling isn't mangled)
  for (const [regex, repl] of WORD_REPLACEMENTS) {
    out = out.replace(regex, (m) => {
      const replaced = matchCase(m, repl);
      items.push(replaced);
      return `\uFFF0${items.length - 1}\uFFF1`;
    });
  }

  // 2. Sound & letter transformations
  out = out
    .replace(/(o|O)ve/g, '$1uv')
    .replace(/\bth([aeiouy])/gi, (m, p1) => (m[0] === m[0].toUpperCase() ? 'D' : 'd') + p1)
    .replace(/th\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'F' : 'f'))
    .replace(/n([aeiou])/g, 'ny$1')
    .replace(/N([aeiou])/g, 'Ny$1')
    .replace(/N([AEIOU])/g, 'NY$1')
    .replace(/[rl]/g, 'w')
    .replace(/[RL]/g, 'W');

  // 3. Stuttering
  out = out.replace(/\b([b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z])([a-zA-Z]{2,})\b/g, (m, f) =>
    Math.random() < stutterChance ? `${f}-${m}` : m
  );

  // 4. Exclamations / Punctuation with faces and actions
  out = out.replace(/([.!?]+)(\s|$)/g, (m, p, s) => {
    const roll = Math.random();
    if (roll < actionChance) {
      return ` ${ACTIONS[Math.floor(Math.random() * ACTIONS.length)]}${s}`;
    }
    if (roll < faceChance) {
      return ` ${FACES[Math.floor(Math.random() * FACES.length)]}${s}`;
    }
    return m;
  });

  // Ensure at least one face or action if message had substance
  const hasFaceOrAction = FACES.some((f) => out.includes(f)) || ACTIONS.some((a) => out.includes(a));
  if (!hasFaceOrAction && out.trim().length > 10) {
    out = `${out.trim()} ${FACES[Math.floor(Math.random() * FACES.length)]}`;
  }

  // 5. Restore protected tokens
  for (let i = 0; i < items.length; i++) {
    out = out.replace(`\uFFF0${i}\uFFF1`, items[i]);
  }

  return out.length > 2000 ? out.slice(0, 1997) + '...' : out;
}

export function isUwufiable(text) {
  if (!text || typeof text !== 'string') return false;
  const stripped = text.replace(PROTECTED, '').trim();
  return /[a-zA-Z]/.test(stripped);
}
