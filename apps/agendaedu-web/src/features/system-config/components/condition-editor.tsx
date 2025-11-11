import type {
  ConditionDimension,
  ConditionFormData,
  ConditionGroupFormData,
  ConditionOperator,
} from '@/types/course-period.types'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ConditionEditorProps {
  conditionGroups: ConditionGroupFormData[]
  onChange: (groups: ConditionGroupFormData[]) => void
}

// 条件维度配置
const DIMENSION_OPTIONS: Array<{
  value: ConditionDimension
  label: string
  operators: ConditionOperator[]
  valueType: 'text' | 'number' | 'select'
  selectOptions?: Array<{ value: string; label: string }>
}> = [
  {
    value: 'school_name',
    label: '学院名称',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'school_id',
    label: '学院代码',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'major_name',
    label: '专业名称',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'major_id',
    label: '专业代码',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'class_name',
    label: '班级名称',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'class_id',
    label: '班级代码',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'grade',
    label: '年级',
    operators: ['=', '!=', '>', '>=', '<', '<=', 'between'],
    valueType: 'number',
  },
  {
    value: 'course_unit',
    label: '开课单位',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'course_unit_id',
    label: '开课单位代码',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'text',
  },
  {
    value: 'class_location',
    label: '上课地址',
    operators: ['=', '!='],
    valueType: 'text',
  },
  {
    value: 'teaching_week',
    label: '教学周',
    operators: ['=', '!=', '>', '>=', '<', '<=', 'between'],
    valueType: 'number',
  },
  {
    value: 'week_day',
    label: '星期几',
    operators: ['=', '!=', 'in', 'not_in'],
    valueType: 'select',
    selectOptions: [
      { value: '1', label: '星期一' },
      { value: '2', label: '星期二' },
      { value: '3', label: '星期三' },
      { value: '4', label: '星期四' },
      { value: '5', label: '星期五' },
      { value: '6', label: '星期六' },
      { value: '7', label: '星期日' },
    ],
  },
  {
    value: 'time_period',
    label: '时间段',
    operators: ['=', '!='],
    valueType: 'select',
    selectOptions: [
      { value: 'am', label: '上午' },
      { value: 'pm', label: '下午' },
    ],
  },
]

// 运算符标签
const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  '=': '等于',
  '!=': '不等于',
  in: '包含于',
  not_in: '不包含于',
  '>': '大于',
  '>=': '大于等于',
  '<': '小于',
  '<=': '小于等于',
  between: '介于',
}

export function ConditionEditor({
  conditionGroups,
  onChange,
}: ConditionEditorProps) {
  // 添加条件组
  const addConditionGroup = () => {
    const newGroup: ConditionGroupFormData = {
      group_no: conditionGroups.length + 1,
      group_connector: 'OR',
      conditions: [
        {
          dimension: '',
          operator: '',
          value: '',
        },
      ],
    }
    onChange([...conditionGroups, newGroup])
  }

  // 删除条件组
  const removeConditionGroup = (groupIndex: number) => {
    const newGroups = conditionGroups.filter((_, index) => index !== groupIndex)
    // 重新编号
    newGroups.forEach((group, index) => {
      group.group_no = index + 1
    })
    onChange(newGroups)
  }

  // 添加条件
  const addCondition = (groupIndex: number) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].conditions.push({
      dimension: '',
      operator: '',
      value: '',
    })
    onChange(newGroups)
  }

  // 删除条件
  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].conditions = newGroups[groupIndex].conditions.filter(
      (_, index) => index !== conditionIndex
    )
    onChange(newGroups)
  }

  // 更新条件
  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: keyof ConditionFormData,
    value: any
  ) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].conditions[conditionIndex] = {
      ...newGroups[groupIndex].conditions[conditionIndex],
      [field]: value,
    }

    // 如果修改了维度，重置运算符和值
    if (field === 'dimension') {
      newGroups[groupIndex].conditions[conditionIndex].operator = ''
      newGroups[groupIndex].conditions[conditionIndex].value = ''
    }

    // 如果修改了运算符，重置值
    if (field === 'operator') {
      newGroups[groupIndex].conditions[conditionIndex].value = ''
    }

    onChange(newGroups)
  }

  // 获取维度配置
  const getDimensionConfig = (dimension: ConditionDimension | '') => {
    return DIMENSION_OPTIONS.find((opt) => opt.value === dimension)
  }

  // 渲染值输入控件
  const renderValueInput = (
    groupIndex: number,
    conditionIndex: number,
    condition: ConditionFormData
  ) => {
    const dimensionConfig = getDimensionConfig(condition.dimension)
    if (!dimensionConfig || !condition.operator) return null

    const operator = condition.operator as ConditionOperator

    // between 运算符
    if (operator === 'between') {
      const value =
        typeof condition.value === 'object' && 'min' in condition.value
          ? condition.value
          : { min: '', max: '' }
      return (
        <div className='flex items-center gap-2'>
          <Input
            type={dimensionConfig.valueType === 'number' ? 'number' : 'text'}
            placeholder='最小值'
            value={value.min}
            onChange={(e) =>
              updateCondition(groupIndex, conditionIndex, 'value', {
                ...value,
                min: e.target.value,
              })
            }
          />
          <span className='text-muted-foreground text-sm'>至</span>
          <Input
            type={dimensionConfig.valueType === 'number' ? 'number' : 'text'}
            placeholder='最大值'
            value={value.max}
            onChange={(e) =>
              updateCondition(groupIndex, conditionIndex, 'value', {
                ...value,
                max: e.target.value,
              })
            }
          />
        </div>
      )
    }

    // in/not_in 运算符
    if (operator === 'in' || operator === 'not_in') {
      const value = Array.isArray(condition.value)
        ? condition.value.join(',')
        : String(condition.value || '')
      return (
        <Input
          placeholder='多个值用逗号分隔，如: 值1,值2,值3'
          value={value}
          onChange={(e) =>
            updateCondition(
              groupIndex,
              conditionIndex,
              'value',
              e.target.value.split(',').map((v) => v.trim())
            )
          }
        />
      )
    }

    // select 类型
    if (dimensionConfig.valueType === 'select') {
      return (
        <Select
          value={String(condition.value || '')}
          onValueChange={(value) =>
            updateCondition(groupIndex, conditionIndex, 'value', value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder='选择值' />
          </SelectTrigger>
          <SelectContent>
            {dimensionConfig.selectOptions?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // 默认输入框
    return (
      <Input
        type={dimensionConfig.valueType === 'number' ? 'number' : 'text'}
        placeholder='输入值'
        value={String(condition.value || '')}
        onChange={(e) =>
          updateCondition(groupIndex, conditionIndex, 'value', e.target.value)
        }
      />
    )
  }

  return (
    <div className='space-y-4'>
      {conditionGroups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {groupIndex > 0 && (
            <div className='my-2 flex justify-center'>
              <Badge variant='secondary' className='text-sm'>
                {group.group_connector}
              </Badge>
            </div>
          )}

          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-medium'>
                  条件组 {group.group_no}
                  {group.conditions.length > 1 && (
                    <Badge variant='outline' className='ml-2'>
                      AND
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => removeConditionGroup(groupIndex)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-3'>
              {group.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className='space-y-2'>
                  <div className='grid grid-cols-12 gap-2'>
                    {/* 维度选择 */}
                    <div className='col-span-3'>
                      <Select
                        value={condition.dimension}
                        onValueChange={(value) =>
                          updateCondition(
                            groupIndex,
                            conditionIndex,
                            'dimension',
                            value
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='选择维度' />
                        </SelectTrigger>
                        <SelectContent>
                          {DIMENSION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 运算符选择 */}
                    <div className='col-span-2'>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(
                            groupIndex,
                            conditionIndex,
                            'operator',
                            value
                          )
                        }
                        disabled={!condition.dimension}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='运算符' />
                        </SelectTrigger>
                        <SelectContent>
                          {getDimensionConfig(
                            condition.dimension
                          )?.operators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {OPERATOR_LABELS[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 值输入 */}
                    <div className='col-span-6'>
                      {renderValueInput(groupIndex, conditionIndex, condition)}
                    </div>

                    {/* 删除按钮 */}
                    <div className='col-span-1 flex items-center'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() =>
                          removeCondition(groupIndex, conditionIndex)
                        }
                        disabled={group.conditions.length === 1}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => addCondition(groupIndex)}
                className='w-full'
              >
                <Plus className='mr-2 h-4 w-4' />
                添加条件
              </Button>
            </CardContent>
          </Card>
        </div>
      ))}

      <Button
        type='button'
        variant='outline'
        onClick={addConditionGroup}
        className='w-full'
      >
        <Plus className='mr-2 h-4 w-4' />
        添加条件组 (OR)
      </Button>
    </div>
  )
}
