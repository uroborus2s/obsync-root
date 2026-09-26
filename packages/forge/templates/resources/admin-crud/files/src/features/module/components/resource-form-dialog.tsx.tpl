import { useEffect, useRef } from 'react'
import { FormDialog } from '@/components/admin/forms/form-dialog'
import { FieldGroup, FormFieldLayout, useAppForm } from '@/components/shared/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { {{camelName}}StatusOptions, type {{pascalName}}Record } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import { get{{pascalName}}FormDefaults, {{camelName}}FormSchema, type {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'

interface {{pascalName}}FormDialogProps {
  initialRecord?: {{pascalName}}Record | null
  mode: 'create' | 'edit'
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {{pascalName}}FormValues) => void | Promise<void>
  open: boolean
  submitting?: boolean
}
export function {{pascalName}}FormDialog({ initialRecord, mode, onOpenChange, onSubmit, open, submitting = false }: {{pascalName}}FormDialogProps) {
  const form = useAppForm({
    defaultValues: get{{pascalName}}FormDefaults(initialRecord),
    validators: { onSubmit: {{camelName}}FormSchema },
    onSubmit: async ({ value }) => { await onSubmit(value) },
  })
  const recordRef = useRef(initialRecord)
  recordRef.current = initialRecord
  // Reset only for a new open/record identity; background query refresh must not discard edits.
  useEffect(() => {
    if (open) form.reset(get{{pascalName}}FormDefaults(recordRef.current))
  }, [form, open, mode, initialRecord?.id])
  return <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting]}>
    {([isDirty, isSubmitting]) => <FormDialog open={open} onOpenChange={onOpenChange}
      title={mode === 'create' ? '新建{{pascalName}}' : '编辑{{pascalName}}'} description='填写记录信息，带校验提示的字段请修正后保存。'
      submitLabel={mode === 'create' ? '创建记录' : '保存修改'} submitting={submitting || isSubmitting}
      isDirty={isDirty} onSubmit={() => form.handleSubmit()}>
      <FieldGroup>
        <form.Field name='name'>{(field) => <FormFieldLayout name={field.name} label='名称' errors={field.state.meta.errors}>
          {(props) => <Input {...props} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} />}
        </FormFieldLayout>}</form.Field>
        <form.Field name='owner'>{(field) => <FormFieldLayout name={field.name} label='负责人' errors={field.state.meta.errors}>
          {(props) => <Input {...props} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} />}
        </FormFieldLayout>}</form.Field>
        <form.Field name='status'>{(field) => <FormFieldLayout name={field.name} label='状态' errors={field.state.meta.errors}>
          {(props) => <Select value={field.state.value} onValueChange={(value) => field.handleChange({{camelName}}FormSchema.shape.status.parse(value))}>
            <SelectTrigger {...props} onBlur={field.handleBlur}><SelectValue /></SelectTrigger>
            <SelectContent>{{{camelName}}StatusOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>}
        </FormFieldLayout>}</form.Field>
        <form.Field name='description'>{(field) => <FormFieldLayout name={field.name} label='描述' errors={field.state.meta.errors}>
          {(props) => <Textarea {...props} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} />}
        </FormFieldLayout>}</form.Field>
      </FieldGroup>
    </FormDialog>}
  </form.Subscribe>
}
