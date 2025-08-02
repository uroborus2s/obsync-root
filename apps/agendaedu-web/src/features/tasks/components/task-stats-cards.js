import { Activity, CheckCircle, Clock, Pause, Play, XCircle, } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export function TaskStatsCards({ stats }) {
    const cards = [
        {
            title: '总任务数',
            value: stats.total,
            icon: Activity,
            description: '系统中的所有任务',
            color: 'text-blue-600',
        },
        {
            title: '等待中',
            value: stats.pending,
            icon: Clock,
            description: '等待执行的任务',
            color: 'text-yellow-600',
        },
        {
            title: '运行中',
            value: stats.running,
            icon: Play,
            description: '正在执行的任务',
            color: 'text-green-600',
        },
        {
            title: '已暂停',
            value: stats.paused,
            icon: Pause,
            description: '暂停执行的任务',
            color: 'text-orange-600',
        },
        {
            title: '已成功',
            value: stats.success,
            icon: CheckCircle,
            description: '执行成功的任务',
            color: 'text-emerald-600',
        },
        {
            title: '已失败',
            value: stats.failed,
            icon: XCircle,
            description: '执行失败的任务',
            color: 'text-red-600',
        },
    ];
    return (<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
      {cards.map((card) => {
            const Icon = card.icon;
            return (<Card key={card.title}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`}/>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{card.value}</div>
              <p className='text-muted-foreground text-xs'>
                {card.description}
              </p>
            </CardContent>
          </Card>);
        })}
    </div>);
}
//# sourceMappingURL=task-stats-cards.js.map