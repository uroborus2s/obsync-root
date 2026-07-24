import {
  Bell,
  LaptopMinimal,
  MoonStar,
  PanelLeft,
  SunMedium,
} from 'lucide-react'

import { ThemeToggle } from '@/components/admin/shell/theme-toggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const settingsCards = [
  {
    description: '侧边栏折叠状态会在会话之间保持一致。',
    icon: PanelLeft,
    title: '导航记忆',
  },
  {
    description: '亮色、暗色与跟随系统共用一套主题提供层。',
    icon: MoonStar,
    title: '主题控制',
  },
  {
    description: '预留给后续通知中心和提醒设置能力。',
    icon: Bell,
    title: '通知偏好',
  },
]

const preferenceToggles = [
  {
    defaultChecked: true,
    description: '适合管理员高频操作的高密度导航模式。',
    id: 'compact-nav',
    label: '紧凑导航',
  },
  {
    defaultChecked: false,
    description: '预留给消息提醒和通知声音设置。',
    id: 'sound-cues',
    label: '提示音',
  },
]

export function SettingsPage() {
  return (
    <div className='space-y-6'>
      <section>
        <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
          系统设置
        </h2>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
          设置页保持工作区模式，但更强调偏好、主题和基础配置的日常调整体验。
        </p>
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.15fr_0.85fr]'>
        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle>显示与交互偏好</CardTitle>
            <CardDescription>
              工作区内的主题、布局和提醒类偏好应该保持轻量但稳定。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5 pt-6'>
            <div className='flex flex-wrap items-center gap-3'>
              <ThemeToggle />
              <div className='text-sm text-muted-foreground'>
                当前支持浅色、深色和跟随系统三种模式。
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                { icon: SunMedium, label: '亮色' },
                { icon: MoonStar, label: '暗色' },
                { icon: LaptopMinimal, label: '跟随系统' },
              ].map((item) => (
                <div
                  className='rounded-[20px] border border-border/65 bg-background/90 p-4'
                  key={item.label}
                >
                  <item.icon className='size-4 text-muted-foreground' />
                  <p className='mt-4 font-medium text-foreground'>{item.label}</p>
                </div>
              ))}
            </div>

            <div className='grid gap-3'>
              {preferenceToggles.map((toggle) => (
                <div
                  className='flex items-start justify-between gap-4 rounded-[20px] border border-border/65 bg-background/90 p-4'
                  key={toggle.id}
                >
                  <div className='space-y-1'>
                    <Label htmlFor={toggle.id}>{toggle.label}</Label>
                    <p className='text-sm leading-6 text-muted-foreground'>
                      {toggle.description}
                    </p>
                  </div>
                  <Switch defaultChecked={toggle.defaultChecked} id={toggle.id} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className='grid gap-4'>
          {settingsCards.map((card) => (
            <Card
              className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'
              key={card.title}
            >
              <CardHeader>
                <div className='bg-muted/70 mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/60'>
                  <card.icon className='size-4 text-muted-foreground' />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
