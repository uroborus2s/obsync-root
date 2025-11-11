/**
 * 人员管理页面
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TeacherInfo } from '@/types/rbac.types'
import { UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { roleApi, userRoleApi } from '@/lib/rbac-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export default function UsersManagementPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRole, setSelectedRole] = useState<number | null>(null)

  // 获取角色列表
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: roleApi.getAllRoles,
  })

  // 获取教师列表
  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers', page, pageSize, keyword],
    queryFn: () =>
      userRoleApi.getTeachers({
        page,
        page_size: pageSize,
        keyword: keyword || undefined,
      }),
  })

  // 分配角色
  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: number[] }) =>
      userRoleApi.assignRolesToUser({
        userId,
        userType: 'teacher',
        roleIds,
      }),
    onSuccess: () => {
      toast.success('角色分配成功')
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '角色分配失败')
    },
  })

  const handleAssignRole = (teacher: TeacherInfo) => {
    if (!selectedRole) {
      toast.error('请先选择要分配的角色')
      return
    }
    assignRoleMutation.mutate({
      userId: teacher.id,
      roleIds: [selectedRole],
    })
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
            <Users className='h-8 w-8' />
            人员管理
          </h1>
          <p className='text-muted-foreground'>为教师分配角色和权限</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>教师列表</CardTitle>
            <CardDescription>
              共 {teachersData?.total || 0} 位教师
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {/* 搜索和筛选 */}
              <div className='flex gap-4'>
                <Input
                  placeholder='搜索教师姓名、工号或邮箱...'
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className='max-w-sm'
                />
                <Select
                  value={selectedRole?.toString()}
                  onValueChange={(value) => setSelectedRole(Number(value))}
                >
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder='选择角色' />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 教师表格 */}
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>职称</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className='h-24 text-center'>
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : teachersData?.teachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className='h-24 text-center'>
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      teachersData?.teachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell>{teacher.id}</TableCell>
                          <TableCell className='font-medium'>
                            {teacher.name}
                          </TableCell>
                          <TableCell>{teacher.email || '-'}</TableCell>
                          <TableCell>{teacher.department || '-'}</TableCell>
                          <TableCell>{teacher.title || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleAssignRole(teacher)}
                              disabled={assignRoleMutation.isPending}
                            >
                              <UserPlus className='mr-2 h-4 w-4' />
                              分配角色
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {teachersData && (
                <EnhancedPagination
                  page={page}
                  pageSize={pageSize}
                  total={teachersData.total || 0}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  disabled={isLoading}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
