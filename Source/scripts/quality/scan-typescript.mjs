import ts from 'typescript';

const controls = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.TryStatement,
  ts.SyntaxKind.ConditionalExpression,
]);

function nesting(node, depth = 0) {
  let maximum = depth;
  ts.forEachChild(node, (child) => {
    if (ts.isFunctionLike(child)) return;
    const next = depth + Number(controls.has(child.kind));
    maximum = Math.max(maximum, nesting(child, next));
  });
  return maximum;
}

function functionName(node, source, callback) {
  if (node.name) return node.name.getText(source);
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isVariableDeclaration(node.parent)) return node.parent.name.getText(source);
  return `callback#${callback}`;
}

export function scanTypescript(text, file) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const findings = [];
  const callbacks = new Map();
  function walk(node, scope = '') {
    if (ts.isClassDeclaration(node) && node.name) scope += `${node.name.text}.`;
    if (ts.isFunctionLike(node) && node.body) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const end = source.getLineAndCharacterOfPosition(node.end).line + 1;
      const callback = (callbacks.get(scope) || 0) + 1;
      callbacks.set(scope, callback);
      const name = scope + functionName(node, source, callback);
      const values = { length: end - line + 1, parameters: node.parameters.length };
      values.nesting = nesting(node.body);
      for (const [rule, limit] of [
        ['length', 40],
        ['parameters', 4],
        ['nesting', 3],
      ]) {
        if (values[rule] > limit)
          findings.push({ file, line, name, rule, value: values[rule], limit });
      }
      scope = `${name}.`;
    }
    ts.forEachChild(node, (child) => walk(child, scope));
  }
  walk(source);
  return findings;
}
