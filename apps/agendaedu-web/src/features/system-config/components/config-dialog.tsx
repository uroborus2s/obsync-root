import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  systemConfigApi,
  type SystemConfig,
  type CreateConfigRequest,
} from '@/lib/system-config-api'

interface ConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: SystemConfig | null
  defaultGroup?: string
}

export function ConfigDialog({
  open,
  onOpenChange,
  config,
  defaultGroup,
}: ConfigDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!config

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateConfigRequest>({
    defaultValues: {
      config_key: '',
      config_value: '',
      config_type: 'string',
      config_group: defaultGroup || 'default',
      description: '',
    },
  })

  const configType = watch('config_type')

  // 当对话框打开时，填充表单数据
  useEffect(() => {
    if (open) {
      if (config) {
        reset({
          config_key: config.config_key,
          config_value: config.config_value || '',
          config_type: config.config_type,
          config_group: config.config_group,
          description: config.description || '',
        })
      } else {
        reset({
          config_key: '',
          config_value: '',
          config_type: 'string',
          config_group: defaultGroup || 'default',
          description: '',
        })
      }
    }
  }, [open, config, defaultGroup, reset])

  // 创建/更新配置
  const mutation = useMutation({
    mutationFn: (data: CreateConfigRequest) =>
      isEdit
        ? systemConfigApi.updateConfig(config.config_key, data)
        : systemConfigApi.createConfig(data),
    onSuccess: () => {
      toast.success(isEdit ? '配置更新成功' : '配置创建成功')
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || '操作失败')
    },
  })

  const onSubmit = (data: CreateConfigRequest) => {
    // 验证JSON格式
    if (data.config_type === 'json' && data.config_value) {
      try {
        JSON.parse(data.config_value)
      } catch (e) {
        toast.error('配置值不是有效的JSON格式')
        return
      }
    }

    // 验证Cron表达式（简单验证）
    if (data.config_type === 'cron' && data.config_value) {
      const cronParts = data.config_value.trim().split(/\s+/)
      if (cronParts.length < 5 || cronParts.length > 7) {
        toast.error('Cron表达式格式不正确')
        return
      }
    }

    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑配置' : '新增配置'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改系统配置参数' : '创建新的系统配置参数'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='config_key'>
              配置键 <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='config_key'
              {...register('config_key', { required: '配置键不能为空' })}
              disabled={isEdit}
              placeholder='例如: term.start_date'
            />
            {errors.config_key && (
              <p className='text-sm text-destructive'>
                {errors.config_key.message}
              </p>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='config_type'>
                配置类型 <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={configType}
                onValueChange={(value) => setValue('config_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='string'>字符串</SelectItem>
                  <SelectItem value='number'>数字</SelectItem>
                  <SelectItem value='boolean'>布尔值</SelectItem>
                  <SelectItem value='json'>JSON</SelectItem>
                  <SelectItem value='date'>日期</SelectItem>
                  <SelectItem value='cron'>Cron表达式</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='config_group'>
                配置分组 <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={watch('config_group')}
                onValueChange={(value) => setValue('config_group', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='default'>默认</SelectItem>
                  <SelectItem value='term'>学期配置</SelectItem>
                  <SelectItem value='course'>课程配置</SelectItem>
                  <SelectItem value='sync'>同步任务</SelectItem>
                  <SelectItem value='other'>其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='config_value'>
              配置值 <span className='text-destructive'>*</span>
            </Label>
            {configType === 'json' ? (
              <Textarea
                id='config_value'
                {...register('config_value', { required: '配置值不能为空' })}
                placeholder='{"key": "value"}'
                rows={6}
                className='font-mono text-sm'
              />
            ) : (
              <Input
                id='config_value'
                {...register('config_value', { required: '配置值不能为空' })}
                placeholder={
                  configType === 'cron'
                    ? '0 0 * * *'
                    : configType === 'date'
                      ? '2024-01-01'
                      : '配置值'
                }
              />
            )}
            {errors.config_value && (
              <p className='text-sm text-destructive'>
                {errors.config_value.message}
              </p>
            )}
            {configType === 'cron' && (
              <p className='text-xs text-muted-foreground'>
                Cron表达式格式: 秒 分 时 日 月 周 年（可选）
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>描述</Label>
            <Textarea
              id='description'
              {...register('description')}
              placeholder='配置项的说明'
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

