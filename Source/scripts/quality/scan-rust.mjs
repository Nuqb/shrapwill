// Lexical Rust scan: ignore comments and literals before matching function bodies.
// This reports size/arity; clippy and human review cover Rust nesting/cognitive load.
function maskLiterals(text) {
  return text.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|(?:b)?r(#+)?"[\s\S]*?"\1|"(?:\\[\s\S]|[^"\\])*"|'(?:\\.|[^'\\])'/g,
    (value) => value.replace(/[^\n]/g, ' '),
  );
}

function matching(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    if (text[i] === close && --depth === 0) return i;
  }
  return -1;
}

function parameters(text) {
  let depth = 0;
  let count = 0;
  for (const char of text) {
    if ('([{<'.includes(char)) depth++;
    if (')]}>'.includes(char)) depth--;
    if (char === ',' && depth === 0) count++;
  }
  return text.trim() ? count + Number(!text.trim().endsWith(',')) : 0;
}

export function scanRust(text, file) {
  const masked = maskLiterals(text);
  const findings = [];
  for (const match of masked.matchAll(/\bfn\s+(\w+)\s*(?:<[^{};]*>)?\s*\(/g)) {
    const start = match.index;
    const argsStart = masked.indexOf('(', start);
    const argsEnd = matching(masked, argsStart, '(', ')');
    const brace = masked.indexOf('{', argsEnd);
    const semicolon = masked.indexOf(';', argsEnd);
    if (brace < 0 || (semicolon >= 0 && semicolon < brace)) continue;
    const end = matching(masked, brace, '{', '}');
    const line = masked.slice(0, start).split('\n').length;
    const length = masked.slice(start, end + 1).split('\n').length;
    const arity = parameters(masked.slice(argsStart + 1, argsEnd));
    for (const [rule, value, limit] of [
      ['length', length, 40],
      ['parameters', arity, 4],
    ]) {
      if (value > limit) findings.push({ file, line, name: match[1], rule, value, limit });
    }
  }
  return findings;
}
