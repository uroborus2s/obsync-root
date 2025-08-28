import { createFileRoute } from '@tanstack/react-router'
import WorkflowVisualizationDemo from '@/features/workflows/pages/workflow-visualization-demo'

export const Route = createFileRoute('/_authenticated/workflows/visualization-demo')({
  component: WorkflowVisualizationDemo,
  meta: () => [
    {
      title: '工作流可视化演示 - AgendaEdu',
    },
  ],
})
