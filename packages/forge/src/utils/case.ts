function splitWords(input: string): string[] {
  return input
    .replace(/^@/, '')
    .replace(/[\\/]/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toPascalCase(input: string): string {
  return splitWords(input)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : pascal;
}

export function toKebabCase(input: string): string {
  return splitWords(input)
    .map((part) => part.toLowerCase())
    .join('-');
}

export function toSnakeCase(input: string): string {
  return splitWords(input)
    .map((part) => part.toLowerCase())
    .join('_');
}

export function pluralize(input: string): string {
  if (input.endsWith('s')) {
    return input;
  }

  if (input.endsWith('y') && !/[aeiou]y$/i.test(input)) {
    return `${input.slice(0, -1)}ies`;
  }

  return `${input}s`;
}

export function routePathFromName(input: string): string {
  return `/${toKebabCase(pluralize(input))}`;
}
