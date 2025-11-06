/**
 * WPS云盘相关类型定义
 */

/**
 * 盘归属者类型
 */
export type AlloteeType = 'user' | 'group' | 'app'

/**
 * 盘状态
 */
export type DriveStatus = 'inuse' | 'deleted'

/**
 * 身份类型
 */
export type IdentityType = 'user' | 'sp' | 'unknown'

/**
 * 创建者信息
 */
export interface CreatedBy {
  /** 用户或应用的头像 */
  avatar: string
  /** 身份所归属的公司 */
  company_id: string
  /** 身份ID */
  id: string
  /** 用户或应用的名称 */
  name: string
  /** 身份类型 */
  type: IdentityType
}

/**
 * 扩展属性
 */
export interface ExtAttr {
  /** 属性名 */
  name: string
  /** 属性值 */
  value: string
}

/**
 * 盘容量信息
 */
export interface DriveQuota {
  /** 回收站中的文件占用的总空间，以字节为单位 */
  deleted: number
  /** 剩余的总空间，以字节为单位 */
  remaining: number
  /** 允许的总空间储存空间，以字节为单位 */
  total: number
  /** 已使用的总空间，以字节为单位 */
  used: number
}

/**
 * 驱动盘信息
 */
export interface DriveInfo {
  /** 盘归属身份id */
  allotee_id: string
  /** 盘归属身份类型 */
  allotee_type: AlloteeType
  /** 企业id */
  company_id: string
  /** 创建者 */
  created_by: CreatedBy
  /** 创建时间 */
  ctime: number
  /** 盘描述 */
  description: string
  /** 盘扩展属性 */
  ext_attrs: ExtAttr[]
  /** 驱动盘id */
  id: string
  /** 修改时间，时间戳，单位为秒 */
  mtime: number
  /** 驱动盘名称 */
  name: string
  /** 盘容量 */
  quota: DriveQuota
  /** 盘来源 */
  source: string
  /** 盘状态 */
  status: DriveStatus
}

/**
 * 文件类型
 */
export type FileType = 'folder' | 'file' | 'shortcut'

/**
 * 文件哈希
 */
export interface FileHash {
  /** 哈希类型 */
  type: string
  /** 哈希值 */
  value: string
}

/**
 * 文件权限
 */
export interface FilePermission {
  /** 是否可以删除 */
  can_delete: boolean
  /** 是否可以下载 */
  can_download: boolean
  /** 是否可以编辑 */
  can_edit: boolean
  /** 是否可以重命名 */
  can_rename: boolean
  /** 是否可以分享 */
  can_share: boolean
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 创建者 */
  created_by: CreatedBy
  /** 创建时间 */
  ctime: number
  /** 文档库驱动盘信息 */
  drive?: DriveInfo
  /** 驱动盘id */
  drive_id: string
  /** 扩展属性 */
  ext_attrs?: ExtAttr[]
  /** 文件哈希 */
  hash?: FileHash
  /** 文件id */
  id: string
  /** 快捷方式链接的文件id */
  link_id?: string
  /** 快捷方式链接的文件url */
  link_url?: string
  /** 修改者 */
  modified_by: CreatedBy
  /** 修改时间 */
  mtime: number
  /** 文件名 */
  name: string
  /** 父目录id */
  parent_id: string
  /** 文件权限 */
  permission?: FilePermission
  /** 是否共享 */
  shared?: boolean
  /** 文件大小（字节） */
  size: number
  /** 文件类型 */
  type: FileType
  /** 文件版本号 */
  version: number
  /** 共享链接URL（仅在上传后返回） */
  shareUrl?: string
  /** 是否成功开启共享（仅在上传后返回） */
  shareEnabled?: boolean
}

/**
 * 获取子文件列表响应
 */
export interface GetChildrenResponse {
  /** 文件列表 */
  items: FileInfo[]
  /** 下一页分页Token */
  next_page_token?: string
}

/**
 * 文件上传参数
 */
export interface UploadFileParams {
  /** 驱动盘ID */
  drive_id: string
  /** 父文件夹ID（必需） */
  parent_id: string
  /** 要上传的文件 */
  file: File
  /** 父文件夹路径（可选，如 '/folder1/folder2'） */
  parent_path?: string
}
