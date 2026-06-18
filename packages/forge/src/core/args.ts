export interface ParsedArgs {
  _: string[];
  [key: string]: unknown;
}

interface ParseOptions {
  boolean: string[];
  string: string[];
  alias: Record<string, string>;
}

function appendValue(target: ParsedArgs, key: string, value: unknown): void {
  const current = target[key];

  if (current === undefined) {
    target[key] = value;
    return;
  }

  if (Array.isArray(current)) {
    current.push(value);
    target[key] = current;
    return;
  }

  target[key] = [current, value];
}

export function parseArgs(args: string[], options: ParseOptions): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };
  const booleanKeys = new Set(options.boolean);
  const stringKeys = new Set(options.string);

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith('-') || token === '-') {
      parsed._.push(token);
      continue;
    }

    if (token.startsWith('--')) {
      const [rawKey, inlineValue] = token.slice(2).split('=', 2);
      const key = rawKey;

      if (booleanKeys.has(key) || key.startsWith('no-')) {
        parsed[key] = inlineValue === undefined ? true : inlineValue !== 'false';
        continue;
      }

      if (inlineValue !== undefined) {
        appendValue(parsed, key, inlineValue);
        continue;
      }

      if (stringKeys.has(key)) {
        appendValue(parsed, key, args[index + 1]);
        index += 1;
        continue;
      }

      parsed[key] = true;
      continue;
    }

    const shortKey = token.slice(1);
    const key = options.alias[shortKey] || shortKey;

    if (booleanKeys.has(key)) {
      parsed[key] = true;
      continue;
    }

    if (stringKeys.has(key)) {
      appendValue(parsed, key, args[index + 1]);
      index += 1;
      continue;
    }

    parsed[key] = true;
  }

  return parsed;
}
