const FACES = [
  '(・ω・)',
  '(✿◡‿◡)',
  '(* ^ ω ^)',
  '(o´∀`o)',
  '(≧◡≦)',
  'UwU',
  'OwO',
  '>w<',
  ':3',
  'nya~',
  '(*>ω<)',
];

const PROTECTED = /(```[\s\S]*?```|`[^`]+`|<a?:[a-zA-Z0-9_]+:[0-9]+>|<@&?[0-9]+>|<#[0-9]+>|<t:[0-9]+(?::[a-zA-Z])?>|https?:\/\/[^\s]+)/g;

export function uwuify(text, options = {}) {
  if (!text || typeof text !== 'string') return text || '';

  const stutterChance = options.stutterChance ?? 0.15;
  const faceChance = options.faceChance ?? 0.35;

  const items = [];
  let out = text.replace(PROTECTED, (m) => {
    items.push(m);
    return `\uFFF0${items.length - 1}\uFFF1`;
  });

  out = out
    .replace(/(o|O)ve/g, '$1uv')
    .replace(/\bth([aeiouy])/gi, (m, p1) => (m[0] === m[0].toUpperCase() ? 'D' : 'd') + p1)
    .replace(/th\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'F' : 'f'))
    .replace(/n([aeiou])/g, 'ny$1')
    .replace(/N([aeiou])/g, 'Ny$1')
    .replace(/N([AEIOU])/g, 'NY$1')
    .replace(/[rl]/g, 'w')
    .replace(/[RL]/g, 'W')
    .replace(/\b([b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z])([a-zA-Z]{2,})\b/g, (m, f) =>
      Math.random() < stutterChance ? `${f}-${m}` : m
    )
    .replace(/([.!?]+)(\s|$)/g, (m, p, s) =>
      Math.random() < faceChance ? ` ${FACES[Math.floor(Math.random() * FACES.length)]}${s}` : m
    );

  if (!FACES.some((f) => out.includes(f)) && out.trim().length > 10) {
    out = `${out.trim()} ${FACES[Math.floor(Math.random() * FACES.length)]}`;
  }

  for (let i = 0; i < items.length; i++) {
    out = out.replace(`\uFFF0${i}\uFFF1`, items[i]);
  }

  return out.length > 2000 ? out.slice(0, 1997) + '...' : out;
}
