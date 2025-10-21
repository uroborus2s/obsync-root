/**
 * 权限添加/编辑对话框
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as z from 'zod'
import { permissionApi } from '@/lib/rbac-api'
import type { PermissionEntity } from '@/types/rbac.types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  name: z.string().min(1, '权限名称不能为空').max(100, '权限名称不能超过100个字符'),
  code: z
    .string()
    .min(1, '权限代码不能为空')
    .max(100, '权限代码不能超过100个字符')
    .regex(/^[a-zA-Z0-9_:]+$/, '权限代码只能包含字母、数字、下划线和冒号'),
  resource: z.string().min(1, '资源类型不能为空').max(50, '资源类型不能超过50个字符'),
  action: z.string().min(1, '操作类型不能为空').max(50, '操作类型不能超过50个字符'),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission?: PermissionEntity | null
}

export function PermissionDialog({
  open,
  onOpenChange,
  permission,
}: PermissionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!permission

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      resource: '',
      action: '',
      description: '',
    },
  })

  // 当权限数据变化时更新表单
  useEffect(() => {
    if (permission) {
      form.reset({
        name: permission.name,
        code: permission.code,
        resource: permission.resource,
        action: permission.action,
        description: permission.description || '',
      })
    } else {
      form.reset({
        name: '',
        code: '',
        resource: '',
        action: '',
        description: '',
      })
    }
  }, [permission, form])

  // 创建权限
  const createMutation = useMutation({
    mutationFn: permissionApi.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('权限创建成功')
      onOpenChange(false)
      form.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '权限创建失败')
    },
  })

  // 更新权限
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      permissionApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast.success('权限更新成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '权限更新失败')
    },
  })

  const onSubmit = (values: FormValues) => {
    if (isEdit && permission) {
      updateMutation.mutate({
        id: permission.id,
        data: {
          name: values.name,
          description: values.description || null,
        },
      })
    } else {
      createMutation.mutate({
        name: values.name,
        code: values.code,
        resource: values.resource,
        action: values.action,
        description: values.description || null,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑权限' : '添加权限'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改权限信息' : '创建新的权限'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder='例如：查看用户列表' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限代码 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='例如：user:view'
                      {...field}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEdit ? '权限代码创建后不可修改' : '格式：资源:操作'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='resource'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>资源类型 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如：user'
                        {...field}
                        disabled={isEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='action'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>操作类型 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如：view'
                        {...field}
                        disabled={isEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='权限的详细描述'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? '保存中...' : isEdit ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

