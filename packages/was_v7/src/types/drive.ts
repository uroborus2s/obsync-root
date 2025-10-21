/**
 * 驱动盘相关类型定义
 */

/**
 * 盘归属者类型
 */
export type AlloteeType = 'user' | 'group' | 'app';

/**
 * 盘状态
 */
export type DriveStatus = 'inuse' | 'deleted';

/**
 * 身份类型
 */
export type IdentityType = 'user' | 'sp' | 'unknown';

/**
 * 创建者信息
 */
export interface CreatedBy {
  /** 用户或应用的头像 */
  avatar: string;
  /** 身份所归属的公司 */
  company_id: string;
  /** 身份ID */
  id: string;
  /** 用户或应用的名称 */
  name: string;
  /** 身份类型 */
  type: IdentityType;
}

/**
 * 扩展属性
 */
export interface ExtAttr {
  /** 属性名 */
  name: string;
  /** 属性值 */
  value: string;
}

/**
 * 盘容量信息
 */
export interface DriveQuota {
  /** 回收站中的文件占用的总空间，以字节为单位。只读。 */
  deleted: number;
  /** 剩余的总空间，以字节为单位。只读。 */
  remaining: number;
  /** 允许的总空间储存空间，以字节为单位。只读。 */
  total: number;
  /** 已使用的总空间，以字节为单位。只读。 */
  used: number;
}

/**
 * 驱动盘信息
 */
export interface DriveInfo {
  /** 盘归属身份id */
  allotee_id: string;
  /** 盘归属身份类型 */
  allotee_type: AlloteeType;
  /** 企业id */
  company_id: string;
  /** 创建者 */
  created_by: CreatedBy;
  /** 创建时间 */
  ctime: number;
  /** 盘描述 */
  description: string;
  /** 盘扩展属性 */
  ext_attrs: ExtAttr[];
  /** 驱动盘id */
  id: string;
  /** 修改时间，时间戳，单位为秒 */
  mtime: number;
  /** 驱动盘名称 */
  name: string;
  /** 盘容量 */
  quota: DriveQuota;
  /** 盘来源 */
  source: string;
  /** 盘状态 */
  status: DriveStatus;
}

/**
 * 创建驱动盘请求参数
 */
export interface CreateDriveParams {
  /** 盘归属身份id，当allotee_type为user时，该参数仅可传操作者id；当allotee_type为group时，传入group_id;当allotee_type为app时,仅传入操作应用的spid */
  allotee_id: string;
  /** 盘归属身份类型：user-创建操作者自己的私有盘，group-为用户组下挂载驱动盘，app-创建应用的应用盘 */
  allotee_type: AlloteeType;
  /** 盘描述 */
  description?: string;
  /** 盘扩展属性 */
  ext_attrs?: ExtAttr[];
  /** 驱动盘名称 */
  name: string;
  /** 盘来源,默认是'yundoc'，当allotee_type为user时，这里必须要指定。公网：special（我的云文档）、tmp（我的漫游箱）、secret（私密文件夹）、feature（签名团队）私网：private（我的云文档）、roaming（我的漫游箱） */
  source?: string;
  /** 盘空间配额 */
  total_quota?: number;
}

/**
 * 获取驱动盘参数
 */
export interface GetDriveParams {
  /** 驱动盘id */
  page_size: number;
  allotee_type: string;
}

/**
 * 更新驱动盘参数
 */
export interface UpdateDriveParams {
  /** 驱动盘id */
  drive_id: string;
  /** 盘描述 */
  description?: string;
  /** 盘扩展属性 */
  ext_attrs?: ExtAttr[];
  /** 驱动盘名称 */
  name?: string;
  /** 盘空间配额 */
  total_quota?: number;
}

/**
 * 获取驱动盘列表参数
 */
export interface GetDriveListParams {
  /** 盘归属身份id */
  allotee_id?: string;
  /** 盘归属身份类型 */
  allotee_type?: AlloteeType;
  /** 分页大小，默认20，最大100 */
  page_size?: number;
  /** 分页标记，第一次请求不传 */
  page_token?: string;
}

/**
 * 获取驱动盘列表响应
 */
export interface GetDriveListResponse {
  /** 驱动盘列表 */
  items: DriveInfo[];
  /** 分页标记 */
  page_token?: string;
  /** 是否还有更多数据 */
  has_more: boolean;
  /** 总数 */
  total?: number;
}

/**
 * 文件类型
 */
export type FileType = 'folder' | 'file' | 'shortcut';

/**
 * 分享权限范围
 */
export type scopeType = 'anyone' | 'company' | 'users';

/**
 * 文件名冲突处理方式
 */
export type OnNameConflict = 'fail' | 'rename' | 'overwrite' | 'replace';

/**
 * 哈希类型
 */
export type HashType = 'sha1' | 'md5';

/**
 * 文件哈希信息
 */
export interface FileHash {
  /** 哈希值 */
  sum: string;
  /** 哈希类型 */
  type: HashType;
}

/**
 * 文件权限
 */
export interface FilePermission {
  /** 评论权限 */
  comment: boolean;
  /** 复制权限 */
  copy: boolean;
  /** 复制内容权限 */
  copy_content: boolean;
  /** 删除权限 */
  delete: boolean;
  /** 下载权限 */
  download: boolean;
  /** 历史版本权限 */
  history: boolean;
  /** 移动权限 */
  move: boolean;
  /** 新建空文档权限 */
  new_empty: boolean;
  /** 权限控制权限 */
  perm_ctl: boolean;
  /** 打印权限 */
  print: boolean;
  /** 重命名权限 */
  rename: boolean;
  /** 另存为权限 */
  saveas: boolean;
  /** 私密权限 */
  secret: boolean;
  /** 分享权限 */
  share: boolean;
  /** 更新权限 */
  update: boolean;
  /** 上传权限 */
  upload: boolean;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 创建者 */
  created_by: CreatedBy;
  /** 创建时间 */
  ctime: number;
  /** 文档库驱动盘信息 */
  drive: DriveInfo;
  /** 驱动盘id */
  drive_id: string;
  /** 扩展属性 */
  ext_attrs: ExtAttr[];
  /** 文件哈希 */
  hash: FileHash;
  /** 文件id */
  id: string;
  /** 快捷方式链接的文件id */
  link_id?: string;
  /** 快捷方式链接的文件url */
  link_url?: string;
  /** 修改者 */
  modified_by: CreatedBy;
  /** 修改时间 */
  mtime: number;
  /** 文件名 */
  name: string;
  /** 父目录id */
  parent_id: string;
  /** 文件权限 */
  permission: FilePermission;
  /** 是否共享 */
  shared: boolean;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: FileType;
  /** 文件版本号 */
  version: number;
}

/**
 * 创建文件请求参数
 */
export interface CreateFileParams {
  /** 驱动盘id */
  drive_id: string;
  /** 父目录id */
  parent_id: string;
  /** 文件类型 */
  file_type: FileType;
  /** 文件名 */
  name: string;
  /** 文件id（仅在file_type=shortcut时需要） */
  file_id?: string;
  /** 文件名冲突处理方式 */
  on_name_conflict?: OnNameConflict;
  /** 父目录路径（不存在则创建） */
  parent_path?: string[];
}

export interface optsParams {
  /** 允许申请权限 */
  allow_perm_apply?: boolean;
  /** 访问密码 */
  check_code?: string;
  //过期后取消分享链接
  close_after_expire?: string;
  expire_period?: 0 | 7 | 30;
  expire_time?: number;
}

/**
 * 分享文件链接
 */
export interface OpenLinkParams {
  /** 驱动盘id */
  drive_id: string;
  /** 文件id */
  file_id: string;
  /** 权限范围 */
  scope: scopeType;
  /** 链接选项 */
  opts?: optsParams;
}
