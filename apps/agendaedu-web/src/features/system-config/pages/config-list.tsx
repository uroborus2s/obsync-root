import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { systemConfigApi, type SystemConfig } from '@/lib/system-config-api'
import { ConfigDialog } from '../components/config-dialog'

interface ConfigListProps {
  configGroup?: string
  title?: string
  description?: string
}

export function ConfigList({ configGroup, title, description }: ConfigListProps) {
  const queryClient = useQueryClient()
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfig, setDeleteConfig] = useState<SystemConfig | null>(null)

  // 获取配置列表
  const { data, isLoading } = useQuery({
    queryKey: ['system-configs', configGroup],
    queryFn: () =>
      configGroup
        ? systemConfigApi.getConfigsByGroup(configGroup)
        : systemConfigApi.getAllConfigs(),
  })

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (configKey: string) =>
      systemConfigApi.deleteConfig(configKey),
    onSuccess: () => {
      toast.success('配置删除成功')
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      setDeleteConfig(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || '删除配置失败')
    },
  })

  const configs = data?.data || []

  const handleEdit = (config: SystemConfig) => {
    setSelectedConfig(config)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedConfig(null)
    setIsDialogOpen(true)
  }

  const handleDelete = (config: SystemConfig) => {
    setDeleteConfig(config)
  }

  const confirmDelete = () => {
    if (deleteConfig) {
      deleteMutation.mutate(deleteConfig.config_key)
    }
  }

  const getConfigTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      string: 'default',
      number: 'secondary',
      boolean: 'outline',
      json: 'destructive',
      date: 'default',
      cron: 'secondary',
    }
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>{title || '系统配置列表'}</CardTitle>
              <CardDescription>
                {description || '查看和管理系统配置参数'}
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className='mr-2 h-4 w-4' />
              新增配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground'>加载中...</div>
            </div>
          ) : configs.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground'>暂无配置数据</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配置键</TableHead>
                  <TableHead>配置值</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className='font-medium'>
                      {config.config_key}
                    </TableCell>
                    <TableCell className='max-w-xs truncate'>
                      {config.config_value || '-'}
                    </TableCell>
                    <TableCell>{getConfigTypeBadge(config.config_type)}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{config.config_group}</Badge>
                    </TableCell>
                    <TableCell className='max-w-xs truncate'>
                      {config.description || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(config.updated_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleEdit(config)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleDelete(config)}
                          disabled={config.is_system}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑/新增对话框 */}
      <ConfigDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        config={selectedConfig}
        defaultGroup={configGroup}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteConfig} onOpenChange={() => setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除配置 "{deleteConfig?.config_key}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

