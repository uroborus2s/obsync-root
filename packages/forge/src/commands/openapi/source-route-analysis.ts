import fs from 'node:fs';
import path from 'node:path';
import { parseSync, Visitor } from 'oxc-parser';
import { CliError } from '../../core/errors.js';

export type JsonSchemaObject = Record<string, unknown>;

export interface SourceRouteSchema {
  body?: JsonSchemaObject;
  params?: JsonSchemaObject;
  querystring?: JsonSchemaObject;
  query?: JsonSchemaObject;
  headers?: JsonSchemaObject;
  response?: Record<string | number, JsonSchemaObject>;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  [key: string]: unknown;
}

export interface SourceRouteConfig {
  operationId?: string;
  [key: string]: unknown;
}

export interface SourceRouteContract {
  method: string;
  path: string;
  openApiPath: string;
  controllerName: string;
  handlerName: string;
  schema?: SourceRouteSchema;
  config?: SourceRouteConfig;
  tags?: string[];
  sourceFile: string;
}

export interface SourceRouteDiagnostic {
  code:
    | 'ROUTE_SCHEMA_MISSING'
    | 'ROUTE_RESPONSE_SCHEMA_MISSING'
    | 'ROUTE_OPERATION_ID_MISSING'
    | 'ROUTE_DUPLICATE_METHOD_PATH'
    | 'ROUTE_DUPLICATE_OPERATION_ID';
  method: string;
  path: string;
  sourceFile: string;
  controllerName: string;
  handlerName: string;
  message: string;
}

export interface SourceOpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, Record<string, unknown>>>;
}

const ROUTE_DECORATORS = new Map<string, string>([
  ['Get', 'GET'],
  ['Post', 'POST'],
  ['Put', 'PUT'],
  ['Delete', 'DELETE'],
  ['Patch', 'PATCH'],
  ['Head', 'HEAD'],
  ['Options', 'OPTIONS']
]);

function collectTypeScriptFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const nextPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(nextPath));
    } else if (
      entry.isFile() &&
      nextPath.endsWith('.ts') &&
      !nextPath.endsWith('.d.ts') &&
      !nextPath.endsWith('.test.ts') &&
      !nextPath.endsWith('.spec.ts')
    ) {
      files.push(nextPath);
    }
  }

  return files;
}

function decoratorsOf(node: any): readonly any[] {
  return Array.isArray(node.decorators) ? node.decorators : [];
}

function decoratorCall(decorator: any): any | null {
  return decorator.expression?.type === 'CallExpression'
    ? decorator.expression
    : null;
}

function expressionName(expression: any): string | null {
  if (expression?.type === 'Identifier') {
    return expression.name;
  }
  if (
    expression?.type === 'MemberExpression' &&
    expression.property?.type === 'Identifier'
  ) {
    return expression.property.name;
  }
  return null;
}

function nodeText(source: string, node: any): string {
  return source.slice(node?.start ?? 0, node?.end ?? 0);
}

function unwrapExpression(node: any): any {
  let current = node;
  while (
    current &&
    [
      'ChainExpression',
      'ParenthesizedExpression',
      'TSAsExpression',
      'TSNonNullExpression',
      'TSSatisfiesExpression',
      'TSTypeAssertion'
    ].includes(current.type)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(name: any, source: string): string {
  if (name?.type === 'Identifier') {
    return name.name;
  }
  if (
    name?.type === 'Literal' &&
    (typeof name.value === 'string' || typeof name.value === 'number')
  ) {
    return String(name.value);
  }
  throw new CliError(
    `Unsupported schema property name: ${nodeText(source, name)}`
  );
}

function literalValue(node: any, source: string): unknown {
  const expression = unwrapExpression(node);

  if (expression?.type === 'ObjectExpression') {
    return Object.fromEntries(
      expression.properties.map((property: any) => {
        if (property.type !== 'Property' || property.kind !== 'init') {
          throw new CliError(
            `Only static property assignments are supported in route schemas: ${nodeText(source, property)}`
          );
        }

        return [
          propertyName(property.key, source),
          literalValue(property.value, source)
        ];
      })
    );
  }

  if (expression?.type === 'ArrayExpression') {
    return expression.elements.map((element: any) =>
      element === null ? null : literalValue(element, source)
    );
  }

  if (expression?.type === 'Literal') {
    if (
      expression.value === null ||
      ['string', 'number', 'boolean'].includes(typeof expression.value)
    ) {
      return expression.value;
    }
  }

  if (
    expression?.type === 'TemplateLiteral' &&
    expression.expressions.length === 0
  ) {
    return expression.quasis[0]?.value.cooked ?? '';
  }

  if (
    expression?.type === 'UnaryExpression' &&
    expression.operator === '-' &&
    expression.argument?.type === 'Literal' &&
    typeof expression.argument.value === 'number'
  ) {
    return -expression.argument.value;
  }

  throw new CliError(
    `Route schemas must be static object literals; unsupported value: ${nodeText(source, expression)}`
  );
}

function objectProperty(
  node: any,
  key: string,
  source: string
): any | undefined {
  for (const property of node.properties) {
    if (property.type !== 'Property' || property.kind !== 'init') {
      continue;
    }
    if (propertyName(property.key, source) === key) {
      return property.value;
    }
  }
  return undefined;
}

function parseRouteCall(
  call: any,
  source: string
): {
  path: string;
  schema?: SourceRouteSchema;
  config?: SourceRouteConfig;
} {
  const pathArg = unwrapExpression(call.arguments[0]);
  const routePath =
    pathArg?.type === 'Literal' && typeof pathArg.value === 'string'
      ? pathArg.value
      : pathArg?.type === 'TemplateLiteral' && pathArg.expressions.length === 0
        ? pathArg.quasis[0]?.value.cooked || '/'
        : '/';
  const optionsArg = unwrapExpression(call.arguments[1]);

  if (!optionsArg) {
    return { path: routePath };
  }

  if (optionsArg.type !== 'ObjectExpression') {
    throw new CliError(
      `Route options must be static object literals: ${nodeText(source, optionsArg)}`
    );
  }

  const schemaExpression = unwrapExpression(
    objectProperty(optionsArg, 'schema', source)
  );
  const configExpression = unwrapExpression(
    objectProperty(optionsArg, 'config', source)
  );
  let schema: SourceRouteSchema | undefined;
  let config: SourceRouteConfig | undefined;

  if (schemaExpression) {
    if (schemaExpression.type !== 'ObjectExpression') {
      throw new CliError(
        `Route schema must be a static object literal: ${nodeText(source, schemaExpression)}`
      );
    }
    schema = literalValue(schemaExpression, source) as SourceRouteSchema;
  }

  if (configExpression) {
    if (configExpression.type !== 'ObjectExpression') {
      throw new CliError(
        `Route config must be a static object literal: ${nodeText(source, configExpression)}`
      );
    }
    config = literalValue(configExpression, source) as SourceRouteConfig;
  }

  return { path: routePath, schema, config };
}

function classNameOf(node: any, filePath: string): string {
  return node.id?.name || path.basename(filePath, path.extname(filePath));
}

function methodNameOf(node: any, source: string): string {
  if (node.key?.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key?.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value;
  }
  throw new CliError(
    `Unsupported route handler name: ${nodeText(source, node.key)}`
  );
}

function toOpenApiPath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function analyzeSourceRoutes(rootDir: string): SourceRouteContract[] {
  const contracts: SourceRouteContract[] = [];

  for (const filePath of collectTypeScriptFiles(path.join(rootDir, 'src'))) {
    const source = fs.readFileSync(filePath, 'utf8');
    const result = parseSync(filePath, source);
    if (result.errors.length > 0) {
      throw new CliError(
        `Unable to parse ${path.relative(rootDir, filePath)}: ${result.errors[0]?.message || 'unknown syntax error'}`
      );
    }

    const visitor = new Visitor({
      ClassDeclaration(node: any): void {
        const controllerDecorator = decoratorsOf(node)
          .map((decorator) => decoratorCall(decorator))
          .some((call) => call && expressionName(call.callee) === 'Controller');
        if (!controllerDecorator) {
          return;
        }

        const controllerName = classNameOf(node, filePath);

        for (const member of node.body.body) {
          if (member.type !== 'MethodDefinition' || member.kind !== 'method') {
            continue;
          }

          for (const decorator of decoratorsOf(member)) {
            const call = decoratorCall(decorator);
            if (!call) {
              continue;
            }

            const decoratorName = expressionName(call.callee);
            const method = decoratorName
              ? ROUTE_DECORATORS.get(decoratorName)
              : undefined;
            if (!method) {
              continue;
            }

            const route = parseRouteCall(call, source);
            contracts.push({
              method,
              path: route.path,
              openApiPath: toOpenApiPath(route.path),
              controllerName,
              handlerName: methodNameOf(member, source),
              schema: route.schema,
              config: route.config,
              tags: Array.isArray(route.schema?.tags)
                ? route.schema.tags.map(String)
                : undefined,
              sourceFile: path.relative(rootDir, filePath)
            });
          }
        }
      }
    });

    visitor.visit(result.program);
  }

  return contracts.sort((left, right) =>
    `${left.openApiPath}:${left.method}:${left.handlerName}`.localeCompare(
      `${right.openApiPath}:${right.method}:${right.handlerName}`
    )
  );
}

function diagnosticFor(
  code: SourceRouteDiagnostic['code'],
  contract: SourceRouteContract,
  message: string
): SourceRouteDiagnostic {
  return {
    code,
    method: contract.method,
    path: contract.path,
    sourceFile: contract.sourceFile,
    controllerName: contract.controllerName,
    handlerName: contract.handlerName,
    message
  };
}

export function sourceRouteOperationId(
  contract: Pick<SourceRouteContract, 'config' | 'schema'>
): string | undefined {
  return contract.schema?.operationId || contract.config?.operationId;
}

export function validateSourceRouteContracts(
  contracts: SourceRouteContract[],
  options: {
    requireSchema?: boolean;
    requireResponseSchema?: boolean;
    requireOperationId?: boolean;
  } = {}
): SourceRouteDiagnostic[] {
  const diagnostics: SourceRouteDiagnostic[] = [];
  const methodPaths = new Map<string, SourceRouteContract>();
  const operationIds = new Map<string, SourceRouteContract>();

  for (const contract of contracts) {
    const methodPathKey = `${contract.method} ${contract.openApiPath}`;
    const existingMethodPath = methodPaths.get(methodPathKey);
    if (existingMethodPath) {
      diagnostics.push(
        diagnosticFor(
          'ROUTE_DUPLICATE_METHOD_PATH',
          contract,
          `Duplicate route method/path: ${methodPathKey} in ${existingMethodPath.sourceFile} and ${contract.sourceFile}`
        )
      );
    } else {
      methodPaths.set(methodPathKey, contract);
    }

    const operationId =
      sourceRouteOperationId(contract) ||
      `${contract.controllerName}_${contract.handlerName}`;
    const existingOperationId = operationIds.get(operationId);
    if (existingOperationId) {
      diagnostics.push(
        diagnosticFor(
          'ROUTE_DUPLICATE_OPERATION_ID',
          contract,
          `Duplicate route operationId: ${operationId} in ${existingOperationId.sourceFile} and ${contract.sourceFile}`
        )
      );
    } else {
      operationIds.set(operationId, contract);
    }

    if (options.requireSchema && !contract.schema) {
      diagnostics.push(
        diagnosticFor(
          'ROUTE_SCHEMA_MISSING',
          contract,
          `Route ${contract.method} ${contract.path} in ${contract.sourceFile} is missing a schema`
        )
      );
    }

    if (
      options.requireResponseSchema &&
      (!contract.schema?.response ||
        Object.keys(contract.schema.response).length === 0)
    ) {
      diagnostics.push(
        diagnosticFor(
          'ROUTE_RESPONSE_SCHEMA_MISSING',
          contract,
          `Route ${contract.method} ${contract.path} in ${contract.sourceFile} is missing response schema`
        )
      );
    }

    if (options.requireOperationId && !sourceRouteOperationId(contract)) {
      diagnostics.push(
        diagnosticFor(
          'ROUTE_OPERATION_ID_MISSING',
          contract,
          `Route ${contract.method} ${contract.path} in ${contract.sourceFile} is missing operationId`
        )
      );
    }
  }

  return diagnostics;
}

function schemaProperties(
  schema: JsonSchemaObject | undefined
): JsonSchemaObject {
  const properties = schema?.properties;
  return properties && typeof properties === 'object'
    ? (properties as JsonSchemaObject)
    : {};
}

function requiredFields(schema: JsonSchemaObject | undefined): Set<string> {
  const required = schema?.required;
  return new Set(Array.isArray(required) ? required.map(String) : []);
}

function buildParameters(
  schema: SourceRouteSchema | undefined
): Array<Record<string, unknown>> {
  const parameters: Array<Record<string, unknown>> = [];
  const paramsRequired = requiredFields(schema?.params);

  for (const [name, paramSchema] of Object.entries(
    schemaProperties(schema?.params)
  )) {
    parameters.push({
      name,
      in: 'path',
      required: true,
      schema: paramSchema,
      ...(paramsRequired.has(name) ? {} : {})
    });
  }

  const querySchema = schema?.querystring || schema?.query;
  const queryRequired = requiredFields(querySchema);
  for (const [name, paramSchema] of Object.entries(
    schemaProperties(querySchema)
  )) {
    parameters.push({
      name,
      in: 'query',
      required: queryRequired.has(name),
      schema: paramSchema
    });
  }

  const headerRequired = requiredFields(schema?.headers);
  for (const [name, paramSchema] of Object.entries(
    schemaProperties(schema?.headers)
  )) {
    parameters.push({
      name,
      in: 'header',
      required: headerRequired.has(name),
      schema: paramSchema
    });
  }

  return parameters;
}

function buildResponses(
  schema: SourceRouteSchema | undefined
): Record<string, Record<string, unknown>> {
  const responseSchemas = schema?.response;
  if (!responseSchemas || Object.keys(responseSchemas).length === 0) {
    return {
      200: {
        description: '200 response'
      }
    };
  }

  return Object.fromEntries(
    Object.entries(responseSchemas).map(([statusCode, responseSchema]) => [
      statusCode,
      {
        description: `${statusCode} response`,
        content: {
          'application/json': {
            schema: responseSchema
          }
        }
      }
    ])
  );
}

export function generateSourceOpenApiDocument(
  contracts: SourceRouteContract[],
  options: { title: string; version: string }
): SourceOpenApiDocument {
  const document: SourceOpenApiDocument = {
    openapi: '3.1.0',
    info: {
      title: options.title,
      version: options.version
    },
    paths: {}
  };

  for (const contract of contracts) {
    const method = contract.method.toLowerCase();
    const pathItem = (document.paths[contract.openApiPath] ||= {});
    const operation: Record<string, unknown> = {
      operationId:
        sourceRouteOperationId(contract) ||
        `${contract.controllerName}_${contract.handlerName}`,
      responses: buildResponses(contract.schema)
    };

    if (contract.schema?.summary) {
      operation.summary = contract.schema.summary;
    }
    if (contract.schema?.description) {
      operation.description = contract.schema.description;
    }
    if (contract.tags?.length) {
      operation.tags = contract.tags;
    }

    const parameters = buildParameters(contract.schema);
    if (parameters.length) {
      operation.parameters = parameters;
    }

    if (contract.schema?.body) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: contract.schema.body
          }
        }
      };
    }

    pathItem[method] = operation;
  }

  return document;
}
