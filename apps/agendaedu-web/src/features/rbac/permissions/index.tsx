/**
 * 权限管理页面
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Plus, Shield } from 'lucide-react'
import { permissionApi } from '@/lib/rbac-api'
import type { PermissionEntity } from '@/types/rbac.types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { getPermissionColumns } from './components/permission-columns'
import { PermissionDialog } from './components/permission-dialog'
import { DeletePermissionDialog } from './components/delete-permission-dialog'

export default function PermissionsPage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPermission, setSelectedPermission] =
    useState<PermissionEntity | null>(null)

  // 获取权限列表
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionApi.getAllPermissions,
  })

  // 处理编辑
  const handleEdit = (permission: PermissionEntity) => {
    setSelectedPermission(permission)
    setShowDialog(true)
  }

  // 处理删除
  const handleDelete = (permission: PermissionEntity) => {
    setSelectedPermission(permission)
    setShowDeleteDialog(true)
  }

  // 处理添加
  const handleAdd = () => {
    setSelectedPermission(null)
    setShowDialog(true)
  }

  const columns = getPermissionColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  const table = useReactTable({
    data: permissions,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
              <Shield className='h-8 w-8' />
              权限管理
            </h1>
            <p className='text-muted-foreground'>
              管理系统权限，定义用户可以执行的操作
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className='mr-2 h-4 w-4' />
            添加权限
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>权限列表</CardTitle>
            <CardDescription>
              共 {permissions.length} 个权限
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {/* 搜索框 */}
              <div className='flex items-center gap-2'>
                <Input
                  placeholder='搜索权限名称或代码...'
                  value={
                    (table.getColumn('name')?.getFilterValue() as string) ?? ''
                  }
                  onChange={(event) =>
                    table.getColumn('name')?.setFilterValue(event.target.value)
                  }
                  className='max-w-sm'
                />
              </div>

              {/* 表格 */}
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className='h-24 text-center'
                        >
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className='h-24 text-center'
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              <div className='flex items-center justify-between'>
                <div className='text-muted-foreground text-sm'>
                  共 {table.getFilteredRowModel().rows.length} 条记录
                </div>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    上一页
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>

      {/* 添加/编辑对话框 */}
      <PermissionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        permission={selectedPermission}
      />

      {/* 删除确认对话框 */}
      <DeletePermissionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        permission={selectedPermission}
      />
    </>
  )
}

