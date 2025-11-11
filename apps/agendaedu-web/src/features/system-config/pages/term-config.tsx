import { useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SystemConfigTerm } from '@/types/course-period.types'
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTerm, getAllTerms, setActiveTerm } from '@/api/course-period.api'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TermDialog } from '../components/term-dialog'

export function TermConfig() {
  const queryClient = useQueryClient()
  const [selectedTerm, setSelectedTerm] = useState<SystemConfigTerm | null>(
    null
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteTermData, setDeleteTermData] = useState<SystemConfigTerm | null>(
    null
  )

  // 获取学期列表
  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: getAllTerms,
  })

  // 删除学期
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTerm(id),
    onSuccess: () => {
      toast.success('学期删除成功')
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      setDeleteTermData(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || '删除学期失败')
    },
  })

  // 设置当前学期
  const setActiveMutation = useMutation({
    mutationFn: (id: number) => setActiveTerm(id),
    onSuccess: () => {
      toast.success('当前学期设置成功')
      queryClient.invalidateQueries({ queryKey: ['terms'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || '设置当前学期失败')
    },
  })

  const handleEdit = (term: SystemConfigTerm) => {
    setSelectedTerm(term)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedTerm(null)
    setIsDialogOpen(true)
  }

  const handleDelete = (term: SystemConfigTerm) => {
    setDeleteTermData(term)
  }

  const confirmDelete = () => {
    if (deleteTermData) {
      deleteMutation.mutate(deleteTermData.id)
    }
  }

  const handleSetActive = (term: SystemConfigTerm) => {
    if (!term.is_active) {
      setActiveMutation.mutate(term.id)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedTerm(null)
  }

  return (
    <div className='w-full space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>学期配置</CardTitle>
              <CardDescription>管理学期信息，设置当前激活学期</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className='mr-2 h-4 w-4' />
              新增学期
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground text-sm'>加载中...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学期编码</TableHead>
                  <TableHead>学期名称</TableHead>
                  <TableHead>开始日期</TableHead>
                  <TableHead>结束日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms && terms.length > 0 ? (
                  terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className='font-medium'>
                        {term.term_code}
                      </TableCell>
                      <TableCell>{term.name}</TableCell>
                      <TableCell>
                        {term.start_date
                          ? format(new Date(term.start_date), 'yyyy-MM-dd')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {term.end_date
                          ? format(new Date(term.end_date), 'yyyy-MM-dd')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {term.is_active ? (
                          <Badge variant='default' className='gap-1'>
                            <CheckCircle2 className='h-3 w-3' />
                            当前学期
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='gap-1'>
                            <Circle className='h-3 w-3' />
                            非当前
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='max-w-[200px] truncate'>
                        {term.remark || '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          {!term.is_active && (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleSetActive(term)}
                              disabled={setActiveMutation.isPending}
                            >
                              设为当前
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleEdit(term)}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleDelete(term)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className='py-8 text-center'>
                      <div className='text-muted-foreground text-sm'>
                        暂无学期数据，请点击"新增学期"按钮添加
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 学期编辑对话框 */}
      <TermDialog
        open={isDialogOpen}
        term={selectedTerm}
        onClose={handleDialogClose}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteTermData}
        onOpenChange={(open) => !open && setDeleteTermData(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除学期 "{deleteTermData?.name}" 吗？
              <br />
              <span className='text-destructive font-medium'>
                删除学期将同时删除该学期下的所有课节配置和规则，此操作不可恢复！
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
