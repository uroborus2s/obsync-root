export interface OpenApiDocument {
  paths?: Record<string, OpenApiPathItem>;
}

export interface OpenApiPathItem {
  parameters?: OpenApiParameter[];
  [method: string]: OpenApiOperation | OpenApiParameter[] | undefined;
}

export interface OpenApiOperation {
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: JsonSchemaObject;
}

export interface OpenApiRequestBody {
  required?: boolean;
  content?: Record<
    string,
    {
      schema?: JsonSchemaObject;
    }
  >;
}

export interface OpenApiResponse {
  content?: Record<
    string,
    {
      schema?: JsonSchemaObject;
    }
  >;
}

export interface JsonSchemaObject {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  items?: JsonSchemaObject;
  additionalProperties?: boolean | JsonSchemaObject;
  oneOf?: JsonSchemaObject[];
  anyOf?: JsonSchemaObject[];
}

interface ClientParameter {
  location: 'path' | 'query' | 'header';
  name: string;
  propertyName: string;
  required: boolean;
  type: string;
}

interface GeneratedOperation {
  method: string;
  path: string;
  operationId: string;
  functionName: string;
  responseType: string;
  parameters: ClientParameter[];
  paramsType?: string;
  bodyType?: string;
  bodyRequired: boolean;
}

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options'
]);

const GENERATED_CLIENT_HELPERS = [
  'export interface StratixClientRequest {',
  '  operationId: string;',
  '  method: string;',
  '  url: URL;',
  '  init: RequestInit;',
  '}',
  '',
  'export type StratixClientAuthProvider =',
  '  | HeadersInit',
  '  | ((request: StratixClientRequest) => HeadersInit | Promise<HeadersInit>);',
  '',
  'export type StratixClientBeforeRequestHook = (',
  '  request: StratixClientRequest',
  ') => void | Promise<void>;',
  '',
  'export type StratixClientAfterResponseHook = (',
  '  response: Response,',
  '  request: StratixClientRequest',
  ') => void | Response | Promise<void | Response>;',
  '',
  'export interface StratixClientOptions extends RequestInit {',
  '  fetch?: typeof fetch;',
  '  auth?: StratixClientAuthProvider;',
  '  beforeRequest?: StratixClientBeforeRequestHook;',
  '  afterResponse?: StratixClientAfterResponseHook;',
  '}',
  '',
  'function buildUrl(baseUrl: string, path: string): URL {',
  "  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;",
  "  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;",
  '  return new URL(normalizedPath, normalizedBaseUrl);',
  '}',
  '',
  'function appendQuery(url: URL, key: string, value: unknown): void {',
  '  if (value === undefined || value === null) {',
  '    return;',
  '  }',
  '',
  '  const values = Array.isArray(value) ? value : [value];',
  '  for (const entry of values) {',
  '    if (entry !== undefined && entry !== null) {',
  '      url.searchParams.append(key, String(entry));',
  '    }',
  '  }',
  '}',
  '',
  'async function resolveAuthHeaders(',
  '  auth: StratixClientAuthProvider | undefined,',
  '  request: StratixClientRequest',
  '): Promise<HeadersInit | undefined> {',
  '  if (!auth) {',
  '    return undefined;',
  '  }',
  '',
  "  return typeof auth === 'function' ? auth(request) : auth;",
  '}',
  '',
  'function mergeHeaders(headers: Headers, next: HeadersInit | undefined): void {',
  '  if (!next) {',
  '    return;',
  '  }',
  '',
  '  new Headers(next).forEach((value, key) => {',
  '    headers.set(key, value);',
  '  });',
  '}',
  '',
  'function createRequestInit(options: StratixClientOptions): RequestInit {',
  '  const init: RequestInit = {};',
  '',
  '  for (const [key, value] of Object.entries(options)) {',
  "    if (key === 'fetch' || key === 'auth' || key === 'beforeRequest' || key === 'afterResponse') {",
  '      continue;',
  '    }',
  '',
  '    (init as Record<string, unknown>)[key] = value;',
  '  }',
  '',
  '  return init;',
  '}',
  ''
];

function toPascalCase(value: string): string {
  const words =
    value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[a-zA-Z0-9]+/g) || [];

  const pascal = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return pascal || 'Operation';
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSafePropertyName(value: string): string {
  const propertyName = toCamelCase(value);
  return /^[a-zA-Z_$]/.test(propertyName) ? propertyName : `_${propertyName}`;
}

function formatPropertyKey(key: string): string {
  return /^[$A-Z_a-z][$\w]*$/.test(key) ? key : JSON.stringify(key);
}

function singleQuoted(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function escapeTemplateLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function literalType(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  return 'unknown';
}

function withNullable(typeSource: string, nullable: boolean): string {
  return nullable && typeSource !== 'null'
    ? `${typeSource} | null`
    : typeSource;
}

function schemaToType(
  schema: JsonSchemaObject | undefined,
  indent = 0
): string {
  if (!schema) {
    return 'unknown';
  }

  if (schema.const !== undefined) {
    return literalType(schema.const);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map(literalType).join(' | ');
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return schema.oneOf.map((entry) => schemaToType(entry, indent)).join(' | ');
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return schema.anyOf.map((entry) => schemaToType(entry, indent)).join(' | ');
  }

  const schemaTypes = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  const nullable = schemaTypes.includes('null');
  const type = schemaTypes.find((entry) => entry !== 'null');

  switch (type) {
    case 'string':
      return withNullable('string', nullable);
    case 'integer':
    case 'number':
      return withNullable('number', nullable);
    case 'boolean':
      return withNullable('boolean', nullable);
    case 'null':
      return 'null';
    case 'array': {
      const itemType = schemaToType(schema.items, indent);
      const arrayType = itemType.includes(' | ')
        ? `Array<${itemType}>`
        : `${itemType}[]`;
      return withNullable(arrayType, nullable);
    }
    case 'object':
      return withNullable(objectSchemaToType(schema, indent), nullable);
    default:
      if (schema.properties || schema.additionalProperties) {
        return withNullable(objectSchemaToType(schema, indent), nullable);
      }
      return withNullable('unknown', nullable);
  }
}

function objectSchemaToType(schema: JsonSchemaObject, indent: number): string {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);

  if (Object.keys(properties).length === 0) {
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      return `Record<string, ${schemaToType(schema.additionalProperties, indent)}>`;
    }
    return 'Record<string, unknown>';
  }

  const pad = ' '.repeat(indent);
  const innerPad = ' '.repeat(indent + 2);
  const lines = Object.entries(properties).map(([key, propertySchema]) => {
    const optional = required.has(key) ? '' : '?';
    return `${innerPad}${formatPropertyKey(key)}${optional}: ${schemaToType(propertySchema, indent + 2)};`;
  });

  return `{\n${lines.join('\n')}\n${pad}}`;
}

function responseSchema(
  operation: OpenApiOperation
): JsonSchemaObject | undefined {
  const responses = operation.responses || {};
  const status =
    Object.keys(responses).find((candidate) => candidate.startsWith('2')) ||
    Object.keys(responses)[0];
  return status ? jsonSchemaFromContent(responses[status]?.content) : undefined;
}

function requestBodySchema(
  operation: OpenApiOperation
): JsonSchemaObject | undefined {
  return jsonSchemaFromContent(operation.requestBody?.content);
}

function jsonSchemaFromContent(
  content:
    | OpenApiResponse['content']
    | OpenApiRequestBody['content']
    | undefined
): JsonSchemaObject | undefined {
  if (!content) {
    return undefined;
  }

  return (
    content['application/json']?.schema ||
    Object.entries(content).find(([contentType]) =>
      contentType.toLowerCase().includes('json')
    )?.[1]?.schema
  );
}

function isTypeLiteral(typeSource: string): boolean {
  return typeSource.trimStart().startsWith('{');
}

function pushTypeDeclaration(
  lines: string[],
  typeName: string,
  schema: JsonSchemaObject | undefined
): void {
  const typeSource = schemaToType(schema, 0);
  if (isTypeLiteral(typeSource)) {
    lines.push(`export interface ${typeName} ${typeSource}`, '');
    return;
  }

  lines.push(`export type ${typeName} = ${typeSource};`, '');
}

function extractPathParameterNames(path: string): string[] {
  return Array.from(path.matchAll(/\{([^}]+)\}/g), (match) => match[1]).filter(
    (name): name is string => Boolean(name)
  );
}

function collectParameters(
  path: string,
  pathItem: OpenApiPathItem,
  operation: OpenApiOperation
): OpenApiParameter[] {
  const parameters: OpenApiParameter[] = [];

  const upsert = (parameter: OpenApiParameter) => {
    const index = parameters.findIndex(
      (candidate) =>
        candidate.in === parameter.in && candidate.name === parameter.name
    );
    if (index === -1) {
      parameters.push(parameter);
      return;
    }
    parameters[index] = parameter;
  };

  for (const parameter of pathItem.parameters || []) {
    upsert(parameter);
  }

  for (const parameter of operation.parameters || []) {
    upsert(parameter);
  }

  for (const name of extractPathParameterNames(path)) {
    if (
      !parameters.some(
        (parameter) => parameter.in === 'path' && parameter.name === name
      )
    ) {
      upsert({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    }
  }

  return parameters;
}

function toClientParameters(parameters: OpenApiParameter[]): ClientParameter[] {
  const usedPropertyNames = new Set<string>();

  return parameters
    .filter((parameter) =>
      ['path', 'query', 'header'].includes(parameter.in.toLowerCase())
    )
    .map((parameter) => {
      let propertyName = toSafePropertyName(parameter.name);
      let suffix = 2;
      while (usedPropertyNames.has(propertyName)) {
        propertyName = `${toSafePropertyName(parameter.name)}${suffix}`;
        suffix += 1;
      }
      usedPropertyNames.add(propertyName);

      const location =
        parameter.in.toLowerCase() as ClientParameter['location'];
      return {
        location,
        name: parameter.name,
        propertyName,
        required: parameter.required === true || location === 'path',
        type: schemaToType(parameter.schema, 0)
      };
    });
}

function pathTemplate(path: string, parameters: ClientParameter[]): string {
  const byName = new Map(
    parameters
      .filter((parameter) => parameter.location === 'path')
      .map((parameter) => [parameter.name, parameter])
  );
  const parts: string[] = [];
  const pattern = /\{([^}]+)\}/g;
  let cursor = 0;

  for (const match of path.matchAll(pattern)) {
    const index = match.index ?? 0;
    const name = match[1] || '';
    const parameter = byName.get(name);
    parts.push(escapeTemplateLiteral(path.slice(cursor, index)));
    parts.push(
      parameter
        ? `\${encodeURIComponent(String(params.${parameter.propertyName}))}`
        : `\${encodeURIComponent(String(params.${toSafePropertyName(name)}))}`
    );
    cursor = index + match[0].length;
  }

  parts.push(escapeTemplateLiteral(path.slice(cursor)));

  return `\`${parts.join('')}\``;
}

function pushParamsDeclaration(
  lines: string[],
  paramsType: string,
  parameters: ClientParameter[]
): void {
  lines.push(`export interface ${paramsType} {`);
  for (const parameter of parameters) {
    const optional = parameter.required ? '' : '?';
    lines.push(
      `  ${formatPropertyKey(parameter.propertyName)}${optional}: ${parameter.type};`
    );
  }
  lines.push('}', '');
}

function pushOperationFunction(
  lines: string[],
  operation: GeneratedOperation
): void {
  const signature = ['  baseUrl: string'];
  if (operation.paramsType) {
    signature.push(`  params: ${operation.paramsType}`);
  }
  if (operation.bodyType) {
    signature.push(
      operation.bodyRequired
        ? `  body: ${operation.bodyType}`
        : `  body: ${operation.bodyType} | undefined = undefined`
    );
  }
  signature.push('  options: StratixClientOptions = {}');

  lines.push(`export async function ${operation.functionName}(`);
  for (const [index, line] of signature.entries()) {
    lines.push(`${line}${index === signature.length - 1 ? '' : ','}`);
  }
  lines.push(`): Promise<${operation.responseType}> {`);
  lines.push(
    `  const url = buildUrl(baseUrl, ${pathTemplate(operation.path, operation.parameters)});`
  );

  for (const parameter of operation.parameters.filter(
    (candidate) => candidate.location === 'query'
  )) {
    lines.push(
      `  appendQuery(url, ${singleQuoted(parameter.name)}, params.${parameter.propertyName});`
    );
  }

  lines.push('  const fetchFn = options.fetch || fetch;');
  lines.push('  const headers = new Headers(options.headers);');

  for (const parameter of operation.parameters.filter(
    (candidate) => candidate.location === 'header'
  )) {
    lines.push(
      `  headers.set(${singleQuoted(parameter.name)}, String(params.${parameter.propertyName}));`
    );
  }

  lines.push('  const init: RequestInit = {');
  lines.push('    ...createRequestInit(options),');
  lines.push(`    method: ${singleQuoted(operation.method)},`);
  lines.push('    headers');
  lines.push('  };');

  if (operation.bodyType) {
    lines.push('');
    lines.push('  if (body !== undefined) {');
    lines.push("    if (!headers.has('content-type')) {");
    lines.push("      headers.set('content-type', 'application/json');");
    lines.push('    }');
    lines.push('    init.body = JSON.stringify(body);');
    lines.push('  }');
  }

  lines.push('');
  lines.push('  const request: StratixClientRequest = {');
  lines.push(`    operationId: ${singleQuoted(operation.operationId)},`);
  lines.push(`    method: ${singleQuoted(operation.method)},`);
  lines.push('    url,');
  lines.push('    init');
  lines.push('  };');
  lines.push('');
  lines.push(
    '  mergeHeaders(headers, await resolveAuthHeaders(options.auth, request));'
  );
  lines.push('  await options.beforeRequest?.(request);');
  lines.push('');
  lines.push('  const response = await fetchFn(request.url, request.init);');
  lines.push(
    '  const interceptedResponse = await options.afterResponse?.(response, request);'
  );
  lines.push('  const finalResponse = interceptedResponse || response;');
  lines.push('');
  lines.push('  if (!finalResponse.ok) {');
  lines.push(
    `    throw new Error(\`${escapeTemplateLiteral(operation.operationId)} failed with status \${finalResponse.status}\`);`
  );
  lines.push('  }');
  lines.push('');
  lines.push(
    `  return finalResponse.json() as Promise<${operation.responseType}>;`
  );
  lines.push('}', '');
}

export function generateTypedClient(document: OpenApiDocument): string {
  const lines: string[] = [
    '// Generated by stratix openapi client. Do not edit by hand.',
    '',
    ...GENERATED_CLIENT_HELPERS
  ];

  const operations: GeneratedOperation[] = [];

  for (const [routePath, pathItem] of Object.entries(document.paths || {})) {
    for (const [method, value] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }

      const operation = value as OpenApiOperation | undefined;
      if (!operation?.operationId) {
        continue;
      }

      const operationName = toPascalCase(operation.operationId);
      const responseType = `${operationName}Response`;
      const parameters = toClientParameters(
        collectParameters(routePath, pathItem, operation)
      );
      const bodySchema = requestBodySchema(operation);
      const bodyType = operation.requestBody
        ? `${operationName}Body`
        : undefined;
      const paramsType =
        parameters.length > 0 ? `${operationName}Params` : undefined;

      operations.push({
        method: method.toUpperCase(),
        path: routePath,
        operationId: operation.operationId,
        functionName: toCamelCase(operation.operationId),
        responseType,
        parameters,
        paramsType,
        bodyType,
        bodyRequired: operation.requestBody?.required === true
      });

      pushTypeDeclaration(lines, responseType, responseSchema(operation));
      if (paramsType) {
        pushParamsDeclaration(lines, paramsType, parameters);
      }
      if (bodyType) {
        pushTypeDeclaration(lines, bodyType, bodySchema);
      }
    }
  }

  for (const operation of operations) {
    pushOperationFunction(lines, operation);
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
