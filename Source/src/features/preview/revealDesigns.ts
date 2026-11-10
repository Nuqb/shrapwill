import designs from '../library/catalog/transitions.json' with { type: 'json' };
export { designs };

export function designThreshold(d: (typeof designs)[number], x: number, y: number) {
  if (d.axis && d.family !== 'shape') [x, y] = [y, x];
  const center = d.count === 4 ? 0.5 : 0.33;
  let value = 0;
  switch (d.family) {
    case 'diagonal':
      value = (x + ((d.axis ? 1 - y : y) * d.count) / 4) / (1 + d.count / 4);
      break;
    case 'door':
      value = Math.abs(x - center) / Math.max(center, 1 - center);
      break;
    case 'shape': {
      const c = d.count === 4 ? 0.5 : 0.2;
      value = d.axis
        ? Math.max(Math.abs(x - c), Math.abs(y - c)) / (1 - c)
        : (Math.abs(x - c) + Math.abs(y - c)) / (2 * (1 - c));
      break;
    }
    case 'stripe':
      value = (x * d.count) % 1;
      break;
    case 'zigzag':
      value = (x + Math.abs(((y * d.count) % 1) * 2 - 1) * 0.2) / 1.2;
      break;
    case 'tile':
      value =
        (Math.floor(y * d.count) * d.count + Math.floor(x * d.count) + ((x * d.count) % 1)) /
        (d.count * d.count);
      break;
  }
  return Math.max(0, Math.min(1, d.reverse ? 1 - value : value));
}
// Generate shader expressions only from bundled numeric/enum catalog fields.
export function designExpression(d: (typeof designs)[number]) {
  const [x, y] = d.axis && d.family !== 'shape' ? ['p.y', 'p.x'] : ['p.x', 'p.y'];
  const n = `${d.count}.`;
  const c = d.count === 4 ? '.5' : '.33';
  const radius = d.count === 4 ? '.5' : '.67';
  const expressions: Record<string, string> = {
    diagonal: `(${x}+${d.axis ? `(1.-${y})` : y}*${n}/4.)/(1.+${n}/4.)`,
    door: `abs(${x}-${c})/${radius}`,
    shape: d.axis
      ? `max(abs(p.x-${d.count === 4 ? '.5' : '.2'}),abs(p.y-${d.count === 4 ? '.5' : '.2'}))/${d.count === 4 ? '.5' : '.8'}`
      : `(abs(p.x-${d.count === 4 ? '.5' : '.2'})+abs(p.y-${d.count === 4 ? '.5' : '.2'}))/${d.count === 4 ? '1.' : '1.6'}`,
    stripe: `fract(${x}*${n})`,
    zigzag: `(${x}+abs(fract(${y}*${n})*2.-1.)*.2)/1.2`,
    tile: `(floor(${y}*${n})*${n}+floor(${x}*${n})+fract(${x}*${n}))/(${n}*${n})`,
  };
  return d.reverse ? `1.-(${expressions[d.family]})` : expressions[d.family];
}
