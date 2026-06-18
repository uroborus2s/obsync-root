import Ajv, { type ErrorObject } from 'ajv';
import type {
  RouteContract,
  RouteContractValidationOptions
} from '@stratix/core';
import { validateRouteContracts } from '@stratix/core';

export interface ContractTestRequest {
  method: string;
  url: string;
  payload?: unknown;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export interface ContractTestResponse {
  statusCode?: number;
  status?: number;
  payload?: string;
  body?: string;
  json?: () => unknown;
}

export interface ContractTestApp {
  inject(
    request: ContractTestRequest
  ): ContractTestResponse | Promise<ContractTestResponse>;
}

export interface ContractTestCase {
  operationId?: string;
  method?: string;
  path?: string;
  request: ContractTestRequest;
  expect: {
    status: number;
  };
}

export interface ContractTestOptions {
  app: ContractTestApp;
  contracts: RouteContract[];
  cases: ContractTestCase[];
  strict?: RouteContractValidationOptions;
}

export class ContractTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractTestError';
  }
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: false
});

function operationIdOf(contract: RouteContract): string {
  return (
    contract.schema?.operationId ||
    `${contract.controllerName}_${contract.handlerName}`
  );
}

function routeLabel(contract: RouteContract): string {
  return `${contract.method} ${contract.path} (${operationIdOf(contract)})`;
}

function findContract(
  contracts: RouteContract[],
  testCase: ContractTestCase
): RouteContract {
  const contract = contracts.find((candidate) => {
    if (testCase.operationId) {
      return operationIdOf(candidate) === testCase.operationId;
    }

    if (testCase.method && testCase.path) {
      return (
        candidate.method.toUpperCase() === testCase.method.toUpperCase() &&
        candidate.path === testCase.path
      );
    }

    return false;
  });

  if (!contract) {
    throw new ContractTestError(
      `No route contract found for ${testCase.operationId || `${testCase.method || ''} ${testCase.path || ''}`.trim()}`
    );
  }

  return contract;
}

function responseStatus(response: ContractTestResponse): number {
  const status = response.statusCode ?? response.status;
  if (typeof status !== 'number') {
    throw new ContractTestError('Contract test response did not include a numeric status');
  }
  return status;
}

function parseResponseBody(response: ContractTestResponse): unknown {
  if (typeof response.json === 'function') {
    return response.json();
  }

  const payload = response.payload ?? response.body;
  if (payload === undefined || payload === '') {
    return undefined;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new ContractTestError(
      `Response body is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors || [])
    .map((error) => {
      const path = error.instancePath || '/';
      return `${path} ${error.message || 'is invalid'}`;
    })
    .join('; ');
}

function responseSchemaFor(
  contract: RouteContract,
  status: number
): Record<string, unknown> {
  const responses = contract.schema?.response;
  const schema = responses?.[status] || responses?.[String(status)];

  if (!schema) {
    throw new ContractTestError(
      `${routeLabel(contract)} is missing response schema for status ${status}`
    );
  }

  return schema;
}

export async function contractTest(options: ContractTestOptions): Promise<void> {
  const diagnostics = validateRouteContracts(options.contracts, options.strict || {});
  if (diagnostics.length > 0) {
    throw new ContractTestError(
      diagnostics
        .map((diagnostic) => diagnostic.message)
        .join('\n')
    );
  }

  for (const testCase of options.cases) {
    const contract = findContract(options.contracts, testCase);
    const response = await options.app.inject(testCase.request);
    const status = responseStatus(response);

    if (status !== testCase.expect.status) {
      throw new ContractTestError(
        `${routeLabel(contract)} expected status ${testCase.expect.status} but received ${status}`
      );
    }

    const schema = responseSchemaFor(contract, status);
    const validate = ajv.compile(schema);
    const body = parseResponseBody(response);

    if (!validate(body)) {
      throw new ContractTestError(
        `${routeLabel(contract)} response schema mismatch: ${formatAjvErrors(validate.errors)}`
      );
    }
  }
}
