/**
 * 工作流访问权限枚举
 */
export enum WorkflowPermission {
  /** 查看工作流 */
  VIEW = 'workflow:view',
  /** 创建工作流 */
  CREATE = 'workflow:create',
  /** 编辑工作流 */
  EDIT = 'workflow:edit',
  /** 删除工作流 */
  DELETE = 'workflow:delete',
  /** 执行工作流 */
  EXECUTE = 'workflow:execute',
  /** 管理工作流 */
  MANAGE = 'workflow:manage'
}
