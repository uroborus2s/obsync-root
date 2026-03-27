import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const nextSteps = [
  '补齐页面请求逻辑与 Query hooks。',
  '将页面入口加入导航配置和命令搜索索引。',
  '按业务需要接入表格、表单或详情工作栏。',
]

export function {{pascalName}}Page() {
  return (
    <div className='space-y-6'>
      <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            {{pascalName}}
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            这是通过 <code>stratix generate admin-page {{kebabName}}</code>{' '}
            生成的工作区页面骨架。
          </p>
        </div>
        <Button className='rounded-xl px-4'>
          <Plus className='size-4' />
          新建{{pascalName}}
        </Button>
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.2fr_0.9fr]'>
        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle>{{pascalName}} 页面概览</CardTitle>
            <CardDescription>
              首版生成器默认输出一个符合当前后台模板视觉语言的普通页面。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 pt-6 text-sm leading-6 text-muted-foreground'>
            <div className='rounded-[20px] border border-border/65 bg-background/90 p-4'>
              这里适合放置页面摘要、说明信息或业务入口卡片。
            </div>
            <div className='rounded-[20px] border border-border/65 bg-background/90 p-4'>
              如果这个模块最终需要主表格，建议下一步直接改造成工作区表格页。
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-border/70 shadow-[0_16px_38px_-32px_hsl(var(--foreground)/0.2)]'>
          <CardHeader className='border-b border-border/60'>
            <CardTitle>推荐下一步</CardTitle>
            <CardDescription>
              生成器已经把路由和 feature 目录接好了，接下来只需要往业务能力里填充。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 pt-6 text-sm text-muted-foreground'>
            {nextSteps.map((item) => (
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
