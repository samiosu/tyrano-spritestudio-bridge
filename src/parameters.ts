export type Parameters = Record<string, string>;

export function identifier(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value || '')) {
    throw new Error('name は半角英数字・_・- の1〜64文字で指定してください。');
  }
  return value;
}

export function number(value: unknown, key: string, fallback: number, min = -Infinity, max = Infinity): number {
  if (value === '' || value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} は ${min}〜${max} の数値で指定してください。`);
  }
  return parsed;
}

export function boolean(value: unknown, key: string, fallback = false): boolean {
  if (value === '' || value === undefined || value === null) return fallback;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new Error(`${key} は true または false で指定してください。`);
}

export function loops(value: unknown = 'true'): number {
  if (value === '' || value === 'true' || value === true) return -1;
  if (value === 'false' || value === false) return 1;
  const count = number(value, 'loop', -1, 1);
  if (!Number.isInteger(count)) throw new Error('loop の回数は正の整数で指定してください。');
  return count;
}

export function projectURL(storage: string, base: string): string {
  if (!storage || !/\.ssfb$/i.test(storage)) throw new Error('storage に .ssfb ファイルを指定してください。');
  return new URL(`./data/others/spritestudio/${storage}`, base).href;
}
