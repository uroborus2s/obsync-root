import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTerm, updateTerm } from '@/api/course-period.api'
import type {
  SystemConfigTerm,
  TermFormData,
} from '@/types/course-period.types'

interface TermDialogProps {
  open: boolean
  term: SystemConfigTerm | null
  onClose: () => void
}

export function TermDialog({ open, term, onClose }: TermDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!term

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TermFormData>({
    defaultValues: {
      term_code: '',
      name: '',
      start_date: null,
      end_date: null,
      is_active: false,
      remark: '',
    },
  })

  // 当对话框打开时，填充表单数据
  useEffect(() => {
    if (open) {
      if (term) {
        reset({
          term_code: term.term_code,
          name: term.name,
          start_date: term.start_date ? new Date(term.start_date) : null,
          end_date: term.end_date ? new Date(term.end_date) : null,
          is_active: term.is_active,
          remark: term.remark || '',
        })
      } else {
        reset({
          term_code: '',
          name: '',
          start_date: null,
          end_date: null,
          is_active: false,
          remark: '',
        })
      }
    }
  }, [open, term, reset])

  // 创建/更新学期
  const mutation = useMutation({
    mutationFn: async (data: TermFormData) => {
      const payload = {
        term_code: data.term_code,
        name: data.name,
        start_date: data.start_date
          ? format(data.start_date, 'yyyy-MM-dd')
          : '',
        end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : null,
        is_active: data.is_active,
        remark: data.remark || null,
      }

      if (isEdit && term) {
        await updateTerm(term.id, payload)
      } else {
        await createTerm(payload)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? '学期更新成功' : '学期创建成功')
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error?.message || '操作失败')
    },
  })

  const onSubmit = (data: TermFormData) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑学期' : '新增学期'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改学期信息' : '创建新的学期配置'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term_code">
                学期编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="term_code"
                placeholder="例如: 2024-2025-1"
                {...register('term_code', { required: '学期编码不能为空' })}
                disabled={isEdit} // 编辑时不允许修改编码
              />
              {errors.term_code && (
                <p className="text-sm text-destructive">
                  {errors.term_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                学期名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如: 2024-2025学年第一学期"
                {...register('name', { required: '学期名称不能为空' })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                开始日期 <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: '开始日期不能为空' }}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, 'yyyy-MM-dd')
                          : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">
                  {errors.start_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>结束日期</Label>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, 'yyyy-MM-dd')
                          : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">设为当前学期</Label>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              开启后，该学期将成为当前激活学期，其他学期将自动取消激活
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remark">备注</Label>
            <Textarea
              id="remark"
              placeholder="输入备注信息（可选）"
              rows={3}
              {...register('remark')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

