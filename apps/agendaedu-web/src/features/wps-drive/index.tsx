import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  File,
  Folder,
  HardDrive,
  MoreVertical,
  Plus,
  Share,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
 * 文件类型配置
 */
const FILE_TYPES = {
  common: [
    { value: 'doc', label: 'Word文档 (.doc)' },
    { value: 'docx', label: 'Word文档 (.docx)' },
    { value: 'xls', label: 'Excel表格 (.xls)' },
    { value: 'xlsx', label: 'Excel表格 (.xlsx)' },
    { value: 'ppt', label: 'PowerPoint演示文稿 (.ppt)' },
    { value: 'pptx', label: 'PowerPoint演示文稿 (.pptx)' },
    { value: 'form', label: '表单 (.form)' },
    { value: 'otl', label: '大纲 (.otl)' },
    { value: 'dbt', label: '数据库 (.dbt)' },
  ],
  publicOnly: [
    { value: 'pom', label: 'POM文件 (.pom)' },
    { value: 'spt', label: 'SPT文件 (.spt)' },
    { value: 'dppt', label: 'DPPT文件 (.dppt)' },
    { value: 'link', label: '链接 (.link)' },
    { value: 'resh', label: 'RESH文件 (.resh)' },
    { value: 'ckt', label: 'CKT文件 (.ckt)' },
    { value: 'ddoc', label: 'DDOC文档 (.ddoc)' },
    { value: 'dpdf', label: 'DPDF文档 (.dpdf)' },
    { value: 'dxls', label: 'DXLS表格 (.dxls)' },
    { value: 'pof', label: 'POF文件 (.pof)' },
    { value: 'wpsnote', label: 'WPS笔记 (.wpsnote)' },
  ],
}

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

  // 文件上传相关状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadParentPath, setUploadParentPath] = useState('')

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
        description: params.description || '',
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

  // 处理文件上传
  const handleUploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('请选择要上传的文件')
      return
    }

    // 确定上传目标位置
    let targetDriveId: string
    let targetParentId: string

    if (selectedFile && selectedFile.type === 'folder') {
      // 上传到选中的文件夹
      targetDriveId = selectedFile.drive_id
      targetParentId = selectedFile.id
    } else if (selectedDrive) {
      // 上传到驱动盘根目录
      targetDriveId = selectedDrive.id
      targetParentId = '0'
    } else {
      toast.error('请先选择一个驱动盘或文件夹')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 遍历所有选中的文件
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // 使用一体化上传方法（后端代理上传）
        await wpsDriveApi.uploadFile(
          {
            drive_id: targetDriveId,
            parent_id: targetParentId,
            file,
            ...(uploadParentPath && { parent_path: uploadParentPath }),
          },
          (progress) => {
            // 计算总体进度
            const fileProgress =
              ((i + progress / 100) / selectedFiles.length) * 100
            setUploadProgress(Math.round(fileProgress))
          }
        )
      }

      toast.success(`成功上传 ${selectedFiles.length} 个文件`)

      // 刷新文件列表
      queryClient.invalidateQueries({
        queryKey: ['wps-children', targetDriveId, targetParentId],
      })

      // 关闭对话框并重置状态
      setUploadDialogOpen(false)
      setSelectedFiles(null)
      setUploadProgress(0)
      setUploadParentPath('')
    } catch (error: any) {
      toast.error(`上传失败: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
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
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>详情信息</CardTitle>
                    <CardDescription>
                      {selectedFile
                        ? '文件详情'
                        : selectedDrive
                          ? '驱动盘详情'
                          : '请选择一个项目'}
                    </CardDescription>
                  </div>
                  {/* 上传按钮 - 仅在选中驱动盘或文件夹时显示 */}
                  {(selectedDrive ||
                    (selectedFile && selectedFile.type === 'folder')) && (
                    <Dialog
                      open={uploadDialogOpen}
                      onOpenChange={setUploadDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button size='sm' variant='outline'>
                          <Upload className='h-4 w-4' />
                          上传文件
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>上传文件</DialogTitle>
                          <DialogDescription>
                            上传文件到{' '}
                            {selectedFile && selectedFile.type === 'folder'
                              ? `文件夹 "${selectedFile.name}"`
                              : selectedDrive
                                ? `驱动盘 "${selectedDrive.name}" 的根目录`
                                : ''}
                          </DialogDescription>
                        </DialogHeader>
                        <div className='space-y-4 py-4'>
                          <div className='space-y-2'>
                            <Label htmlFor='file-upload'>选择文件 *</Label>
                            <Input
                              id='file-upload'
                              type='file'
                              multiple
                              onChange={(e) => setSelectedFiles(e.target.files)}
                              disabled={isUploading}
                            />
                            {selectedFiles && selectedFiles.length > 0 && (
                              <p className='text-muted-foreground text-sm'>
                                已选择 {selectedFiles.length} 个文件
                              </p>
                            )}
                          </div>
                          <div className='space-y-2'>
                            <Label htmlFor='upload-parent-path'>
                              父文件夹路径（可选）
                            </Label>
                            <Input
                              id='upload-parent-path'
                              type='text'
                              placeholder='例如：/2024/photos 或 folder1/folder2'
                              value={uploadParentPath}
                              onChange={(e) =>
                                setUploadParentPath(e.target.value)
                              }
                              disabled={isUploading}
                            />
                            <p className='text-muted-foreground text-xs'>
                              留空表示上传到当前选中的位置。使用 /
                              分隔路径层级，如果路径不存在会自动创建。
                            </p>
                          </div>
                          {isUploading && (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between text-sm'>
                                <span>上传进度</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
                                <div
                                  className='bg-primary h-full transition-all duration-300'
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className='flex justify-end gap-2'>
                          <Button
                            variant='outline'
                            onClick={() => setUploadDialogOpen(false)}
                            disabled={isUploading}
                          >
                            取消
                          </Button>
                          <Button
                            onClick={handleUploadFiles}
                            disabled={
                              isUploading ||
                              !selectedFiles ||
                              selectedFiles.length === 0
                            }
                          >
                            {isUploading ? '上传中...' : '开始上传'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
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
  const [fileExtension, setFileExtension] = useState('docx')
  const [parentPath, setParentPath] = useState('')
  const [currentParentId, setCurrentParentId] = useState('0') // 当前创建文件/文件夹的父目录ID
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null)

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
    mutationFn: (params: {
      name: string
      file_type: 'file' | 'folder'
      parent_path?: string[]
    }) =>
      wpsDriveApi.createFile({
        drive_id: drive.id,
        parent_id: params.parent_path ? undefined : currentParentId,
        parent_path: params.parent_path,
        file_type: params.file_type,
        name: params.name,
        on_name_conflict: 'rename',
      }),
    onSuccess: () => {
      toast.success(
        createFileType === 'folder' ? '文件夹创建成功' : '文件创建成功'
      )
      // 刷新当前父目录的子节点列表
      queryClient.invalidateQueries({
        queryKey: ['wps-drive-children', drive.id, currentParentId],
      })
      setCreateFileOpen(false)
      setNewFileName('')
      setParentPath('')
      setCurrentParentId('0') // 重置为根目录
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 解析路径字符串为字符串数组
  const parsePath = (pathStr: string): string[] | undefined => {
    if (!pathStr || !pathStr.trim()) {
      return undefined
    }

    // 去除首尾空格
    const trimmed = pathStr.trim()

    // 去除开头的 /
    const withoutLeadingSlash = trimmed.startsWith('/')
      ? trimmed.slice(1)
      : trimmed

    // 使用 / 分割字符串
    const parts = withoutLeadingSlash
      .split('/')
      .filter((part) => part.trim() !== '')

    return parts.length > 0 ? parts : undefined
  }

  // 处理创建文件/文件夹
  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      toast.error('请输入名称')
      return
    }

    // 如果是文件，拼接文件名和扩展名
    const finalName =
      createFileType === 'file'
        ? `${newFileName}.${fileExtension}`
        : newFileName

    // 解析路径
    const pathArray = parsePath(parentPath)

    createFileMutation.mutate({
      name: finalName,
      file_type: createFileType,
      parent_path: pathArray,
    })
  }

  // 打开创建对话框（在根目录下创建）
  const openCreateDialog = (type: 'file' | 'folder') => {
    setCreateFileType(type)
    setCreateFileOpen(true)
    setNewFileName('')
    setFileExtension('docx') // 重置为默认扩展名
    setParentPath('') // 重置路径
    setCurrentParentId('0') // 重置为根目录
  }

  // 在子文件夹中创建文件夹
  const handleCreateFolderInChild = (parentFile: FileInfo) => {
    setCreateFileType('folder')
    setCreateFileOpen(true)
    setNewFileName('')
    setFileExtension('docx')
    setParentPath('')
    setCurrentParentId(parentFile.id) // 设置父目录为当前文件夹
  }

  // 在子文件夹中创建文件
  const handleCreateFileInChild = (parentFile: FileInfo) => {
    setCreateFileType('file')
    setCreateFileOpen(true)
    setNewFileName('')
    setFileExtension('docx')
    setParentPath('')
    setCurrentParentId(parentFile.id) // 设置父目录为当前文件夹
  }

  // 删除文件/文件夹的mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => wpsDriveApi.deleteFile(fileId),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({
        queryKey: ['wps-drive-children', drive.id, '0'],
      })
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  // 打开删除确认对话框
  const openDeleteDialog = (file: FileInfo) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteFileMutation.mutate(fileToDelete.id)
    }
  }

  // 开启文件分享的mutation
  const openLinkMutation = useMutation({
    mutationFn: (file: FileInfo) =>
      wpsDriveApi.openLinkOfFile({
        file_id: file.id,
        drive_id: drive.id,
        scope: 'company', // 默认使用公司范围
      }),
    onSuccess: () => {
      toast.success('分享已开启')
      // 刷新文件列表以获取最新的link_url
      queryClient.invalidateQueries({
        queryKey: ['wps-drive-children', drive.id, '0'],
      })
      // 如果当前选中的文件是被分享的文件，也刷新文件详情
      queryClient.invalidateQueries({
        queryKey: ['wps-drive-file-meta'],
      })
    },
    onError: (error: Error) => {
      toast.error(`开启分享失败: ${error.message}`)
    },
  })

  // 处理开启文件分享
  const handleOpenShare = (file: FileInfo) => {
    openLinkMutation.mutate(file)
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
      {/* 驱动盘节点 - 带操作按钮 */}
      <div
        className={`hover:bg-accent group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${
          isSelected ? 'bg-accent font-medium' : ''
        }`}
      >
        <div
          className='flex flex-1 items-center gap-2'
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

        {/* 操作按钮 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100'
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => openCreateDialog('folder')}>
              <Folder className='mr-2 h-4 w-4' />
              新建文件夹
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreateDialog('file')}>
              <File className='mr-2 h-4 w-4' />
              新建文件
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                    : '请输入文件名称（不含扩展名）'
                }
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
            {createFileType === 'file' && (
              <div className='space-y-2'>
                <Label htmlFor='file-extension'>文件类型 *</Label>
                <Select value={fileExtension} onValueChange={setFileExtension}>
                  <SelectTrigger id='file-extension'>
                    <SelectValue placeholder='选择文件类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>通用格式</SelectLabel>
                      {FILE_TYPES.common.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>公网专用格式</SelectLabel>
                      {FILE_TYPES.publicOnly.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className='space-y-2'>
              <Label htmlFor='parent-path'>父级路径（可选）</Label>
              <Input
                id='parent-path'
                placeholder='例如：/2025/1_1 表示在"2025"文件夹下的"1_1"文件夹中创建'
                value={parentPath}
                onChange={(e) => setParentPath(e.target.value)}
              />
              <p className='text-muted-foreground text-xs'>
                留空表示在根目录下创建。使用 / 分隔路径层级。
              </p>
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

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{fileToDelete?.name}" 吗？
              {fileToDelete?.type === 'folder' && (
                <span className='text-destructive mt-2 block'>
                  警告：删除文件夹将同时删除其中的所有文件和子文件夹！
                </span>
              )}
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteFileMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                onDeleteFile={openDeleteDialog}
                onCreateFolder={handleCreateFolderInChild}
                onCreateFile={handleCreateFileInChild}
                onOpenShare={handleOpenShare}
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
  onDeleteFile,
  onCreateFolder,
  onCreateFile,
  onOpenShare,
  expandedFolders,
  toggleFolder,
}: {
  file: FileInfo
  driveId: string
  onFileClick: (file: FileInfo) => void
  onDeleteFile?: (file: FileInfo) => void
  onCreateFolder?: (parentFile: FileInfo) => void
  onCreateFile?: (parentFile: FileInfo) => void
  onOpenShare?: (file: FileInfo) => void
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
      <div className='hover:bg-accent group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5'>
        <div className='flex flex-1 items-center gap-2' onClick={handleClick}>
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

        {/* 操作按钮 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100'
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {isFolder && onCreateFolder && (
              <DropdownMenuItem onClick={() => onCreateFolder(file)}>
                <Folder className='mr-2 h-4 w-4' />
                新建文件夹
              </DropdownMenuItem>
            )}
            {isFolder && onCreateFile && (
              <DropdownMenuItem onClick={() => onCreateFile(file)}>
                <File className='mr-2 h-4 w-4' />
                新建文件
              </DropdownMenuItem>
            )}
            {!isFolder && onOpenShare && (
              <DropdownMenuItem onClick={() => onOpenShare(file)}>
                <Share className='mr-2 h-4 w-4' />
                开启文件分享
              </DropdownMenuItem>
            )}
            {onDeleteFile && (
              <DropdownMenuItem
                onClick={() => onDeleteFile(file)}
                className='text-destructive focus:text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isFolder && isExpanded && children && (
        <div className='ml-6 space-y-1'>
          {children.items.map((item) => (
            <FileTreeNode
              key={item.id}
              file={item}
              driveId={driveId}
              onFileClick={onFileClick}
              onDeleteFile={onDeleteFile}
              onCreateFolder={onCreateFolder}
              onCreateFile={onCreateFile}
              onOpenShare={onOpenShare}
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
      {/* 分享链接 */}
      <div className='grid grid-cols-3 gap-4'>
        <div className='text-muted-foreground font-medium'>分享链接</div>
        <div className='col-span-2'>
          {file.link_url ? (
            <a
              href={file.link_url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary break-all hover:underline'
            >
              {file.link_url}
            </a>
          ) : (
            <span className='text-muted-foreground'>未开启分享</span>
          )}
        </div>
      </div>
      {/* 文件版本 */}
      {file.version && (
        <DetailItem label='文件版本' value={`v${file.version}`} />
      )}
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
