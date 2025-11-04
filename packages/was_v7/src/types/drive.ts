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
 * 获取盘元信息参数
 */
export interface GetDriveMetaParams {
  /** 驱动盘ID */
  drive_id: string;
  /** 是否获取盘的扩展属性 */
  with_ext_attrs?: boolean;
}

/**
 * 获取文件元信息参数
 */
export interface GetFileMetaParams {
  /** 文件ID */
  file_id: string;
  /** 是否返回文件操作权限信息 */
  with_permission?: boolean;
  /** 是否返回文件扩展属性 */
  with_ext_attrs?: boolean;
  /** 是否返回文件所属驱动盘信息 */
  with_drive?: boolean;
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
export type HashType = 'sha1' | 'md5' | 'sha256' | 's2s';

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

/**
 * 排序方式
 */
export type OrderType = 'asc' | 'desc';

/**
 * 排序字段
 */
export type OrderByField = 'ctime' | 'mtime' | 'dtime' | 'fname' | 'fsize';

/**
 * ID类型
 */
export type IdType = 'internal' | 'external';

/**
 * 获取子文件列表参数
 */
export interface GetChildrenParams {
  /** 驱动盘ID */
  drive_id: string;
  /** 父目录ID（根目录传 0） */
  parent_id: string;
  /** 是否返回文件的操作权限 */
  with_permission?: boolean;
  /** 是否返回文件扩展属性 */
  with_ext_attrs?: boolean;
  /** 按扩展名过滤，多个扩展名以英文逗号分隔（全小写，无空格） */
  filter_exts?: string;
  /** 按文件类型筛选 */
  filter_type?: FileType;
  /** 排序方式 */
  order?: OrderType;
  /** 排序字段 */
  order_by?: OrderByField;
  /** 分页大小（最大500） */
  page_size: number;
  /** 分页Token */
  page_token?: string;
  /** 请求身份类型 */
  id_type?: IdType;
}

/**
 * 获取子文件列表响应
 */
export interface GetChildrenResponse {
  /** 文件列表 */
  items: FileInfo[];
  /** 下一页分页Token */
  next_page_token?: string;
}

/**
 * 批量获取模式
 */
export type BatchGetMode = 'fastfail' | 'detailed';

/**
 * 批量获取文件信息参数
 */
export interface BatchGetFilesParams {
  /** 文件ID列表 */
  file_ids: string[];
  /** 是否返回文件操作权限 */
  with_permission?: boolean;
  /** 是否返回文件扩展属性 */
  with_ext_attrs?: boolean;
  /** 是否返回文件所属drive信息 */
  with_drive?: boolean;
  /** 批量获取结果返回模式 */
  mode?: BatchGetMode;
}

/**
 * 批量获取失败项
 */
export interface BatchGetFailure {
  /** 错误码 */
  err_code: number;
  /** 错误信息 */
  err_msg: string;
  /** 对象ID */
  object_id: string;
}

/**
 * 批量获取文件信息响应
 */
export interface BatchGetFilesResponse {
  /** 文件信息列表 */
  items: FileInfo[];
  /** 失败列表（当mode=detailed时返回） */
  failures?: BatchGetFailure[];
}

/**
 * 删除文件参数
 */
export interface DeleteFileParams {
  /** 文件ID */
  file_id: string;
}

/**
 * 重命名文件参数
 */
export interface RenameFileParams {
  /** 文件ID */
  file_id: string;
  /** 新的文件名 */
  name: string;
}

/**
 * 重命名文件响应
 */
export interface RenameFileResponse {
  /** 文件ID */
  id: string;
  /** 修改后的名称 */
  name: string;
}

/**
 * 检查文件名参数
 */
export interface CheckFileNameParams {
  /** 驱动盘ID */
  drive_id: string;
  /** 父目录ID */
  parent_id: string;
  /** 需要检查的文件名 */
  name: string;
}

/**
 * 检查文件名响应
 */
export interface CheckFileNameResponse {
  /** 是否已存在同名文件 */
  is_exist: boolean;
}

/**
 * 上传场景
 */
export type UploadScene = 'normal_upload' | 'roaming_upload';

/**
 * 请求文件上传信息参数
 */
export interface RequestUploadParams {
  /** 驱动盘ID */
  drive_id: string;
  /** 父文件夹ID */
  parent_id: string;
  /** 指定更新的文件ID（续传场景） */
  file_id?: string;
  /** 文件哈希信息 */
  hashes?: FileHash[];
  /** 是否使用内网上传 */
  internal?: boolean;
  /** 文件名（需带后缀） */
  name?: string;
  /** 同名文件处理方式 */
  on_name_conflict?: OnNameConflict;
  /** 以路径名形式指定上传位置 */
  parent_path?: string[];
  /** 文件大小（单位：字节） */
  size: number;
  /** 上传网关地址控制参数 */
  storage_base_domain?: string;
  /** 上传场景 */
  upload_scene?: UploadScene;
}

/**
 * 存储请求信息
 */
export interface StoreRequest {
  /** 上传方法 */
  method: string;
  /** 存储上传地址 */
  url: string;
  /** 上传请求头（可选，可能包含Authorization等认证信息） */
  headers?: Record<string, string>;
}

/**
 * 请求文件上传信息响应
 */
export interface RequestUploadResponse {
  /** 存储请求信息 */
  store_request: StoreRequest;
  /** 上传标识 */
  upload_id: string;
}

/**
 * 提交文件上传完成参数
 */
export interface CompleteUploadParams {
  /** 驱动盘ID */
  drive_id: string;
  /** 上传标识（第1步返回） */
  upload_id: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件名 */
  name: string;
  /** 父目录ID */
  parent_id: string;
}

/**
 * 提交文件上传完成响应
 */
export interface CompleteUploadResponse {
  /** 文件ID */
  file_id: string;
  /** 文件名 */
  name: string;
  /** 文件大小 */
  size: number;
  /** 状态 */
  status: string;
}
