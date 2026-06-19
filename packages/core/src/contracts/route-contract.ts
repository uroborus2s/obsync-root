import type { RouteShorthandOptions } from 'fastify';
import { MetadataManager } from '../decorators/metadata.js';

export type JsonSchemaObject = Record<string, unknown>;

export interface RouteContractSchema {
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

export interface RouteContractOptions extends Omit<
  RouteShorthandOptions,
  'schema'
> {
  schema?: RouteContractSchema;
}

export interface RouteContract {
  method: string;
  path: string;
  openApiPath: string;
  controllerName: string;
  handlerName: string;
  schema?: RouteContractSchema;
  options?: RouteContractOptions;
  tags?: string[];
}

export interface RouteContractDiagnostic {
  code:
    | 'ROUTE_SCHEMA_MISSING'
    | 'ROUTE_RESPONSE_SCHEMA_MISSING'
    | 'ROUTE_OPERATION_ID_MISSING';
  severity: 'error' | 'warning';
  method: string;
  path: string;
  controllerName: string;
  handlerName: string;
  message: string;
}

export interface RouteContractValidationOptions {
  requireSchema?: boolean;
  requireResponseSchema?: boolean;
  requireOperationId?: boolean;
}

export interface OpenApiDocumentOptions {
  title: string;
  version: string;
}

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, Record<string, unknown>>>;
}

function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function normalizeRouteOptions(
  options: RouteShorthandOptions | undefined
): RouteContractOptions | undefined {
  return options as RouteContractOptions | undefined;
}

export function getControllerRouteContracts(
  controllerClass: new (...args: any[]) => any
): RouteContract[] {
  const controllerOptions =
    MetadataManager.getControllerOptions(controllerClass);
  const controllerTags = Array.isArray(controllerOptions.tags)
    ? controllerOptions.tags
    : undefined;

  return MetadataManager.getRouteMetadata(controllerClass).map((route) => {
    const options = normalizeRouteOptions(route.options);
    const schema = options?.schema;
    const tags = Array.isArray(schema?.tags) ? schema.tags : controllerTags;

    return {
      method: route.method,
      path: route.path,
      openApiPath: toOpenApiPath(route.path),
      controllerName: controllerClass.name,
      handlerName: route.propertyKey,
      schema,
      options,
      tags
    };
  });
}

export function validateRouteContracts(
  contracts: RouteContract[],
  options: RouteContractValidationOptions = {}
): RouteContractDiagnostic[] {
  const diagnostics: RouteContractDiagnostic[] = [];

  for (const contract of contracts) {
    if (options.requireSchema && !contract.schema) {
      diagnostics.push({
        code: 'ROUTE_SCHEMA_MISSING',
        severity: 'error',
        method: contract.method,
        path: contract.path,
        controllerName: contract.controllerName,
        handlerName: contract.handlerName,
        message: `Route ${contract.method} ${contract.path} is missing a schema`
      });
    }

    if (
      options.requireResponseSchema &&
      (!contract.schema?.response ||
        Object.keys(contract.schema.response).length === 0)
    ) {
      diagnostics.push({
        code: 'ROUTE_RESPONSE_SCHEMA_MISSING',
        severity: 'error',
        method: contract.method,
        path: contract.path,
        controllerName: contract.controllerName,
        handlerName: contract.handlerName,
        message: `Route ${contract.method} ${contract.path} is missing response schema`
      });
    }

    if (options.requireOperationId && !contract.schema?.operationId) {
      diagnostics.push({
        code: 'ROUTE_OPERATION_ID_MISSING',
        severity: 'warning',
        method: contract.method,
        path: contract.path,
        controllerName: contract.controllerName,
        handlerName: contract.handlerName,
        message: `Route ${contract.method} ${contract.path} is missing operationId`
      });
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
  schema: RouteContractSchema | undefined
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

function buildRequestBody(
  schema: RouteContractSchema | undefined
): Record<string, unknown> | undefined {
  if (!schema?.body) {
    return undefined;
  }

  return {
    required: true,
    content: {
      'application/json': {
        schema: schema.body
      }
    }
  };
}

function buildResponses(
  schema: RouteContractSchema | undefined
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

export function generateOpenApiDocument(
  contracts: RouteContract[],
  options: OpenApiDocumentOptions
): OpenApiDocument {
  const document: OpenApiDocument = {
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

    const requestBody = buildRequestBody(contract.schema);
    if (requestBody) {
      operation.requestBody = requestBody;
    }

    pathItem[method] = operation;
  }

  return document;
}
