export function parseCampaignNumbers(input: string) {
  const pieces = input.split(/[,;\n\r\t]+/).flatMap(piece => {
    const compact = piece.replace(/[\s()-]/g, '');
    return /^\+?\d{10,15}$/.test(compact) ? [compact] : piece.trim().split(/\s+/);
  }).filter(Boolean);
  const invalid: string[] = [];
  const numbers = new Set<string>();
  let duplicates = 0;
  for (const piece of pieces) {
    let value = piece.replace(/[\s()+-]/g, '');
    if (value.length === 11 && value.startsWith('0')) value = value.slice(1);
    if (!/^\d{10,15}$/.test(value)) { invalid.push(piece); continue; }
    if (value.length === 10) value = `91${value}`;
    if (numbers.has(value)) duplicates++; else numbers.add(value);
  }
  return { numbers: [...numbers], invalid, duplicates };
}
export function scheduleInputIndia(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (key: string) => parts.find(value => value.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function scheduleIsoIndia(input: string) { return new Date(`${input}:00+05:30`).toISOString(); }
