import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ConditionGroupFormData,
  ConditionValue,
  CoursePeriodRuleWithConditions,
  NewCoursePeriodRuleCondition,
  RuleFormData,
} from '@/types/course-period.types'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createRule, updateRule } from '@/api/course-period.api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConditionEditor } from './condition-editor'

interface RuleEditDialogProps {
  open: boolean
  periodId: number
  rule: CoursePeriodRuleWithConditions | null
  onClose: () => void
}

export function RuleEditDialog({
  open,
  periodId,
  rule,
  onClose,
}: RuleEditDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!rule

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<RuleFormData>({
    defaultValues: {
      rule_name: '',
      priority: 100,
      start_time: '',
      end_time: '',
      effective_start_date: null,
      effective_end_date: null,
      enabled: true,
      remark: '',
      conditions: [],
    },
  })

  const [conditionGroups, setConditionGroups] = useState<
    ConditionGroupFormData[]
  >([
    {
      group_no: 1,
      group_connector: 'AND',
      conditions: [{ dimension: '', operator: '', value: '' }],
    },
  ])

  // 当对话框打开时，填充表单数据
  useEffect(() => {
    if (open) {
      if (rule) {
        reset({
          rule_name: rule.rule.rule_name || '',
          priority: rule.rule.priority,
          start_time: rule.rule.start_time.substring(0, 5), // HH:mm:ss -> HH:mm
          end_time: rule.rule.end_time.substring(0, 5),
          effective_start_date: rule.rule.effective_start_date
            ? new Date(rule.rule.effective_start_date)
            : null,
          effective_end_date: rule.rule.effective_end_date
            ? new Date(rule.rule.effective_end_date)
            : null,
          enabled: rule.rule.enabled,
          remark: rule.rule.remark || '',
          conditions: [],
        })

        // 转换条件数据
        const groups: ConditionGroupFormData[] = []
        rule.conditions.forEach((cond) => {
          let group = groups.find((g) => g.group_no === cond.group_no)
          if (!group) {
            group = {
              group_no: cond.group_no,
              group_connector: cond.group_connector,
              conditions: [],
            }
            groups.push(group)
          }

          // 转换 value_json 为表单值
          let value:
            | string
            | number
            | string[]
            | number[]
            | Array<
                string | number | { min: string | number; max: string | number }
              >
            | { min: string | number; max: string | number } = ''
          if (
            cond.operator === 'between' &&
            cond.value_json.min !== undefined &&
            cond.value_json.max !== undefined
          ) {
            value = { min: cond.value_json.min, max: cond.value_json.max }
          } else if (
            (cond.operator === 'in' || cond.operator === 'not_in') &&
            cond.value_json.values
          ) {
            value = cond.value_json.values
          } else if (cond.value_json.value !== undefined) {
            value = cond.value_json.value
          }

          group.conditions.push({
            dimension: cond.dimension,
            operator: cond.operator,
            value,
          })
        })

        setConditionGroups(
          groups.length > 0
            ? groups
            : [
                {
                  group_no: 1,
                  group_connector: 'AND',
                  conditions: [{ dimension: '', operator: '', value: '' }],
                },
              ]
        )
      } else {
        reset({
          rule_name: '',
          priority: 100,
          start_time: '',
          end_time: '',
          effective_start_date: null,
          effective_end_date: null,
          enabled: true,
          remark: '',
          conditions: [],
        })
        setConditionGroups([
          {
            group_no: 1,
            group_connector: 'AND',
            conditions: [{ dimension: '', operator: '', value: '' }],
          },
        ])
      }
    }
  }, [open, rule, reset])

  // 创建/更新规则
  const mutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const rulePayload = {
        period_id: periodId,
        priority: data.priority,
        rule_name: data.rule_name || null,
        start_time: `${data.start_time}:00`, // HH:mm -> HH:mm:ss
        end_time: `${data.end_time}:00`,
        effective_start_date: data.effective_start_date
          ? format(data.effective_start_date, 'yyyy-MM-dd')
          : null,
        effective_end_date: data.effective_end_date
          ? format(data.effective_end_date, 'yyyy-MM-dd')
          : null,
        enabled: data.enabled,
        remark: data.remark || null,
      }

      // 转换条件数据
      const conditions: NewCoursePeriodRuleCondition[] = []
      conditionGroups.forEach((group) => {
        group.conditions.forEach((cond) => {
          if (!cond.dimension || !cond.operator) return

          // 转换表单值为 value_json
          let value_json: ConditionValue = {}
          if (
            cond.operator === 'between' &&
            typeof cond.value === 'object' &&
            'min' in cond.value
          ) {
            value_json = { min: cond.value.min, max: cond.value.max }
          } else if (cond.operator === 'in' || cond.operator === 'not_in') {
            value_json = {
              values: Array.isArray(cond.value)
                ? (cond.value as Array<string | number>)
                : [cond.value as string | number],
            }
          } else {
            value_json = {
              value: cond.value as
                | string
                | number
                | string[]
                | number[]
                | { min: string | number; max: string | number },
            }
          }

          conditions.push({
            rule_id: 0, // 会被后端忽略
            group_no: group.group_no,
            group_connector: group.group_connector,
            dimension: cond.dimension,
            operator: cond.operator,
            value_json,
          })
        })
      })

      if (isEdit && rule) {
        await updateRule(rule.rule.id, rulePayload, conditions)
      } else {
        await createRule(rulePayload, conditions)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? '规则更新成功' : '规则创建成功')
      queryClient.invalidateQueries({ queryKey: ['periods-with-rules'] })
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error?.message || '操作失败')
    },
  })

  const onSubmit = (data: RuleFormData) => {
    // 验证至少有一个有效条件
    const hasValidCondition = conditionGroups.some((group) =>
      group.conditions.some((cond) => cond.dimension && cond.operator)
    )

    if (!hasValidCondition) {
      toast.error('请至少添加一个有效的条件')
      return
    }

    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑规则' : '新增规则'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改课节规则信息' : '创建新的课节规则'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* 基本信息 */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium'>基本信息</h3>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='rule_name'>规则名称</Label>
                <Input
                  id='rule_name'
                  placeholder='例如: 南校区第一节提前'
                  {...register('rule_name')}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='priority'>
                  优先级 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='priority'
                  type='number'
                  placeholder='数字越小优先级越高'
                  {...register('priority', {
                    required: '优先级不能为空',
                    min: { value: 1, message: '优先级必须大于0' },
                  })}
                />
                {errors.priority && (
                  <p className='text-destructive text-sm'>
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='start_time'>
                  开始时间 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='start_time'
                  type='time'
                  {...register('start_time', { required: '开始时间不能为空' })}
                />
                {errors.start_time && (
                  <p className='text-destructive text-sm'>
                    {errors.start_time.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='end_time'>
                  结束时间 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='end_time'
                  type='time'
                  {...register('end_time', { required: '结束时间不能为空' })}
                />
                {errors.end_time && (
                  <p className='text-destructive text-sm'>
                    {errors.end_time.message}
                  </p>
                )}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>生效起始日期</Label>
                <Controller
                  name='effective_start_date'
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {field.value
                            ? format(field.value, 'yyyy-MM-dd')
                            : '选择日期（可选）'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className='space-y-2'>
                <Label>生效结束日期</Label>
                <Controller
                  name='effective_end_date'
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {field.value
                            ? format(field.value, 'yyyy-MM-dd')
                            : '选择日期（可选）'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
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

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='enabled'>启用规则</Label>
                <Controller
                  name='enabled'
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id='enabled'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
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
          </div>

          {/* 触发条件 */}
          <div className='space-y-4'>
            <div>
              <h3 className='mb-1 text-sm font-medium'>触发条件</h3>
              <p className='text-muted-foreground text-sm'>
                满足以下条件时应用此规则
              </p>
            </div>
            <ConditionEditor
              conditionGroups={conditionGroups}
              onChange={setConditionGroups}
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
