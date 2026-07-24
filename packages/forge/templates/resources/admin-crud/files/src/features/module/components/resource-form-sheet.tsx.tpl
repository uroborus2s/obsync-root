import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormSheet } from '@/components/admin/forms/form-sheet'
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
import { Textarea } from '@/components/ui/textarea'
import {
  {{camelName}}StatusOptions,
  type {{pascalName}}Record,
} from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import {
  get{{pascalName}}FormDefaults,
  {{camelName}}FormSchema,
  type {{pascalName}}FormValues,
} from '@/features/{{pluralKebabName}}/lib/schema'

interface {{pascalName}}FormSheetProps {
  initialRecord?: {{pascalName}}Record | null
  mode: 'create' | 'edit'
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {{pascalName}}FormValues) => void
  open: boolean
}

export function {{pascalName}}FormSheet({
  initialRecord,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {{pascalName}}FormSheetProps) {
  const form = useForm<{{pascalName}}FormValues>({
    defaultValues: get{{pascalName}}FormDefaults(initialRecord),
    resolver: zodResolver({{camelName}}FormSchema),
  })

  useEffect(() => {
    form.reset(get{{pascalName}}FormDefaults(initialRecord))
  }, [form, initialRecord, mode, open])

  const handleSubmit = form.handleSubmit((values) => onSubmit(values))

  return (
    <FormSheet
      description={
        mode === 'create'
          ? '使用共享表单抽屉快速创建新记录。'
          : '编辑当前记录并保留同一套 CRUD 模块交互。'
      }
      onOpenChange={onOpenChange}
      onSubmit={() => void handleSubmit()}
      open={open}
      submitLabel={mode === 'create' ? '创建记录' : '保存修改'}
      title={mode === 'create' ? '新建{{pascalName}}' : '编辑{{pascalName}}'}
    >
      <Form {...form}>
        <form className='space-y-6' onSubmit={(event) => event.preventDefault()}>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>名称</FormLabel>
                <FormControl>
                  <Input placeholder='{{pascalName}} 名称' {...field} />
                </FormControl>
                <FormDescription>建议与业务实体名称保持一致，便于搜索和筛选。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='owner'
            render={({ field }) => (
              <FormItem>
                <FormLabel>负责人</FormLabel>
                <FormControl>
                  <Input placeholder='负责人姓名' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>状态</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='选择状态' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    { {{camelName}}StatusOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>描述</FormLabel>
                <FormControl>
                  <Textarea
                    className='min-h-28'
                    placeholder='输入记录描述、适用范围或后续说明'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheet>
  )
}
