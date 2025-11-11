import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CoursePeriod, PeriodFormData } from '@/types/course-period.types'
import { toast } from 'sonner'
import { updatePeriod } from '@/api/course-period.api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface PeriodEditDialogProps {
  open: boolean
  periodId: number
  onClose: () => void
}

export function PeriodEditDialog({
  open,
  periodId,
  onClose,
}: PeriodEditDialogProps) {
  const queryClient = useQueryClient()

  // 从缓存中获取课节数据
  const periodsWithRules = queryClient.getQueryData<
    Array<{ period: CoursePeriod }>
  >(['periods-with-rules'])
  const period = periodsWithRules?.find((p) => p.period.id === periodId)?.period

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PeriodFormData>({
    defaultValues: {
      period_no: 1,
      name: '',
      default_start_time: '',
      default_end_time: '',
      is_active: true,
      remark: '',
    },
  })

  // 当对话框打开时，填充表单数据
  useEffect(() => {
    if (open && period) {
      reset({
        period_no: period.period_no,
        name: period.name || '',
        default_start_time: period.default_start_time.substring(0, 5), // HH:mm:ss -> HH:mm
        default_end_time: period.default_end_time.substring(0, 5),
        is_active: period.is_active,
        remark: period.remark || '',
      })
    }
  }, [open, period, reset])

  // 更新课节
  const mutation = useMutation({
    mutationFn: async (data: PeriodFormData) => {
      const payload = {
        period_no: data.period_no,
        name: data.name || null,
        default_start_time: `${data.default_start_time}:00`, // HH:mm -> HH:mm:ss
        default_end_time: `${data.default_end_time}:00`,
        is_active: data.is_active,
        remark: data.remark || null,
      }

      await updatePeriod(periodId, payload)
    },
    onSuccess: () => {
      toast.success('课节更新成功')
      queryClient.invalidateQueries({ queryKey: ['periods-with-rules'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error?.message || '更新课节失败')
    },
  })

  const onSubmit = (data: PeriodFormData) => {
    mutation.mutate(data)
  }

  if (!period) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>编辑课节</DialogTitle>
          <DialogDescription>修改课节的默认时间配置</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='period_no'>
                节次编号 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='period_no'
                type='number'
                {...register('period_no', {
                  required: '节次编号不能为空',
                  min: { value: 1, message: '节次编号必须大于0' },
                })}
                disabled // 不允许修改节次编号
              />
              {errors.period_no && (
                <p className='text-destructive text-sm'>
                  {errors.period_no.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='name'>节次名称</Label>
              <Input
                id='name'
                placeholder='例如: 第一节'
                {...register('name')}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='default_start_time'>
                默认开始时间 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='default_start_time'
                type='time'
                {...register('default_start_time', {
                  required: '开始时间不能为空',
                })}
              />
              {errors.default_start_time && (
                <p className='text-destructive text-sm'>
                  {errors.default_start_time.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='default_end_time'>
                默认结束时间 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='default_end_time'
                type='time'
                {...register('default_end_time', {
                  required: '结束时间不能为空',
                })}
              />
              {errors.default_end_time && (
                <p className='text-destructive text-sm'>
                  {errors.default_end_time.message}
                </p>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='is_active'>启用该节次</Label>
              <Controller
                name='is_active'
                control={control}
                render={({ field }) => (
                  <Switch
                    id='is_active'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <p className='text-muted-foreground text-sm'>
              禁用后，该节次将不会在课表中显示
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='remark'>备注</Label>
            <Textarea
              id='remark'
              placeholder='输入备注信息（可选）'
              rows={2}
              {...register('remark')}
            />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
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
