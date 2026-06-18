import type { {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'

export interface {{pascalName}}ListParams {
  query?: string
  status?: string
}

export interface {{pascalName}}MutationInput extends {{pascalName}}FormValues {}

// Replace these placeholders with real request-layer integrations when the
// module is connected to backend APIs.
export async function list{{pascalName}}Records(_params: {{pascalName}}ListParams = {}) {
  return Promise.resolve([])
}

export async function get{{pascalName}}Record(_recordId: string) {
  return Promise.resolve(null)
}

export async function create{{pascalName}}Record(_input: {{pascalName}}MutationInput) {
  return Promise.resolve(null)
}

export async function update{{pascalName}}Record(
  _recordId: string,
  _input: {{pascalName}}MutationInput
) {
  return Promise.resolve(null)
}
