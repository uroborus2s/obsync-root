import { createFileRoute } from '@tanstack/react-router'
import WorkflowDefinitionDetail from '@/features/workflows/pages/workflow-definition-detail'

export const Route = createFileRoute(
  '/_authenticated/workflows/definitions/$definitionId'
)({
  component: WorkflowDefinitionDetail,
})
