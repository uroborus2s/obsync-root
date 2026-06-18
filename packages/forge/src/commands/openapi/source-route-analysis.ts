import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
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

export interface SourceRouteContract {
  method: string;
  path: string;
  openApiPath: string;
  controllerName: string;
  handlerName: string;
  schema?: SourceRouteSchema;
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

function loadProjectTypeScript(rootDir: string): any {
  try {
    const projectRequire = createRequire(path.join(rootDir, 'package.json'));
    return projectRequire('typescript');
  } catch {
    throw new CliError(
      'stratix openapi generate requires the target project to install typescript.'
    );
  }
}

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

function decoratorsOf(ts: any, node: any): readonly any[] {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : [];
}

function decoratorCall(ts: any, decorator: any): any | null {
  return ts.isCallExpression(decorator.expression) ? decorator.expression : null;
}

function expressionName(ts: any, expression: any): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function propertyName(ts: any, name: any): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw new CliError(`Unsupported schema property name: ${name.getText()}`);
}

function literalValue(ts: any, node: any): unknown {
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties.map((property: any) => {
        if (!ts.isPropertyAssignment(property)) {
          throw new CliError(
            `Only static property assignments are supported in route schemas: ${property.getText()}`
          );
        }

        return [
          propertyName(ts, property.name),
          literalValue(ts, property.initializer)
        ];
      })
    );
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element: any) => literalValue(ts, element));
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }

  throw new CliError(
    `Route schemas must be static object literals; unsupported value: ${node.getText()}`
  );
}

function objectProperty(ts: any, node: any, key: string): any | undefined {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (propertyName(ts, property.name) === key) {
      return property.initializer;
    }
  }
  return undefined;
}

function parseRouteCall(
  ts: any,
  call: any
): {
  path: string;
  schema?: SourceRouteSchema;
} {
  const pathArg = call.arguments[0];
  const routePath =
    pathArg && (ts.isStringLiteral(pathArg) || ts.isNoSubstitutionTemplateLiteral(pathArg))
      ? pathArg.text
      : '/';
  const optionsArg = call.arguments[1];

  if (!optionsArg) {
    return { path: routePath };
  }

  if (!ts.isObjectLiteralExpression(optionsArg)) {
    throw new CliError(
      `Route options must be static object literals: ${optionsArg.getText()}`
    );
  }

  const schemaExpression = objectProperty(ts, optionsArg, 'schema');
  if (!schemaExpression) {
    return { path: routePath };
  }

  if (!ts.isObjectLiteralExpression(schemaExpression)) {
    throw new CliError(
      `Route schema must be a static object literal: ${schemaExpression.getText()}`
    );
  }

  return {
    path: routePath,
    schema: literalValue(ts, schemaExpression) as SourceRouteSchema
  };
}

function classNameOf(node: any, filePath: string): string {
  return node.name?.text || path.basename(filePath, path.extname(filePath));
}

function methodNameOf(ts: any, node: any): string {
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) {
    return node.name.text;
  }
  throw new CliError(`Unsupported route handler name: ${node.name.getText()}`);
}

function toOpenApiPath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function analyzeSourceRoutes(rootDir: string): SourceRouteContract[] {
  const ts = loadProjectTypeScript(rootDir);
  const contracts: SourceRouteContract[] = [];

  for (const filePath of collectTypeScriptFiles(path.join(rootDir, 'src'))) {
    const source = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    function visit(node: any): void {
      if (!ts.isClassDeclaration(node)) {
        ts.forEachChild(node, visit);
        return;
      }

      const controllerDecorator = decoratorsOf(ts, node)
        .map((decorator) => decoratorCall(ts, decorator))
        .some((call) => call && expressionName(ts, call.expression) === 'Controller');
      if (!controllerDecorator) {
        return;
      }

      const controllerName = classNameOf(node, filePath);

      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) {
          continue;
        }

        for (const decorator of decoratorsOf(ts, member)) {
          const call = decoratorCall(ts, decorator);
          if (!call) {
            continue;
          }

          const decoratorName = expressionName(ts, call.expression);
          const method = decoratorName ? ROUTE_DECORATORS.get(decoratorName) : undefined;
          if (!method) {
            continue;
          }

          const route = parseRouteCall(ts, call);
          contracts.push({
            method,
            path: route.path,
            openApiPath: toOpenApiPath(route.path),
            controllerName,
            handlerName: methodNameOf(ts, member),
            schema: route.schema,
            tags: Array.isArray(route.schema?.tags)
              ? route.schema.tags.map(String)
              : undefined,
            sourceFile: path.relative(rootDir, filePath)
          });
        }
      }
    }

    visit(sourceFile);
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
      contract.schema?.operationId ||
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

    if (options.requireOperationId && !contract.schema?.operationId) {
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

function schemaProperties(schema: JsonSchemaObject | undefined): JsonSchemaObject {
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
        contract.schema?.operationId ||
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
