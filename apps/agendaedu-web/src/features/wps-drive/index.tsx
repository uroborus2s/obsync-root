import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, File, Folder, HardDrive, Plus } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { wpsDriveApi } from './api'
import type { DriveInfo, FileInfo } from './types'

/**
 * WPS云盘管理页面
 * 左侧树形结构展示驱动盘和文件夹，右侧展示详情信息
 */
export default function WpsDriveManagement() {
  const queryClient = useQueryClient()
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [createDriveOpen, setCreateDriveOpen] = useState(false)
  const [newDriveName, setNewDriveName] = useState('')
  const [newDriveDescription, setNewDriveDescription] = useState('')

  // 获取驱动盘列表
  const {
    data: drives,
    isLoading: drivesLoading,
    error: drivesError,
  } = useQuery({
    queryKey: ['wps-drives'],
    queryFn: async () => {
      const result = await wpsDriveApi.getDriveList('app', 20)
      return result
    },
  })

  // 调试日志
  console.log('📊 WpsDriveManagement state:', {
    drives,
    drivesLoading,
    drivesError,
    drivesCount: drives?.length,
  })

  // 创建驱动盘的mutation
  const createDriveMutation = useMutation({
    mutationFn: (params: { name: string; description?: string }) =>
      wpsDriveApi.createDrive({
        allotee_id: 'app',
        allotee_type: 'app',
        name: params.name,
        description: params.description,
        source: 'yundoc',
      }),
    onSuccess: () => {
      toast.success('驱动盘创建成功')
      queryClient.invalidateQueries({ queryKey: ['wps-drives'] })
      setCreateDriveOpen(false)
      setNewDriveName('')
      setNewDriveDescription('')
    },
    onError: (error: Error) => {
      toast.error(`创建驱动盘失败: ${error.message}`)
    },
  })

  // 处理创建驱动盘
  const handleCreateDrive = () => {
    if (!newDriveName.trim()) {
      toast.error('请输入驱动盘名称')
      return
    }
    createDriveMutation.mutate({
      name: newDriveName,
      description: newDriveDescription,
    })
  }

  // 获取选中驱动盘的元数据
  const { data: driveMeta, isLoading: driveMetaLoading } = useQuery({
    queryKey: ['wps-drive-meta', selectedDrive?.id],
    queryFn: () => wpsDriveApi.getDriveMeta(selectedDrive!.id, true),
    enabled: !!selectedDrive && !selectedFile,
  })

  // 获取选中文件的元数据
  const { data: fileMeta, isLoading: fileMetaLoading } = useQuery({
    queryKey: ['wps-file-meta', selectedFile?.id],
    queryFn: () => wpsDriveApi.getFileMeta(selectedFile!.id, true, true, true),
    enabled: !!selectedFile,
  })

  const handleDriveClick = (drive: DriveInfo) => {
    setSelectedDrive(drive)
    setSelectedFile(null)
  }

  const handleFileClick = (file: FileInfo) => {
    setSelectedFile(file)
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            WPS云盘管理
          </h1>
          <p className='text-muted-foreground'>
            管理WPS驱动盘、文件夹和文件，查看详细信息。
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        <div className='flex h-[calc(100vh-240px)] gap-4'>
          {/* 左侧树形结构 */}
          <div className='w-1/3 border-r'>
            <Card className='h-full rounded-none border-0'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>驱动盘和文件</CardTitle>
                    <CardDescription>浏览驱动盘和文件结构</CardDescription>
                  </div>
                  <Dialog
                    open={createDriveOpen}
                    onOpenChange={setCreateDriveOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size='sm' variant='outline'>
                        <Plus className='h-4 w-4' />
                        新建驱动盘
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>新建驱动盘</DialogTitle>
                        <DialogDescription>
                          创建一个新的WPS云盘驱动盘
                        </DialogDescription>
                      </DialogHeader>
                      <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                          <Label htmlFor='drive-name'>驱动盘名称 *</Label>
                          <Input
                            id='drive-name'
                            placeholder='请输入驱动盘名称'
                            value={newDriveName}
                            onChange={(e) => setNewDriveName(e.target.value)}
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='drive-description'>驱动盘描述</Label>
                          <Input
                            id='drive-description'
                            placeholder='请输入驱动盘描述（可选）'
                            value={newDriveDescription}
                            onChange={(e) =>
                              setNewDriveDescription(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant='outline'
                          onClick={() => setCreateDriveOpen(false)}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleCreateDrive}
                          disabled={createDriveMutation.isPending}
                        >
                          {createDriveMutation.isPending ? '创建中...' : '创建'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className='h-[calc(100vh-380px)]'>
                  {drivesLoading ? (
                    <div className='space-y-2'>
                      <Skeleton className='h-8 w-full' />
                      <Skeleton className='h-8 w-full' />
                      <Skeleton className='h-8 w-full' />
                    </div>
                  ) : drivesError ? (
                    <div className='text-destructive p-4'>
                      <p className='font-semibold'>加载失败</p>
                      <p className='text-sm'>{String(drivesError)}</p>
                    </div>
                  ) : !drives || drives.length === 0 ? (
                    <div className='text-muted-foreground p-4'>
                      <p>暂无驱动盘数据</p>
                      <p className='mt-2 text-sm'>
                        调试信息: drives = {JSON.stringify(drives)}
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-1'>
                      {drives.map((drive) => (
                        <DriveTreeNode
                          key={drive.id}
                          drive={drive}
                          isSelected={selectedDrive?.id === drive.id}
                          onClick={handleDriveClick}
                          onFileClick={handleFileClick}
                          expandedFolders={expandedFolders}
                          toggleFolder={toggleFolder}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 右侧详情信息 */}
          <div className='w-2/3'>
            <Card className='h-full rounded-none border-0'>
              <CardHeader>
                <CardTitle>详情信息</CardTitle>
                <CardDescription>
                  {selectedFile
                    ? '文件详情'
                    : selectedDrive
                      ? '驱动盘详情'
                      : '请选择一个项目'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className='h-[calc(100vh-380px)]'>
                  {selectedFile ? (
                    fileMetaLoading ? (
                      <DetailsSkeleton />
                    ) : (
                      <FileDetails file={fileMeta!} />
                    )
                  ) : selectedDrive ? (
                    driveMetaLoading ? (
                      <DetailsSkeleton />
                    ) : (
                      <DriveDetails drive={driveMeta!} />
                    )
                  ) : (
                    <div className='text-muted-foreground flex h-full items-center justify-center'>
                      请从左侧选择一个驱动盘或文件
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}

/**
 * 驱动盘树节点组件
 *
 * 功能说明：
 * - 点击驱动盘时自动展开并加载子文件/文件夹
 * - 同时触发两个API调用：getDriveMeta（获取元数据）和 getChildren（获取子节点）
 * - 移除了展开/折叠图标，点击即展开
 */
function DriveTreeNode({
  drive,
  isSelected,
  onClick,
  onFileClick,
  expandedFolders,
  toggleFolder,
}: {
  drive: DriveInfo
  isSelected: boolean
  onClick: (drive: DriveInfo) => void
  onFileClick: (file: FileInfo) => void
  expandedFolders: Set<string>
  toggleFolder: (folderId: string) => void
}) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [createFileOpen, setCreateFileOpen] = useState(false)
  const [createFileType, setCreateFileType] = useState<'file' | 'folder'>(
    'folder'
  )
  const [newFileName, setNewFileName] = useState('')

  // 获取根目录的子节点（parent_id = '0' 表示根目录）
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['wps-drive-children', drive.id, '0'],
    queryFn: async () => {
      console.log(`🔍 获取驱动盘 ${drive.name} 的子节点...`)
      const result = await wpsDriveApi.getChildren(drive.id, '0', 100)
      console.log(`✅ 驱动盘 ${drive.name} 的子节点:`, result)
      console.log(`📊 子节点数量: ${result?.items?.length || 0}`)
      console.log(`📋 子节点列表:`, result?.items)
      return result
    },
    enabled: isExpanded, // 只有展开时才加载
  })

  // 创建文件/文件夹的mutation
  const createFileMutation = useMutation({
    mutationFn: (params: { name: string; file_type: 'file' | 'folder' }) =>
      wpsDriveApi.createFile({
        drive_id: drive.id,
        parent_id: '0',
        file_type: params.file_type,
        name: params.name,
        on_name_conflict: 'rename',
      }),
    onSuccess: () => {
      toast.success(
        createFileType === 'folder' ? '文件夹创建成功' : '文件创建成功'
      )
      queryClient.invalidateQueries({
        queryKey: ['wps-drive-children', drive.id, '0'],
      })
      setCreateFileOpen(false)
      setNewFileName('')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 处理创建文件/文件夹
  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      toast.error('请输入名称')
      return
    }
    createFileMutation.mutate({
      name: newFileName,
      file_type: createFileType,
    })
  }

  // 打开创建对话框
  const openCreateDialog = (type: 'file' | 'folder') => {
    setCreateFileType(type)
    setCreateFileOpen(true)
    setNewFileName('')
  }

  // 处理驱动盘点击事件
  const handleDriveClick = () => {
    console.log(`🖱️ 点击驱动盘: ${drive.name} (ID: ${drive.id})`)

    // 1. 切换展开状态
    setIsExpanded(!isExpanded)

    // 2. 调用父组件的 onClick，触发 getDriveMeta API
    // 这会在右侧详情面板显示驱动盘的元数据
    onClick(drive)

    // 3. 如果是展开操作，useQuery 会自动触发 getChildren API
    // 因为 enabled 依赖于 isExpanded 状态
  }

  return (
    <div>
      {/* 驱动盘节点 - 带右键菜单 */}
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${
              isSelected ? 'bg-accent font-medium' : ''
            }`}
            onClick={handleDriveClick}
          >
            <HardDrive className='text-primary h-4 w-4' />
            <span className='text-sm'>{drive.name}</span>
            {childrenLoading && (
              <span className='text-muted-foreground ml-auto text-xs'>
                加载中...
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => openCreateDialog('folder')}>
            <Folder className='mr-2 h-4 w-4' />
            新建文件夹
          </ContextMenuItem>
          <ContextMenuItem onClick={() => openCreateDialog('file')}>
            <File className='mr-2 h-4 w-4' />
            新建文件
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 创建文件/文件夹对话框 */}
      <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createFileType === 'folder' ? '新建文件夹' : '新建文件'}
            </DialogTitle>
            <DialogDescription>
              在驱动盘 "{drive.name}" 的根目录下创建
              {createFileType === 'folder' ? '文件夹' : '文件'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='file-name'>
                {createFileType === 'folder' ? '文件夹名称' : '文件名称'} *
              </Label>
              <Input
                id='file-name'
                placeholder={
                  createFileType === 'folder'
                    ? '请输入文件夹名称'
                    : '请输入文件名称（如：文档.docx）'
                }
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateFileOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateFile}
              disabled={createFileMutation.isPending}
            >
              {createFileMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 子文件/文件夹列表 */}
      {isExpanded && children && (
        <div className='ml-6 space-y-1 border-l pl-2'>
          {children.items.length === 0 ? (
            <div className='text-muted-foreground px-2 py-1 text-xs'>
              暂无文件
            </div>
          ) : (
            children.items.map((item) => (
              <FileTreeNode
                key={item.id}
                file={item}
                driveId={drive.id}
                onFileClick={onFileClick}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 文件/文件夹树节点组件
 */
function FileTreeNode({
  file,
  driveId,
  onFileClick,
  expandedFolders,
  toggleFolder,
}: {
  file: FileInfo
  driveId: string
  onFileClick: (file: FileInfo) => void
  expandedFolders: Set<string>
  toggleFolder: (folderId: string) => void
}) {
  const isFolder = file.type === 'folder'
  const isExpanded = expandedFolders.has(file.id)

  // 获取文件夹的子节点
  const { data: children } = useQuery({
    queryKey: ['wps-drive-children', driveId, file.id],
    queryFn: () => wpsDriveApi.getChildren(driveId, file.id, 100),
    enabled: isFolder && isExpanded,
  })

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(file.id)
    }
    onFileClick(file)
  }

  return (
    <div>
      <div
        className='hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5'
        onClick={handleClick}
      >
        {isFolder && (
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
        {!isFolder && <div className='w-4' />}
        {isFolder ? (
          <Folder className='h-4 w-4' />
        ) : (
          <File className='h-4 w-4' />
        )}
        <span className='text-sm'>{file.name}</span>
      </div>
      {isFolder && isExpanded && children && (
        <div className='ml-6 space-y-1'>
          {children.items.map((item) => (
            <FileTreeNode
              key={item.id}
              file={item}
              driveId={driveId}
              onFileClick={onFileClick}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 驱动盘详情组件
 */
function DriveDetails({ drive }: { drive: DriveInfo }) {
  return (
    <div className='space-y-4'>
      <DetailItem label='驱动盘名称' value={drive.name} />
      <DetailItem label='驱动盘ID' value={drive.id} />
      <DetailItem label='描述' value={drive.description || '无'} />
      <DetailItem label='归属类型' value={drive.allotee_type} />
      <DetailItem label='归属ID' value={drive.allotee_id} />
      <DetailItem label='状态' value={drive.status} />
      <Separator />
      <div>
        <h3 className='mb-2 font-semibold'>容量信息</h3>
        <DetailItem label='总容量' value={formatBytes(drive.quota.total)} />
        <DetailItem label='已使用' value={formatBytes(drive.quota.used)} />
        <DetailItem label='剩余' value={formatBytes(drive.quota.remaining)} />
        <DetailItem label='回收站' value={formatBytes(drive.quota.deleted)} />
      </div>
    </div>
  )
}

/**
 * 文件详情组件
 */
function FileDetails({ file }: { file: FileInfo }) {
  return (
    <div className='space-y-4'>
      <DetailItem label='文件名' value={file.name} />
      <DetailItem label='文件ID' value={file.id} />
      <DetailItem label='类型' value={file.type} />
      <DetailItem label='大小' value={formatBytes(file.size)} />
      <DetailItem label='父目录ID' value={file.parent_id} />
      <DetailItem
        label='创建时间'
        value={new Date(file.ctime * 1000).toLocaleString()}
      />
      <DetailItem
        label='修改时间'
        value={new Date(file.mtime * 1000).toLocaleString()}
      />
      <DetailItem label='是否共享' value={file.shared ? '是' : '否'} />
    </div>
  )
}

/**
 * 详情项组件
 */
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid grid-cols-3 gap-4'>
      <div className='text-muted-foreground font-medium'>{label}</div>
      <div className='col-span-2'>{value}</div>
    </div>
  )
}

/**
 * 详情加载骨架屏
 */
function DetailsSkeleton() {
  return (
    <div className='space-y-4'>
      {[...Array(6)].map((_, i) => (
        <div key={i} className='grid grid-cols-3 gap-4'>
          <Skeleton className='h-5 w-full' />
          <Skeleton className='col-span-2 h-5 w-full' />
        </div>
      ))}
    </div>
  )
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
