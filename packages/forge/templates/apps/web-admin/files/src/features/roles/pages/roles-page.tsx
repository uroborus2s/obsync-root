import { KeyRound, ShieldCheck, UsersRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const roleCards = [
  {
    description: '拥有全量菜单和系统级配置权限，适合作为平台最高权限角色。',
    icon: ShieldCheck,
    title: '超级管理员',
  },
  {
    description: '负责用户、报表和运营类后台模块，是典型中台角色模板。',
    icon: UsersRound,
    title: '运营管理员',
  },
  {
    description: '默认拥有只读权限，可查看报表、审计日志和风险记录。',
    icon: KeyRound,
    title: '审计人员',
  },
]

export function RolesPage() {
  return (
    <div className='space-y-6'>
      <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            角色权限
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            角色页也切成工作区语言，强调角色模板、能力分层和后续可扩展边界。
          </p>
        </div>
        <Button className='rounded-xl px-4'>新增角色</Button>
      </section>

      <section className='grid gap-4 lg:grid-cols-3'>
        {roleCards.map((item) => (
          <Card
            className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'
            key={item.title}
          >
            <CardHeader>
              <div className='bg-muted/70 mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/60'>
                <item.icon className='size-4 text-muted-foreground' />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.2fr_0.9fr]'>
        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle>权限能力分层</CardTitle>
            <CardDescription>
              工作区模式下，权限页更强调模块边界和默认模板应自带的控制能力。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 pt-6'>
            {[
              '菜单级权限控制：决定不同角色能进入哪些后台页面。',
              '按钮级权限控制：决定导出、审核、删除等操作是否展示。',
              '数据级权限控制：为不同角色预留组织、部门或范围隔离能力。',
            ].map((item) => (
              <div
                className='rounded-[20px] border border-border/65 bg-background/90 p-4 text-sm leading-6 text-muted-foreground'
                key={item}
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle>建议继续补齐</CardTitle>
            <CardDescription>
              角色页后续最自然的方向，是把模板能力继续沉到底层可复用组件里。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 pt-6 text-sm text-muted-foreground'>
            {['角色复制', '权限矩阵表格', '菜单树授权', '数据范围配置'].map((item) => (
              <div
                className='rounded-[20px] border border-border/65 bg-background/90 px-4 py-3'
                key={item}
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
