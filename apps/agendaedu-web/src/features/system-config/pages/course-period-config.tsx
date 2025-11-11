import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CoursePeriodRuleWithConditions } from '@/types/course-period.types'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  batchCreatePeriods,
  deleteRule,
  getActiveTerm,
  getAllTerms,
  getPeriodsWithRules,
} from '@/api/course-period.api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PeriodEditDialog } from '../components/period-edit-dialog'
import { RuleEditDialog } from '../components/rule-edit-dialog'

export function CoursePeriodConfig() {
  const queryClient = useQueryClient()
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(new Set())
  const [selectedRule, setSelectedRule] =
    useState<CoursePeriodRuleWithConditions | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)
  const [deleteRuleData, setDeleteRuleData] =
    useState<CoursePeriodRuleWithConditions | null>(null)

  // 获取所有学期
  const { data: terms } = useQuery({
    queryKey: ['terms'],
    queryFn: getAllTerms,
  })

  // 获取当前激活学期
  const { data: activeTerm } = useQuery({
    queryKey: ['active-term'],
    queryFn: getActiveTerm,
  })

  // 当激活学期加载完成且未选择学期时，自动选择激活学期
  if (activeTerm && !selectedTermId && terms) {
    setSelectedTermId(activeTerm.id)
  }

  // 获取课节及规则
  const { data: periodsWithRules, isLoading } = useQuery({
    queryKey: ['periods-with-rules', selectedTermId],
    queryFn: () => getPeriodsWithRules(selectedTermId!),
    enabled: !!selectedTermId,
  })

  // 删除规则
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRule(id),
    onSuccess: () => {
      toast.success('规则删除成功')
      queryClient.invalidateQueries({ queryKey: ['periods-with-rules'] })
      setDeleteRuleData(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || '删除规则失败')
    },
  })

  // 初始化课节（创建默认的8节课）
  const initPeriodsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTermId) return []
      const defaultPeriods = [
        {
          period_no: 1,
          name: '第一节',
          start_time: '08:00:00',
          end_time: '08:45:00',
        },
        {
          period_no: 2,
          name: '第二节',
          start_time: '08:55:00',
          end_time: '09:40:00',
        },
        {
          period_no: 3,
          name: '第三节',
          start_time: '10:00:00',
          end_time: '10:45:00',
        },
        {
          period_no: 4,
          name: '第四节',
          start_time: '10:55:00',
          end_time: '11:40:00',
        },
        {
          period_no: 5,
          name: '第五节',
          start_time: '14:00:00',
          end_time: '14:45:00',
        },
        {
          period_no: 6,
          name: '第六节',
          start_time: '14:55:00',
          end_time: '15:40:00',
        },
        {
          period_no: 7,
          name: '第七节',
          start_time: '16:00:00',
          end_time: '16:45:00',
        },
        {
          period_no: 8,
          name: '第八节',
          start_time: '16:55:00',
          end_time: '17:40:00',
        },
      ].map((p) => ({
        term_id: selectedTermId,
        period_no: p.period_no,
        name: p.name,
        default_start_time: p.start_time,
        default_end_time: p.end_time,
        is_active: true,
      }))
      return batchCreatePeriods(defaultPeriods)
    },
    onSuccess: () => {
      toast.success('课节初始化成功')
      queryClient.invalidateQueries({ queryKey: ['periods-with-rules'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || '初始化课节失败')
    },
  })

  const togglePeriodExpand = (periodId: number) => {
    const newExpanded = new Set(expandedPeriods)
    if (newExpanded.has(periodId)) {
      newExpanded.delete(periodId)
    } else {
      newExpanded.add(periodId)
    }
    setExpandedPeriods(newExpanded)
  }

  const handleCreateRule = (periodId: number) => {
    setSelectedPeriodId(periodId)
    setSelectedRule(null)
    setIsRuleDialogOpen(true)
  }

  const handleEditRule = (rule: CoursePeriodRuleWithConditions) => {
    setSelectedPeriodId(rule.rule.period_id)
    setSelectedRule(rule)
    setIsRuleDialogOpen(true)
  }

  const handleDeleteRule = (rule: CoursePeriodRuleWithConditions) => {
    setDeleteRuleData(rule)
  }

  const confirmDeleteRule = () => {
    if (deleteRuleData) {
      deleteMutation.mutate(deleteRuleData.rule.id)
    }
  }

  const handleEditPeriod = (periodId: number) => {
    setSelectedPeriodId(periodId)
    setIsPeriodDialogOpen(true)
  }

  const handleRuleDialogClose = () => {
    setIsRuleDialogOpen(false)
    setSelectedRule(null)
    setSelectedPeriodId(null)
  }

  const handlePeriodDialogClose = () => {
    setIsPeriodDialogOpen(false)
    setSelectedPeriodId(null)
  }

  return (
    <div className='w-full space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>课程时间表配置</CardTitle>
              <CardDescription>配置每节课的默认时间和条件规则</CardDescription>
            </div>
            <div className='flex gap-2'>
              <Select
                value={selectedTermId?.toString() || ''}
                onValueChange={(value) => setSelectedTermId(Number(value))}
              >
                <SelectTrigger className='w-[250px]'>
                  <SelectValue placeholder='选择学期' />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term.id} value={term.id.toString()}>
                      {term.name}
                      {term.is_active && (
                        <Badge variant='default' className='ml-2'>
                          当前
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTermId &&
                periodsWithRules &&
                periodsWithRules.length === 0 && (
                  <Button
                    onClick={() => initPeriodsMutation.mutate()}
                    disabled={initPeriodsMutation.isPending}
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    初始化课节
                  </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTermId ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <Clock className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <p className='text-muted-foreground text-sm'>请先选择学期</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground text-sm'>加载中...</div>
            </div>
          ) : periodsWithRules && periodsWithRules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'></TableHead>
                  <TableHead>节次</TableHead>
                  <TableHead>节次名称</TableHead>
                  <TableHead>默认开始时间</TableHead>
                  <TableHead>默认结束时间</TableHead>
                  <TableHead>规则数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodsWithRules.map((periodWithRules) => {
                  const period = periodWithRules.period
                  const rules = periodWithRules.rules
                  const isExpanded = expandedPeriods.has(period.id)

                  return (
                    <>
                      <TableRow key={period.id}>
                        <TableCell>
                          {rules.length > 0 && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-6 w-6'
                              onClick={() => togglePeriodExpand(period.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className='h-4 w-4' />
                              ) : (
                                <ChevronRight className='h-4 w-4' />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className='font-medium'>
                          第 {period.period_no} 节
                        </TableCell>
                        <TableCell>{period.name || '-'}</TableCell>
                        <TableCell>
                          {period.default_start_time.substring(0, 5)}
                        </TableCell>
                        <TableCell>
                          {period.default_end_time.substring(0, 5)}
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>{rules.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {period.is_active ? (
                            <Badge variant='default'>启用</Badge>
                          ) : (
                            <Badge variant='outline'>禁用</Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleCreateRule(period.id)}
                            >
                              <Plus className='mr-1 h-4 w-4' />
                              添加规则
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleEditPeriod(period.id)}
                            >
                              <Pencil className='h-4 w-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* 展开的规则列表 */}
                      {isExpanded &&
                        rules.map((ruleWithConditions) => {
                          const rule = ruleWithConditions.rule
                          return (
                            <TableRow
                              key={`rule-${rule.id}`}
                              className='bg-muted/50'
                            >
                              <TableCell></TableCell>
                              <TableCell colSpan={2} className='pl-8'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline'>
                                    优先级 {rule.priority}
                                  </Badge>
                                  <span className='text-sm'>
                                    {rule.rule_name || '未命名规则'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {rule.start_time.substring(0, 5)}
                              </TableCell>
                              <TableCell>
                                {rule.end_time.substring(0, 5)}
                              </TableCell>
                              <TableCell>
                                <Badge variant='secondary'>
                                  {ruleWithConditions.conditions.length} 个条件
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {rule.enabled ? (
                                  <Badge variant='default'>启用</Badge>
                                ) : (
                                  <Badge variant='outline'>禁用</Badge>
                                )}
                              </TableCell>
                              <TableCell className='text-right'>
                                <div className='flex justify-end gap-2'>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() =>
                                      handleEditRule(ruleWithConditions)
                                    }
                                  >
                                    <Pencil className='h-4 w-4' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() =>
                                      handleDeleteRule(ruleWithConditions)
                                    }
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <Clock className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <p className='text-muted-foreground mb-4 text-sm'>
                  该学期还没有配置课节时间
                </p>
                <Button
                  onClick={() => initPeriodsMutation.mutate()}
                  disabled={initPeriodsMutation.isPending}
                >
                  <Plus className='mr-2 h-4 w-4' />
                  初始化课节
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 规则编辑对话框 */}
      {selectedPeriodId && (
        <RuleEditDialog
          open={isRuleDialogOpen}
          periodId={selectedPeriodId}
          rule={selectedRule}
          onClose={handleRuleDialogClose}
        />
      )}

      {/* 课节编辑对话框 */}
      {selectedPeriodId && (
        <PeriodEditDialog
          open={isPeriodDialogOpen}
          periodId={selectedPeriodId}
          onClose={handlePeriodDialogClose}
        />
      )}

      {/* 删除规则确认对话框 */}
      <AlertDialog
        open={!!deleteRuleData}
        onOpenChange={(open) => !open && setDeleteRuleData(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除规则 "{deleteRuleData?.rule.rule_name || '未命名规则'}"
              吗？此操作不可恢复！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRule}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
