// Post-build fixups for the bundled .js files. Two problems, both rooted in how
// the bundler (Vite/rolldown + esbuild) handles Temml's lexer regex:
//
// 1. SURROGATE CORRUPTION: Temml writes `[\uD800-\uDBFF][\uDC00-\uDFFF]` (escapes)
//    in its tokenizer. The bundler turns each `\u` before a surrogate hex into the
//    replacement char U+FFFD, yielding `[�d800-�dbff]`. That char class then
//    matches almost anything, so `\int` tokenizes as `\i` ("Unsupported function
//    name"). We repair `�dXXX` -> `\udXXX` on disk.
//
// 2. NON-CHARACTERS: a Temml regex bound is U+FFFF; Chrome's content-script loader
//    (base::IsStringUTF8) rejects Unicode non-characters with a misleading "isn't
//    UTF-8 encoded" error even though the bytes are valid. We escape those to
//    \uXXXX. Ordinary chars (Greek, ∑) are left readable.
//
// Usage: node scripts/ascii-escape.mjs <dir>
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Repair surrogate escapes the bundler mangled to U+FFFD (e.g. �d800 -> \ud800). */
const FFFD = String.fromCharCode(0xfffd);
const SURROGATE_REPAIR = new RegExp(FFFD + '(d[0-9a-fA-F]{3})', 'g');
function repairSurrogateEscapes(code) {
  return code.replace(SURROGATE_REPAIR, '\\u$1');
}

function isNonCharacter(cp) {
  const low = cp & 0xffff;
  return (cp >= 0xfdd0 && cp <= 0xfdef) || low === 0xfffe || low === 0xffff;
}

function escapeNonCharacters(code) {
  let out = '';
  for (let i = 0; i < code.length; i++) {
    const cp = code.codePointAt(i);
    const astral = cp > 0xffff;
    if (isNonCharacter(cp)) {
      if (astral) {
        out +=
          '\\u' + code.charCodeAt(i).toString(16).padStart(4, '0') +
          '\\u' + code.charCodeAt(i + 1).toString(16).padStart(4, '0');
      } else {
        out += '\\u' + cp.toString(16).padStart(4, '0');
      }
    } else {
      out += astral ? code[i] + code[i + 1] : code[i];
    }
    if (astral) i++;
  }
  return out;
}

export function asciiEscapeFile(path) {
  const code = readFileSync(path, 'utf8');
  const fixed = escapeNonCharacters(repairSurrogateEscapes(code));
  if (fixed === code) return false;
  writeFileSync(path, fixed, 'utf8');
  return true;
}

export function asciiEscapeDir(dir) {
  let changed = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) changed += asciiEscapeDir(full);
    else if (name.endsWith('.js') && asciiEscapeFile(full)) changed++;
  }
  return changed;
}

if (process.argv[1] && process.argv[1].endsWith('ascii-escape.mjs')) {
  const root = process.argv[2] ?? '.output';
  const n = asciiEscapeDir(root);
  console.log(`ascii-escape: rewrote ${n} file(s) under ${root}`);
}
