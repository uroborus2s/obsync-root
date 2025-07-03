import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// 表单验证schema
const taskConfigSchema = z.object({
  execution_strategy: z.enum(['immediate', 'scheduled', 'manual']),
  retry_count: z.number().min(0).max(10),
  timeout: z.number().min(60).max(3600),
  auto_cleanup: z.boolean(),
  max_concurrent_tasks: z.number().min(1).max(50),
  notification_enabled: z.boolean(),
  notification_email: z.string().email().optional().or(z.literal('')),
})

const syncConfigSchema = z.object({
  sync_scope: z.object({
    xnxq: z.string().optional(),
    date_range: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .optional(),
  }),
  schedule_config: z.object({
    cron: z.string().optional(),
    timezone: z.string(),
  }),
})

type TaskConfigFormData = z.infer<typeof taskConfigSchema>
type SyncConfigFormData = z.infer<typeof syncConfigSchema>

export default function TaskSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const taskForm = useForm<TaskConfigFormData>({
    resolver: zodResolver(taskConfigSchema),
    defaultValues: {
      execution_strategy: 'immediate',
      retry_count: 3,
      timeout: 300,
      auto_cleanup: true,
      max_concurrent_tasks: 10,
      notification_enabled: false,
      notification_email: '',
    },
  })

  const syncForm = useForm<SyncConfigFormData>({
    resolver: zodResolver(syncConfigSchema),
    defaultValues: {
      sync_scope: {
        xnxq: '',
        date_range: {
          start: '',
          end: '',
        },
      },
      schedule_config: {
        timezone: 'Asia/Shanghai',
        cron: '',
      },
    },
  })

  const onTaskSubmit = async (_data: TaskConfigFormData) => {
    setIsLoading(true)
    try {
      // TODO: 实现保存任务配置功能
    } catch (_error) {
      // TODO: 添加用户反馈
    } finally {
      setIsLoading(false)
    }
  }

  const onSyncSubmit = async (_data: SyncConfigFormData) => {
    setIsLoading(true)
    try {
      // TODO: 实现保存同步配置功能
    } catch (_error) {
      // TODO: 添加用户反馈
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>任务设置</h1>
              <p className='text-muted-foreground'>
                配置任务执行策略、同步范围和调度参数
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue='task-config' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='task-config'>任务配置</TabsTrigger>
            <TabsTrigger value='sync-config'>同步配置</TabsTrigger>
          </TabsList>

          <TabsContent value='task-config' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>任务执行配置</CardTitle>
                <CardDescription>
                  配置任务的执行策略、重试机制和并发限制
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...taskForm}>
                  <form
                    onSubmit={taskForm.handleSubmit(onTaskSubmit)}
                    className='space-y-6'
                  >
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                      <FormField
                        control={taskForm.control}
                        name='execution_strategy'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>执行策略</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='选择执行策略' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='immediate'>
                                  立即执行
                                </SelectItem>
                                <SelectItem value='scheduled'>
                                  定时执行
                                </SelectItem>
                                <SelectItem value='manual'>手动执行</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              选择任务的执行时机
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name='retry_count'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>重试次数</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              任务失败时的最大重试次数（0-10）
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name='timeout'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>超时时间（秒）</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              任务执行的最大时长（60-3600秒）
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name='max_concurrent_tasks'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>最大并发数</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              同时运行的最大任务数量（1-50）
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='space-y-4'>
                      <FormField
                        control={taskForm.control}
                        name='auto_cleanup'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <FormLabel className='text-base'>
                                自动清理
                              </FormLabel>
                              <FormDescription>
                                自动清理已完成的任务记录（保留最近30天）
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name='notification_enabled'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <FormLabel className='text-base'>
                                任务通知
                              </FormLabel>
                              <FormDescription>
                                任务完成或失败时发送邮件通知
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {taskForm.watch('notification_enabled') && (
                        <FormField
                          control={taskForm.control}
                          name='notification_email'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>通知邮箱</FormLabel>
                              <FormControl>
                                <Input
                                  type='email'
                                  placeholder='输入邮箱地址'
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                接收任务通知的邮箱地址
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Button type='submit' disabled={isLoading}>
                      {isLoading ? '保存中...' : '保存任务配置'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='sync-config' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>同步配置</CardTitle>
                <CardDescription>
                  配置数据同步的范围、调度时间和相关参数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...syncForm}>
                  <form
                    onSubmit={syncForm.handleSubmit(onSyncSubmit)}
                    className='space-y-6'
                  >
                    <div className='space-y-4'>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <FormField
                          control={syncForm.control}
                          name='sync_scope.xnxq'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>学年学期</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder='例如：2024-2025-1'
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                指定同步的学年学期，留空则同步当前学期
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={syncForm.control}
                          name='schedule_config.timezone'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>时区</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value='Asia/Shanghai'>
                                    Asia/Shanghai
                                  </SelectItem>
                                  <SelectItem value='UTC'>UTC</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                调度任务使用的时区
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <FormField
                          control={syncForm.control}
                          name='sync_scope.date_range.start'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>开始日期</FormLabel>
                              <FormControl>
                                <Input type='date' {...field} />
                              </FormControl>
                              <FormDescription>
                                同步数据的开始日期
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={syncForm.control}
                          name='sync_scope.date_range.end'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>结束日期</FormLabel>
                              <FormControl>
                                <Input type='date' {...field} />
                              </FormControl>
                              <FormDescription>
                                同步数据的结束日期
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={syncForm.control}
                        name='schedule_config.cron'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cron表达式</FormLabel>
                            <FormControl>
                              <Input placeholder='0 0 * * *' {...field} />
                            </FormControl>
                            <FormDescription>
                              定时同步的Cron表达式，例如：0 0 * *
                              *（每天凌晨执行）
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type='submit' disabled={isLoading}>
                      {isLoading ? '保存中...' : '保存同步配置'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
