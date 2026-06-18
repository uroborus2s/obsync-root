import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '@/app/providers/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { demoAuthCredentials, getSafeRedirect } from '@/features/auth/lib/session'

interface LoginPageProps {
  redirectTo?: string
}

interface LoginFormValues {
  account: string
  password: string
  remember: boolean
}

const loginSchema = z.object({
  account: z.string().trim().min(1, '请输入账号或邮箱'),
  password: z.string().min(1, '请输入登录密码'),
  remember: z.boolean(),
})

export function LoginPage({ redirectTo = '/' }: LoginPageProps) {
  const router = useRouter()
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    defaultValues: {
      account: demoAuthCredentials.account,
      password: demoAuthCredentials.password,
      remember: true,
    },
    resolver: zodResolver(loginSchema),
  })

  const handleSubmit = form.handleSubmit((values: LoginFormValues) => {
    setSubmitError(null)

    try {
      login(values)
      router.history.push(getSafeRedirect(redirectTo))
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : '登录失败，请稍后重试。'
      )
    }
  })

  return (
    <div className='flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.95))] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,1),_rgba(15,23,42,0.94))]'>
      <div className='mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center'>
        <div className='max-w-2xl'>
          <Badge className='gap-2 rounded-full px-3 py-1 backdrop-blur' variant='outline'>
            <Sparkles className='size-3.5' />
            幻廊之镜
          </Badge>
          <h1 className='mt-6 text-4xl font-semibold tracking-tight sm:text-5xl'>
            从统一登录入口进入你的幻廊之镜工作台。
          </h1>
          <p className='mt-4 max-w-xl text-base leading-8 text-muted-foreground'>
            模板默认内置演示登录流程，方便你直接验证受保护路由、主题切换、工作台布局与 AI
            助手入口。接入真实认证时，只需要替换认证提交逻辑和会话存储实现。
          </p>
          <div className='mt-8 grid gap-4 sm:grid-cols-2'>
            {[
              '支持登录态恢复与安全跳转',
              '登录后直接进入幻廊之镜标准工作区',
              '沿用 shadcn/ui 表单能力快速替换',
              '可继续扩展 SSO、短信或企业认证',
            ].map((item) => (
              <Card className='bg-background/70 shadow-sm backdrop-blur' key={item}>
                <CardContent className='px-4 py-4 text-sm'>{item}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className='rounded-[32px] border-border/70 bg-background/92 shadow-xl shadow-slate-900/5'>
          <CardHeader className='space-y-4'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white'>
              <ShieldCheck className='size-5' />
            </div>
            <div className='space-y-2'>
              <CardTitle className='text-3xl'>登录控制台</CardTitle>
              <CardDescription className='text-base leading-7'>
                默认提供演示账号，方便模板项目初始化后立即进入幻廊之镜首页。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='space-y-6'>
            <Form {...form}>
              <form className='space-y-5' onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}>
                <FormField
                  control={form.control}
                  name='account'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>账号</FormLabel>
                      <FormControl>
                        <Input placeholder='请输入邮箱或用户名' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <LockKeyhole className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                          <Input
                            className='pl-10'
                            placeholder='请输入登录密码'
                            type='password'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='remember'
                  render={({ field }) => (
                    <FormItem className='rounded-2xl border border-border/70 bg-muted/30 px-4 py-3'>
                      <div className='flex items-center justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              id='remember-login'
                              onCheckedChange={(checked) =>
                                field.onChange(Boolean(checked))
                              }
                            />
                          </FormControl>
                          <Label className='cursor-pointer' htmlFor='remember-login'>
                            记住当前设备
                          </Label>
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          演示模式不发起真实网络请求
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
                {submitError ? (
                  <div className='rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                    {submitError}
                  </div>
                ) : null}
                <Button className='w-full' type='submit'>
                  登录并进入工作台
                </Button>
              </form>
            </Form>

            <Card className='border-border/70 bg-muted/35 shadow-none'>
              <CardContent className='space-y-2 p-4 text-sm'>
                <p className='font-medium'>演示账号信息</p>
                <p className='text-muted-foreground'>邮箱：{demoAuthCredentials.account}</p>
                <p className='text-muted-foreground'>用户名：{demoAuthCredentials.username}</p>
                <p className='text-muted-foreground'>密码：{demoAuthCredentials.password}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
