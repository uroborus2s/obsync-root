import type { WorkflowStats } from '@/types/workflow.types'
import {
  Activity,
  CheckCircle,
  Clock,
  Timer,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkflowStatsCardsProps {
  stats: WorkflowStats
}

export function WorkflowStatsCards({ stats }: WorkflowStatsCardsProps) {
  const successRate = Math.round(stats.successRate * 100)
  const avgExecutionTimeMinutes = Math.round(stats.avgExecutionTime / 60)

  const statCards = [
    {
      title: '工作流定义',
      value: stats.totalDefinitions,
      description: `${stats.activeDefinitions} 个已启用`,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: '运行中实例',
      value: stats.runningInstances,
      description: '正在执行的工作流',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: '已完成实例',
      value: stats.completedInstances,
      description: '成功完成的工作流',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: '失败实例',
      value: stats.failedInstances,
      description: '执行失败的工作流',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: '成功率',
      value: `${successRate}%`,
      description: '工作流执行成功率',
      icon: TrendingUp,
      color:
        successRate >= 90
          ? 'text-green-600'
          : successRate >= 70
            ? 'text-yellow-600'
            : 'text-red-600',
      bgColor:
        successRate >= 90
          ? 'bg-green-50 dark:bg-green-950'
          : successRate >= 70
            ? 'bg-yellow-50 dark:bg-yellow-950'
            : 'bg-red-50 dark:bg-red-950',
    },
    {
      title: '平均执行时间',
      value:
        avgExecutionTimeMinutes > 0
          ? `${avgExecutionTimeMinutes}分钟`
          : '< 1分钟',
      description: '工作流平均执行时长',
      icon: Timer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ]

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                {stat.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stat.value}</div>
              <p className='text-muted-foreground mt-1 text-xs'>
                {stat.description}
              </p>
              {stat.title === '成功率' && (
                <Badge
                  variant={
                    successRate >= 90
                      ? 'default'
                      : successRate >= 70
                        ? 'secondary'
                        : 'destructive'
                  }
                  className='mt-2'
                >
                  {successRate >= 90
                    ? '优秀'
                    : successRate >= 70
                      ? '良好'
                      : '需改进'}
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
