import * as React from 'react'
import { toast } from 'sonner'

import {
  mock{{pascalName}}Records,
  type {{pascalName}}Record,
  type {{pascalName}}Status,
} from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import type { {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'

function createRecordId() {
  return '{{kebabName}}-' + Math.random().toString(36).slice(2, 8)
}

function createUpdatedAtValue() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

export function use{{pascalName}}Crud() {
  const [items, setItems] = React.useState<{{pascalName}}Record[]>(() => mock{{pascalName}}Records)

  const getById = React.useCallback(
    (recordId?: string | null) =>
      items.find((item) => item.id === recordId) ?? null,
    [items]
  )

  const createItem = React.useCallback((values: {{pascalName}}FormValues) => {
    const nextRecord: {{pascalName}}Record = {
      id: createRecordId(),
      updatedAt: createUpdatedAtValue(),
      ...values,
    }

    setItems((previous) => [nextRecord, ...previous])
    toast.success('{{pascalName}} created successfully.')

    return nextRecord
  }, [])

  const updateItem = React.useCallback(
    (recordId: string, values: {{pascalName}}FormValues) => {
      setItems((previous) =>
        previous.map((item) =>
          item.id === recordId
            ? {
                ...item,
                ...values,
                updatedAt: createUpdatedAtValue(),
              }
            : item
        )
      )
      toast.success('{{pascalName}} updated successfully.')
    },
    []
  )

  const changeItemsStatus = React.useCallback(
    (recordIds: string[], status: {{pascalName}}Status) => {
      setItems((previous) =>
        previous.map((item) =>
          recordIds.includes(item.id)
            ? {
                ...item,
                status,
                updatedAt: createUpdatedAtValue(),
              }
            : item
        )
      )

      toast.success(
        status === 'Archived'
          ? 'Selected records were archived.'
          : 'Selected records were activated.'
      )
    },
    []
  )

  return {
    items,
    getById,
    createItem,
    updateItem,
    changeItemsStatus,
  }
}
