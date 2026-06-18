import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileClock,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserPlus,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { defaultUsersSearch } from '@/features/users/lib/search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardAction = 'users' | 'roles' | 'reports' | 'auditLogs';
type PriorityTone = 'high' | 'medium' | 'neutral' | 'low';

const workbenchStats = [
  {
    label: '今日待办',
    value: '8',
    helper: '3 项需要在 18:00 前完成'
  },
  {
    label: '待审批',
    value: '3',
    helper: '包含 1 项权限变更申请'
  },
  {
    label: '告警提醒',
    value: '2',
    helper: '审计与健康检查均有新动态'
  }
];

const quickActions = [
  {
    title: '新增后台用户',
    description: '创建账号并分配初始化角色',
    icon: UserPlus,
    action: 'users',
    badge: '账号'
  },
  {
    title: '配置角色权限',
    description: '维护角色矩阵与菜单访问范围',
    icon: KeyRound,
    action: 'roles',
    badge: '权限'
  },
  {
    title: '查看数据报表',
    description: '检查本周关键指标与导出任务',
    icon: BarChart3,
    action: 'reports',
    badge: '分析'
  },
  {
    title: '审计关键操作',
    description: '复核高风险事件与敏感行为',
    icon: FileClock,
    action: 'auditLogs',
    badge: '审计'
  }
] satisfies Array<{
  action: DashboardAction;
  badge: string;
  description: string;
  icon: LucideIcon;
  title: string;
}>;

const todoItems: Array<{
  description: string;
  due: string;
  owner: string;
  priority: string;
  priorityTone: PriorityTone;
  status: string;
  title: string;
}> = [
  {
    title: '完成角色权限初始矩阵配置',
    description: '需要为运营中心补齐报表、日志和设置的菜单授权规则。',
    owner: '系统管理',
    due: '今天 16:00',
    priority: '高优先级',
    priorityTone: 'high',
    status: '进行中'
  },
  {
    title: '审核新成员接入申请',
    description: '3 位成员等待开通控制台账号，并需要绑定默认角色模板。',
    owner: '用户管理',
    due: '今天 17:30',
    priority: '待审批',
    priorityTone: 'medium',
    status: '待处理'
  },
  {
    title: '确认审计日志保留策略',
    description: '脚手架默认策略需要补齐日志导出、归档和保留周期说明。',
    owner: '审计日志',
    due: '明天 10:00',
    priority: '本周重点',
    priorityTone: 'neutral',
    status: '待确认'
  },
  {
    title: '整理脚手架交付清单',
    description: '补齐初始化模板、示例模块、错误页和接入文档的交付范围。',
    owner: '项目交付',
    due: '本周五',
    priority: '常规任务',
    priorityTone: 'low',
    status: '排期中'
  }
];

const alerts = [
  {
    title: '审计导出任务需要确认',
    description: '近 24 小时新增 3 条高风险操作记录，建议优先复核。',
    label: '需处理',
    tone: 'destructive'
  },
  {
    title: '权限模板存在未发布变更',
    description: '角色权限矩阵有 2 处配置尚未同步到默认模板。',
    label: '待发布',
    tone: 'outline'
  }
] as const;

const workflowHealth = [
  {
    title: '自动化成功率',
    value: '99.2%',
    helper: '近 7 天任务执行稳定'
  },
  {
    title: '待办完成率',
    value: '76%',
    helper: '今日节奏正常'
  },
  {
    title: '审批平均时长',
    value: '18 分钟',
    helper: '较昨日缩短 6 分钟'
  }
];

const aiSuggestions = [
  {
    title: '优先补齐批量导入能力',
    description: '用户管理已经具备表格基础，下一步适合生成导入模板与校验流。'
  },
  {
    title: '为角色权限增加预设模板',
    description: '建议先提供“超级管理员 / 运营 / 只读”三种标准角色。'
  },
  {
    title: '将审计日志接入筛选预设',
    description: '可以先做“高风险操作”“登录事件”“权限变更”三种视图。'
  }
];

const activityFeed = [
  {
    title: '角色权限模板已更新',
    time: '10 分钟前',
    description: '系统管理模块完成了一次默认角色矩阵整理。'
  },
  {
    title: '用户管理列表已同步新字段',
    time: '35 分钟前',
    description: '成员状态、最近登录时间和邀请进度已纳入默认列。'
  },
  {
    title: 'AI 工作栏已接入模拟线程',
    time: '1 小时前',
    description: '当前支持布局联调，后续可无缝替换成真实模型服务。'
  }
];

const priorityToneClasses = {
  high: 'border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  medium:
    'border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  neutral:
    'border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
  low: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
} satisfies Record<string, string>;

function navigateToAction(
  action: DashboardAction,
  navigate: ReturnType<typeof useNavigate>
) {
  switch (action) {
    case 'users':
      navigate({
        search: defaultUsersSearch,
        to: '/users'
      });
      return;
    case 'roles':
      navigate({ to: '/roles' });
      return;
    case 'reports':
      navigate({ to: '/reports' });
      return;
    case 'auditLogs':
      navigate({ to: '/audit-logs' });
      return;
  }
}

function QuickActionCard({
  action,
  badge,
  description,
  icon: Icon,
  title
}: {
  action: DashboardAction;
  badge: string;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      className='group rounded-[22px] border border-border/70 bg-card/90 p-4 shadow-[0_10px_30px_-24px_hsl(var(--foreground)/0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_18px_40px_-26px_hsl(var(--foreground)/0.28)]'
      onClick={() => navigateToAction(action, navigate)}
      type='button'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='bg-muted/80 text-foreground flex size-10 items-center justify-center rounded-2xl border border-border/60'>
          <Icon className='size-4' />
        </div>
        <Badge className='rounded-full px-2.5' variant='secondary'>
          {badge}
        </Badge>
      </div>
      <div className='mt-5 space-y-1.5'>
        <p className='font-medium text-foreground'>{title}</p>
        <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
      </div>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className='space-y-6'>
      <Card className='overflow-hidden rounded-[28px] border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,245,239,0.92))] shadow-[0_20px_40px_-30px_hsl(var(--foreground)/0.25)] dark:bg-card'>
        <CardContent className='p-6 sm:p-7'>
          <div className='grid gap-6 xl:grid-cols-[1.4fr_0.95fr]'>
            <div className='space-y-5'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge className='rounded-full px-2.5' variant='secondary'>
                  今日工作台
                </Badge>
                <Badge className='rounded-full px-2.5' variant='outline'>
                  幻廊之镜模板
                </Badge>
              </div>

              <div className='space-y-3'>
                <h2 className='text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]'>
                  先处理任务，再推进模块交付
                </h2>
                <p className='max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base'>
                  这个首页现在以任务工作台为核心，优先展示待办、审批、提醒、快捷入口和
                  AI 建议，适合作为脚手架默认首页，打开后就能直接开始工作。
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                <Button
                  className='rounded-xl px-4 shadow-sm'
                  onClick={() => navigateToAction('users', navigate)}
                >
                  处理用户与待办
                  <ArrowUpRight className='size-4' />
                </Button>
                <Button
                  className='rounded-xl px-4'
                  onClick={() => navigateToAction('auditLogs', navigate)}
                  variant='outline'
                >
                  查看审计提醒
                  <ArrowUpRight className='size-4' />
                </Button>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3 xl:grid-cols-1'>
              {workbenchStats.map((item) => (
                <div
                  className='rounded-[22px] border border-border/70 bg-background/82 p-4 shadow-[inset_0_1px_0_hsl(var(--background)),0_10px_24px_-28px_hsl(var(--foreground)/0.22)]'
                  key={item.label}
                >
                  <p className='text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase'>
                    {item.label}
                  </p>
                  <p className='mt-3 text-3xl font-semibold tracking-tight text-foreground'>
                    {item.value}
                  </p>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {quickActions.map((item) => (
          <QuickActionCard key={item.title} {...item} />
        ))}
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.85fr]'>
        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <CardTitle className='text-lg'>我的待办</CardTitle>
                <CardDescription>
                  先处理需要今天闭环的任务，再推进模板细化和交付。
                </CardDescription>
              </div>
              <div className='bg-muted/75 flex size-10 items-center justify-center rounded-2xl border border-border/60'>
                <BriefcaseBusiness className='size-4 text-muted-foreground' />
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-3 pt-6'>
            {todoItems.map((item) => (
              <div
                className='rounded-[20px] border border-border/65 bg-background/90 p-4 shadow-[0_12px_30px_-28px_hsl(var(--foreground)/0.22)]'
                key={item.title}
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='font-medium text-foreground'>{item.title}</p>
                      <Badge
                        className={cn(
                          'rounded-full border px-2.5',
                          priorityToneClasses[item.priorityTone]
                        )}
                        variant='outline'
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                      {item.description}
                    </p>
                  </div>
                  <Badge className='rounded-full px-2.5' variant='secondary'>
                    {item.status}
                  </Badge>
                </div>
                <div className='mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                  <span className='inline-flex items-center gap-1.5'>
                    <ShieldCheck className='size-3.5' />
                    {item.owner}
                  </span>
                  <span className='inline-flex items-center gap-1.5'>
                    <Clock3 className='size-3.5' />
                    {item.due}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className='grid gap-4'>
          <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
            <CardHeader className='border-b border-border/60'>
              <CardTitle className='text-lg'>重点提醒</CardTitle>
              <CardDescription>
                优先处理会影响默认模板质量和交付节奏的事项。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 pt-6'>
              {alerts.map((item) => (
                <div
                  className='rounded-[20px] border border-border/65 bg-background/90 p-4'
                  key={item.title}
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-muted/75 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/60'>
                      <AlertTriangle className='size-4 text-muted-foreground' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='font-medium text-foreground'>{item.title}</p>
                        <Badge className='rounded-full px-2.5' variant={item.tone}>
                          {item.label}
                        </Badge>
                      </div>
                      <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
            <CardHeader className='border-b border-border/60'>
              <CardTitle className='text-lg'>工作流健康</CardTitle>
              <CardDescription>
                默认后台流程的执行情况和当日节奏概览。
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 pt-6'>
              {workflowHealth.map((item) => (
                <div
                  className='rounded-[20px] border border-border/65 bg-muted/35 p-4'
                  key={item.title}
                >
                  <p className='text-sm text-muted-foreground'>{item.title}</p>
                  <p className='mt-2 text-2xl font-semibold tracking-tight text-foreground'>
                    {item.value}
                  </p>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {item.helper}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4'>
          <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
            <CardHeader className='border-b border-border/60'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <CardTitle className='text-lg'>AI 今日建议</CardTitle>
                  <CardDescription>
                    基于当前模板建设阶段，优先推进最能提升复用价值的能力。
                  </CardDescription>
                </div>
                <div className='bg-muted/75 flex size-10 items-center justify-center rounded-2xl border border-border/60'>
                  <Bot className='size-4 text-muted-foreground' />
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-3 pt-6'>
              {aiSuggestions.map((item) => (
                <div
                  className='rounded-[20px] border border-border/65 bg-background/90 p-4'
                  key={item.title}
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-secondary/70 text-foreground flex size-8 shrink-0 items-center justify-center rounded-2xl border border-border/60'>
                      <Sparkles className='size-3.5' />
                    </div>
                    <div className='space-y-1.5'>
                      <p className='font-medium text-foreground'>{item.title}</p>
                      <p className='text-sm leading-6 text-muted-foreground'>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
            <CardHeader className='border-b border-border/60'>
              <CardTitle className='text-lg'>最近活动</CardTitle>
              <CardDescription>
                用于快速判断模板最近在推进什么，以及哪里有新变化。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 pt-6'>
              {activityFeed.map((item, index) => (
                <div className='flex gap-3' key={item.title}>
                  <div className='flex flex-col items-center'>
                    <div className='bg-foreground/85 mt-1 size-2 rounded-full' />
                    {index !== activityFeed.length - 1 ? (
                      <div className='mt-2 h-full w-px bg-border/80' />
                    ) : null}
                  </div>
                  <div className='min-w-0 flex-1 pb-4 last:pb-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='font-medium text-foreground'>{item.title}</p>
                      <span className='text-xs text-muted-foreground'>
                        {item.time}
                      </span>
                    </div>
                    <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-[1fr_1fr]'>
        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle className='text-lg'>当前工作节奏</CardTitle>
            <CardDescription>
              默认后台首页更适合承载任务推进，而不是只展示指标。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 pt-6 sm:grid-cols-3'>
            <div className='rounded-[20px] border border-border/65 bg-background/90 p-4'>
              <CheckCircle2 className='size-4 text-muted-foreground' />
              <p className='mt-3 font-medium text-foreground'>先处理待办</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                让任务、审批和提醒成为首页第一信息层。
              </p>
            </div>
            <div className='rounded-[20px] border border-border/65 bg-background/90 p-4'>
              <ShieldCheck className='size-4 text-muted-foreground' />
              <p className='mt-3 font-medium text-foreground'>再看风险与告警</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                把会影响交付质量的事项抬到更显眼的位置。
              </p>
            </div>
            <div className='rounded-[20px] border border-border/65 bg-background/90 p-4'>
              <Bot className='size-4 text-muted-foreground' />
              <p className='mt-3 font-medium text-foreground'>最后接 AI 协作</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                让 AI 成为辅助决策和执行建议位，而不是页面主角。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle className='text-lg'>模板适配提示</CardTitle>
            <CardDescription>
              这类首页适合作为通用脚手架默认落点，后续再按业务替换模块。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 pt-6'>
            <div className='flex items-start gap-3 rounded-[20px] border border-border/65 bg-background/90 p-4'>
              <div className='bg-muted/75 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/60'>
                <Sparkles className='size-4 text-muted-foreground' />
              </div>
              <div>
                <p className='font-medium text-foreground'>通用性更强</p>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  即使没有复杂图表，任务工作台首页依然足够实用，适合作为后台项目起点。
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3 rounded-[20px] border border-border/65 bg-background/90 p-4'>
              <div className='bg-muted/75 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/60'>
                <FileClock className='size-4 text-muted-foreground' />
              </div>
              <div>
                <p className='font-medium text-foreground'>易于模板化</p>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  待办、提醒、活动和 AI 建议都可以替换成真实业务数据，不会绑死具体行业。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
