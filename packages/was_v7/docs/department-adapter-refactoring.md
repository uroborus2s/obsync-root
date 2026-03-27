# WPS V7 部门适配器重构文档

## 概述

本文档记录了 `packages/was_v7/src/adapters/department.adapter.ts` 的重构和扩展过程，使其符合 WPS 开放平台 v7 API 的正确接口规范。

## 重构目标

### 第一阶段（已完成）

1. ✅ 实现"获取根部门信息"接口
2. ✅ 更新类型定义以符合 WPS v7 API 规范
3. ✅ 删除所有与此接口无关的多余代码
4. ✅ 严格遵循 Stratix 框架的 Adapter 层开发规范

### 第二阶段（已完成）

1. ✅ 实现"查询子部门列表"接口
2. ✅ 支持分页查询
3. ✅ 添加完整的使用示例

### 第三阶段（已完成）

1. ✅ 实现"批量查询指定部门信息"接口
2. ✅ 支持批量查询多个部门
3. ✅ 添加完整的使用示例

### 第四阶段（已完成）

1. ✅ 实现"根据外部部门ID批量获取部门信息"接口
2. ✅ 支持通过外部身份源部门ID查询
3. ✅ 添加完整的使用示例

## 主要变更

### 1. 类型定义更新 (`packages/was_v7/src/types/contact.ts`)

#### 新增 `DeptLeader` 接口

```typescript
/**
 * 部门领导信息
 */
export interface DeptLeader {
  /** 排序值 */
  order: number;
  /** 用户ID */
  user_id: string;
}
```

#### 更新 `DeptInfo` 接口

**旧版本：**

```typescript
export interface DeptInfo {
  ctime: number;
  id: string;
  name: string;
  order: number;
  parent_id: string;
  status: DeptStatus;
}
```

**新版本（符合 WPS v7 API 规范）：**

```typescript
export interface DeptInfo {
  /** 部门绝对路径 */
  abs_path: string;
  /** 创建时间（时间戳） */
  ctime: number;
  /** 外部身份源部门ID */
  ex_dept_id: string;
  /** 部门ID */
  id: string;
  /** 部门领导列表 */
  leaders: DeptLeader[];
  /** 部门名称 */
  name: string;
  /** 排序值 */
  order: number;
  /** 父部门ID */
  parent_id: string;
}
```

### 2. 适配器接口简化 (`WpsDepartmentAdapter`)

**旧版本（包含10个方法）：**

```typescript
export interface WpsDepartmentAdapter {
  createDept(params: CreateDeptParams): Promise<CreateDeptResponse>;
  updateDept(params: UpdateDeptParams): Promise<void>;
  deleteDept(params: DeleteDeptParams): Promise<void>;
  getDeptList(params?: GetDeptListParams): Promise<GetDeptListResponse>;
  getAllDeptList(params?: GetDeptListParams): Promise<DeptInfo[]>;
  getRootDept(): Promise<DeptInfo>;
  getDeptByExId(params: GetDeptByExIdParams): Promise<DeptInfo>;
  batchGetDeptInfo(
    params: BatchGetDeptInfoParams
  ): Promise<BatchGetDeptInfoResponse>;
  getAllSubDepts(parentId: string): Promise<DeptInfo[]>;
  getDeptTree(rootId?: string): Promise<DeptTreeNode>;
}
```

**新版本（包含4个方法）：**

```typescript
export interface WpsDepartmentAdapter {
  /**
   * 获取根部门信息
   *
   * @returns 根部门信息
   * @throws {WpsError} 当API调用失败时抛出错误
   */
  getRootDept(): Promise<DeptInfo>;

  /**
   * 查询子部门列表
   *
   * @param params - 查询参数
   * @returns 子部门列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   */
  getDeptChildren(
    params: GetDeptChildrenParams
  ): Promise<GetDeptChildrenResponse>;

  /**
   * 批量查询指定部门信息
   *
   * @param params - 查询参数
   * @returns 部门信息列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   */
  batchGetDeptInfo(
    params: BatchGetDeptInfoParams
  ): Promise<BatchGetDeptInfoResponse>;

  /**
   * 根据外部部门ID批量获取部门信息
   *
   * @param params - 查询参数
   * @returns 部门信息列表响应
   * @throws {WpsError} 当API调用失败时抛出错误
   */
  getDeptByExIds(params: GetDeptByExIdsParams): Promise<GetDeptByExIdsResponse>;
}
```

### 3. 实现更新

#### API 端点更正

- **旧端点**: `/v7/contacts/departments/root`
- **新端点**: `/v7/depts/root` ✅

#### 完整的错误处理

```typescript
async getRootDept(): Promise<DeptInfo> {
  try {
    logger.debug('开始获取根部门信息');

    // 确保访问令牌有效
    await httpClient.ensureAccessToken();

    // 调用API获取根部门信息
    const response = await httpClient.get<DeptInfo>('/v7/depts/root');

    logger.debug('成功获取根部门信息', {
      deptId: response.data.id,
      deptName: response.data.name
    });

    return response.data;
  } catch (error) {
    logger.error('获取根部门信息失败', error);
    throw error;
  }
}
```

### 4. 测试文件更新

更新了以下测试文件以匹配新的接口：

- `packages/was_v7/src/__tests__/adapters/all-adapters.test.ts`
- `packages/was_v7/src/__tests__/adapters/unified-adapters.test.ts`
- `packages/was_v7/src/__tests__/architecture.test.ts`

### 5. 导出清理

从 `packages/was_v7/src/index.ts` 中移除了 `DeptTreeNode` 的导出：

```typescript
// 旧版本
export type {
  DeptTreeNode,
  WpsDepartmentAdapter
} from './adapters/department.adapter.js';

// 新版本
export type { WpsDepartmentAdapter } from './adapters/department.adapter.js';
```

### 3. 批量查询部门信息类型

新增了批量查询相关的类型定义：

```typescript
/**
 * 批量查询部门信息请求参数
 */
export interface BatchGetDeptInfoParams {
  /** 部门ID列表 */
  dept_ids: string[];
}

/**
 * 批量查询部门信息响应
 */
export interface BatchGetDeptInfoResponse {
  /** 部门信息列表 */
  items: DeptInfo[];
}
```

### 4. 根据外部部门ID获取部门信息类型

新增了根据外部部门ID查询相关的类型定义：

```typescript
/**
 * 根据外部部门ID批量获取部门信息请求参数
 */
export interface GetDeptByExIdsParams {
  /** 外部身份源部门ID列表 */
  ex_dept_ids: string[];
}

/**
 * 根据外部部门ID批量获取部门信息响应
 */
export interface GetDeptByExIdsResponse {
  /** 部门信息列表 */
  items: DeptInfo[];
}
```

## WPS API 接口规范

### 1. 获取根部门信息

- **接口地址**: `https://openapi.wps.cn/v7/depts/root`
- **请求方法**: GET
- **签名方式**: KSO-1（由 HttpClientService 自动处理）
- **权限要求**: `kso.contact.readwrite` 或 `kso.contact.read`

#### 请求头（自动添加）

| 参数名              | 类型   | 说明                          |
| ------------------- | ------ | ----------------------------- |
| Content-Type        | string | 固定值：`application/json`    |
| X-Kso-Date          | string | RFC1123 格式日期              |
| X-Kso-Authorization | string | KSO-1 签名值                  |
| Authorization       | string | 格式：`Bearer {access_token}` |

#### 响应体结构

```typescript
{
  code: number; // 响应代码，非 0 表示失败
  msg: string; // 响应信息
  data: {
    abs_path: string; // 部门绝对路径
    ctime: number; // 创建时间（时间戳）
    ex_dept_id: string; // 外部身份源部门ID
    id: string; // 部门ID
    leaders: Array<{
      // 部门领导列表
      order: number; // 排序值
      user_id: string; // 用户ID
    }>;
    name: string; // 部门名称
    order: number; // 排序值
    parent_id: string; // 父部门ID
  }
}
```

### 2. 查询子部门列表

- **接口地址**: `https://openapi.wps.cn/v7/depts/{dept_id}/children`
- **请求方法**: GET
- **签名方式**: KSO-1（由 HttpClientService 自动处理）
- **权限要求**: `kso.contact.readwrite` 或 `kso.contact.read`

#### 路径参数

| 参数名  | 类型   | 说明           |
| ------- | ------ | -------------- |
| dept_id | string | 要查询的部门ID |

#### 查询参数（可选）

| 参数名     | 类型    | 说明                     |
| ---------- | ------- | ------------------------ |
| page_size  | integer | 分页大小，默认10，最大50 |
| page_token | string  | 分页标记，用于翻页       |
| with_total | boolean | 是否返回总数             |

#### 请求头（自动添加）

| 参数名              | 类型   | 说明                          |
| ------------------- | ------ | ----------------------------- |
| Content-Type        | string | 固定值：`application/json`    |
| X-Kso-Date          | string | RFC1123 格式日期              |
| X-Kso-Authorization | string | KSO-1 签名值                  |
| Authorization       | string | 格式：`Bearer {access_token}` |

#### 响应体结构

```typescript
{
  code: number; // 响应代码，0 表示成功
  msg: string; // 响应信息
  data: {
    items: Array<{
      abs_path: string; // 部门绝对路径
      ctime: number; // 创建时间（时间戳）
      ex_dept_id: string; // 外部身份源部门ID
      id: string; // 部门ID
      leaders: Array<{
        order: number; // 排序值
        user_id: string; // 用户ID
      }>;
      name: string; // 部门名称
      order: number; // 排序值
      parent_id: string; // 父部门ID
    }>;
    next_page_token?: string; // 下一页标记
  }
}
```

### 3. 批量查询指定部门信息

- **接口地址**: `https://openapi.wps.cn/v7/depts/batch_read`
- **请求方法**: POST
- **签名方式**: KSO-1（由 HttpClientService 自动处理）
- **权限要求**: `kso.contact.readwrite` 或 `kso.contact.read`

#### 请求头（自动添加）

| 参数名              | 类型   | 说明                          |
| ------------------- | ------ | ----------------------------- |
| Content-Type        | string | 固定值：`application/json`    |
| X-Kso-Date          | string | RFC1123 格式日期              |
| X-Kso-Authorization | string | KSO-1 签名值                  |
| Authorization       | string | 格式：`Bearer {access_token}` |

#### 请求体

```json
{
  "dept_ids": ["string"]
}
```

| 参数名   | 类型  | 说明               |
| -------- | ----- | ------------------ |
| dept_ids | array | 部门ID列表（必填） |

#### 响应体结构

```typescript
{
  code: number; // 响应代码，0 表示成功
  msg: string; // 响应信息
  data: {
    items: Array<{
      abs_path: string; // 部门绝对路径
      ctime: number; // 创建时间（时间戳）
      ex_dept_id: string; // 外部身份源部门ID
      id: string; // 部门ID
      leaders: Array<{
        order: number; // 排序值
        user_id: string; // 用户ID
      }>;
      name: string; // 部门名称
      order: number; // 排序值
      parent_id: string; // 父部门ID
    }>;
  }
}
```

### 4. 根据外部部门ID批量获取部门信息

- **接口地址**: `https://openapi.wps.cn/v7/depts/by_ex_dept_ids`
- **请求方法**: POST
- **签名方式**: KSO-1（由 HttpClientService 自动处理）
- **权限要求**: `kso.contact.readwrite` 或 `kso.contact.read`

#### 请求头（自动添加）

| 参数名              | 类型   | 说明                          |
| ------------------- | ------ | ----------------------------- |
| Content-Type        | string | 固定值：`application/json`    |
| X-Kso-Date          | string | RFC1123 格式日期              |
| X-Kso-Authorization | string | KSO-1 签名值                  |
| Authorization       | string | 格式：`Bearer {access_token}` |

#### 请求体

```json
{
  "ex_dept_ids": ["string"]
}
```

| 参数名      | 类型  | 说明                         |
| ----------- | ----- | ---------------------------- |
| ex_dept_ids | array | 外部身份源部门ID列表（必填） |

#### 响应体结构

```typescript
{
  code: number; // 响应代码，0 表示成功
  msg: string; // 响应信息
  data: {
    items: Array<{
      abs_path: string; // 部门绝对路径
      ctime: number; // 创建时间（时间戳）
      ex_dept_id: string; // 外部身份源部门ID
      id: string; // 部门ID
      leaders: Array<{
        order: number; // 排序值
        user_id: string; // 用户ID
      }>;
      name: string; // 部门名称
      order: number; // 排序值
      parent_id: string; // 父部门ID
    }>;
  }
}
```

## Stratix 框架规范遵循

### Adapter 层规范

1. ✅ **SINGLETON 生命周期**: 适配器在应用级别是单例
2. ✅ **容器依赖解析**: 通过 `pluginContainer.resolve()` 获取依赖
3. ✅ **统一错误处理**: 使用 try-catch 包装，记录日志后重新抛出
4. ✅ **完整 JSDoc 注释**: 所有公共接口都有详细的文档注释
5. ✅ **函数式编程**: 使用纯函数式的工厂模式

### 依赖注入

```typescript
const httpClient =
  pluginContainer.resolve<HttpClientService>('httpClientService');
const logger = pluginContainer.resolve<Logger>('logger');
```

### 导出配置

```typescript
export default {
  adapterName: 'department',
  factory: createWpsDepartmentAdapter
};
```

## 使用示例

### 1. 获取根部门信息

```typescript
import type { AwilixContainer } from '@stratix/core';
import type { WpsDepartmentAdapter } from '@stratix/was-v7';

// 从容器中解析适配器
const departmentAdapter = container.resolve<WpsDepartmentAdapter>(
  '@stratix/was-v7.department'
);

// 获取根部门信息
const rootDept = await departmentAdapter.getRootDept();

console.log('根部门名称:', rootDept.name);
console.log('根部门ID:', rootDept.id);
console.log('部门绝对路径:', rootDept.abs_path);
console.log('部门领导数量:', rootDept.leaders.length);
```

### 2. 查询子部门列表（分页）

```typescript
// 查询指定部门的子部门（第一页）
const firstPage = await departmentAdapter.getDeptChildren({
  dept_id: 'parent-dept-id',
  page_size: 20
});

console.log('子部门数量:', firstPage.items.length);
console.log('是否有下一页:', !!firstPage.next_page_token);

// 如果有下一页，继续查询
if (firstPage.next_page_token) {
  const secondPage = await departmentAdapter.getDeptChildren({
    dept_id: 'parent-dept-id',
    page_size: 20,
    page_token: firstPage.next_page_token
  });

  console.log('第二页子部门数量:', secondPage.items.length);
}
```

### 3. 递归获取所有子部门

```typescript
async function getAllChildren(deptId: string): Promise<DeptInfo[]> {
  const allDepts: DeptInfo[] = [];
  let pageToken: string | undefined;

  do {
    const response = await departmentAdapter.getDeptChildren({
      dept_id: deptId,
      page_size: 50,
      page_token: pageToken
    });

    allDepts.push(...response.items);
    pageToken = response.next_page_token;
  } while (pageToken);

  return allDepts;
}

// 使用
const allChildren = await getAllChildren('parent-dept-id');
console.log('总共有', allChildren.length, '个子部门');
```

### 4. 批量查询部门信息

```typescript
// 批量查询多个部门的信息
const result = await departmentAdapter.batchGetDeptInfo({
  dept_ids: ['dept-id-1', 'dept-id-2', 'dept-id-3']
});

console.log('查询到的部门数量:', result.items.length);

// 遍历部门信息
result.items.forEach((dept) => {
  console.log(`部门: ${dept.name}, ID: ${dept.id}`);
  console.log(`  路径: ${dept.abs_path}`);
  console.log(`  父部门ID: ${dept.parent_id}`);
  console.log(`  领导数量: ${dept.leaders.length}`);
});
```

### 5. 根据外部部门ID批量获取部门信息

```typescript
// 根据外部身份源部门ID批量查询部门信息
const result = await departmentAdapter.getDeptByExIds({
  ex_dept_ids: ['ex-dept-id-1', 'ex-dept-id-2', 'ex-dept-id-3']
});

console.log('查询到的部门数量:', result.items.length);

// 遍历部门信息
result.items.forEach((dept) => {
  console.log(`部门: ${dept.name}, 外部ID: ${dept.ex_dept_id}`);
  console.log(`  内部ID: ${dept.id}`);
  console.log(`  路径: ${dept.abs_path}`);
  console.log(`  父部门ID: ${dept.parent_id}`);
});
```

### 完整示例

参见 `packages/was_v7/examples/department-root-example.ts`，包含：

- `getRootDepartmentExample()` - 获取根部门信息示例
- `getDeptChildrenExample()` - 查询子部门列表示例
- `getAllDeptChildrenExample()` - 递归获取所有子部门示例
- `batchGetDeptInfoExample()` - 批量查询部门信息示例
- `getDeptByExIdsExample()` - 根据外部部门ID批量获取部门信息示例

## 文件清单

### 修改的文件

1. `packages/was_v7/src/adapters/department.adapter.ts` - 主适配器文件
2. `packages/was_v7/src/types/contact.ts` - 类型定义
3. `packages/was_v7/src/types/index.ts` - 移除重复的 DeptInfo 定义
4. `packages/was_v7/src/index.ts` - 更新导出
5. `packages/was_v7/src/__tests__/adapters/all-adapters.test.ts` - 测试更新
6. `packages/was_v7/src/__tests__/adapters/unified-adapters.test.ts` - 测试更新
7. `packages/was_v7/src/__tests__/architecture.test.ts` - 测试更新

### 新增的文件

1. `packages/was_v7/examples/department-root-example.ts` - 使用示例
2. `packages/was_v7/docs/department-adapter-refactoring.md` - 本文档

## 后续工作建议

1. **添加集成测试**: 创建实际调用 WPS API 的集成测试
2. **添加更多部门接口**: 根据需要逐步添加其他部门管理接口
3. **性能优化**: 考虑添加缓存机制
4. **错误处理增强**: 针对特定的 WPS API 错误码提供更友好的错误信息

## 验证清单

### 第一阶段 - 获取根部门信息

- [x] 类型定义符合 WPS v7 API 规范
- [x] API 端点正确（/v7/depts/root）
- [x] 签名方式正确（KSO-1）
- [x] 请求头自动添加
- [x] 错误处理完整
- [x] 日志记录完整
- [x] JSDoc 注释完整
- [x] 遵循 Stratix 框架规范
- [x] 测试文件已更新
- [x] 导出已清理
- [x] 示例代码已提供

### 第二阶段 - 查询子部门列表

- [x] 类型定义符合 WPS v7 API 规范（GetDeptChildrenParams, GetDeptChildrenResponse）
- [x] API 端点正确（/v7/depts/{dept_id}/children）
- [x] 路径参数处理正确（dept_id）
- [x] 查询参数处理正确（page_size, page_token, with_total）
- [x] 分页支持完整
- [x] 错误处理完整
- [x] 日志记录完整
- [x] JSDoc 注释完整
- [x] 测试文件已更新
- [x] 示例代码已提供（包含分页和递归示例）

### 第三阶段 - 批量查询指定部门信息

- [x] 类型定义符合 WPS v7 API 规范（BatchGetDeptInfoParams, BatchGetDeptInfoResponse）
- [x] API 端点正确（/v7/depts/batch_read）
- [x] 请求方法正确（POST）
- [x] 请求体处理正确（dept_ids）
- [x] 错误处理完整
- [x] 日志记录完整
- [x] JSDoc 注释完整
- [x] 测试文件已更新
- [x] 示例代码已提供

### 第四阶段 - 根据外部部门ID批量获取部门信息

- [x] 类型定义符合 WPS v7 API 规范（GetDeptByExIdsParams, GetDeptByExIdsResponse）
- [x] API 端点正确（/v7/depts/by_ex_dept_ids）
- [x] 请求方法正确（POST）
- [x] 请求体处理正确（ex_dept_ids）
- [x] 错误处理完整
- [x] 日志记录完整
- [x] JSDoc 注释完整
- [x] 测试文件已更新
- [x] 示例代码已提供

## 总结

本次重构和扩展成功地实现了四个核心部门管理接口：

1. **获取根部门信息** - 提供获取企业根部门的基础功能
2. **查询子部门列表** - 支持分页查询指定部门的子部门列表
3. **批量查询指定部门信息** - 支持一次性查询多个部门的详细信息
4. **根据外部部门ID批量获取部门信息** - 支持通过外部身份源部门ID查询部门信息

所有代码都严格遵循以下规范：

- ✅ WPS 开放平台 v7 API 规范
- ✅ Stratix 框架 Adapter 层开发规范
- ✅ SINGLETON 生命周期管理
- ✅ 依赖注入模式
- ✅ 完整的错误处理和日志记录
- ✅ 详细的 JSDoc 文档注释
- ✅ 丰富的使用示例

适配器现在可以满足基本的部门查询需求，并为后续扩展其他部门管理功能（如创建、更新、删除部门等）奠定了良好的基础。
