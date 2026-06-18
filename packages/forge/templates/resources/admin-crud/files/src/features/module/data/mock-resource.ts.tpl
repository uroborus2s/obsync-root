export const {{camelName}}StatusOptions = ['Active', 'Draft', 'Archived'] as const

export type {{pascalName}}Status = (typeof {{camelName}}StatusOptions)[number]

export interface {{pascalName}}Record {
  id: string
  name: string
  owner: string
  status: {{pascalName}}Status
  updatedAt: string
  description: string
}

export const mock{{pascalName}}Records: {{pascalName}}Record[] = [
  {
    id: '{{kebabName}}-001',
    name: '{{pascalName}} North',
    owner: 'Li Wei',
    status: 'Active',
    updatedAt: '2026-03-20 09:30',
    description: 'Primary {{pascalName}} record for day-to-day workspace operations.'
  },
  {
    id: '{{kebabName}}-002',
    name: '{{pascalName}} Beta',
    owner: 'Chen Yu',
    status: 'Draft',
    updatedAt: '2026-03-18 15:10',
    description: 'Draft record waiting for form completion and business review.'
  },
  {
    id: '{{kebabName}}-003',
    name: '{{pascalName}} Archive',
    owner: 'Wang Lin',
    status: 'Archived',
    updatedAt: '2026-03-15 11:45',
    description: 'Archived example used to demonstrate filtering and bulk actions.'
  }
]
