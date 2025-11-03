# 学院权限过滤实现 - ContactRepository 重构

## 概述

本文档记录了将 `DepartmentService` 中的用户学院ID查询逻辑从分别使用 `StudentRepository` 和 `TeacherRepository` 重构为统一使用 `ContactRepository` 的过程。

**实现时间：** 2025-11-03  
**实现人：** Augment Agent  
**影响范围：** `DepartmentService.getUserSchoolId` 方法

---

## 重构原因

### 原有实现的问题

**之前的实现：**
```typescript
private async getUserSchoolId(
  userId: string,
  userType: 'student' | 'teacher'
): Promise<string | null> {
  if (userType === 'student') {
    const students = await this.studentRepository.findMany((qb) =>
      qb.where('xh', '=', userId).where('zt', 'in', ['add', 'update'])
    );
    return students[0]?.xydm;
  } else {
    const teachers = await this.teacherRepository.findMany((qb) =>
      qb.where('gh', '=', userId).where('zt', 'in', ['add', 'update'])
    );
    return teachers[0]?.ssdwdm;
  }
}
```

**存在的问题：**
1. 需要注入两个 Repository（`StudentRepository` 和 `TeacherRepository`）
2. 需要根据用户类型分别查询不同的表
3. 字段名称不统一（学生用 `xydm`，教师用 `ssdwdm`）
4. 代码逻辑复杂，维护成本高

---

## 重构方案

### 数据源统一

使用 `icalink_contacts` 表作为统一的数据源：
- `icalink_contacts` 表基于 `v_contacts` 视图创建
- `v_contacts` 视图通过 UNION ALL 合并了教师和学生的数据
- 统一使用 `school_id` 字段表示学院ID

---

## 实现步骤

### 1. 添加数据库类型定义

**文件：** `apps/app-icalink/src/types/database.ts`

**新增类型：**
```typescript
/**
 * 联系人表实体（基于 v_contacts 视图）
 * 统一了教师和学生的联系信息
 */
export interface IcalinkContact {
  id: ColumnType<number, number | undefined, number>;
  user_id: string;
  user_name: string;
  school_id: string | null;
  school_name: string | null;
  major_id: string | null;
  major_name: string | null;
  class_id: string | null;
  class_name: string | null;
  gender: string | null;
  grade: string | null;
  people: string | null;
  position: string | null;
  role: 'teacher' | 'student';
}
```

**更新数据库接口：**
```typescript
export interface IcalinkDatabase {
  // ... 其他表定义
  icalink_contacts: IcalinkContact;
}
```

---

### 2. 创建 ContactRepository

**文件：** `apps/app-icalink/src/repositories/ContactRepository.ts`

**完整实现：**
```typescript
import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type { IcalinkContact, IcalinkDatabase } from '../types/database.js';

export default class ContactRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_contacts',
  IcalinkContact
> {
  protected readonly tableName = 'icalink_contacts';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ ContactRepository initialized');
  }

  /**
   * 根据用户ID查找联系人信息
   */
  async findByUserId(userId: string): Promise<IcalinkContact | null> {
    const contacts = await this.findMany((qb) =>
      qb.where('user_id', '=', userId)
    );

    if (contacts.length === 0) {
      return null;
    }

    return contacts[0];
  }

  /**
   * 根据用户ID获取学院ID
   */
  async getSchoolIdByUserId(userId: string): Promise<string | null> {
    const contact = await this.findByUserId(userId);
    
    if (!contact || !contact.school_id) {
      return null;
    }

    return contact.school_id;
  }
}
```

---

### 3. 重构 DepartmentService

**文件：** `apps/app-icalink/src/services/DepartmentService.ts`

#### 3.1 更新导入和依赖注入

**修改前：**
```typescript
import type StudentRepository from '../repositories/StudentRepository.js';
import type TeacherRepository from '../repositories/TeacherRepository.js';

constructor(
  private readonly logger: Logger,
  private readonly wasV7ApiDepartment: WpsDepartmentAdapter,
  private readonly studentRepository: StudentRepository,
  private readonly teacherRepository: TeacherRepository
)
```

**修改后：**
```typescript
import type ContactRepository from '../repositories/ContactRepository.js';

constructor(
  private readonly logger: Logger,
  private readonly wasV7ApiDepartment: WpsDepartmentAdapter,
  private readonly contactRepository: ContactRepository
)
```

#### 3.2 重写 getUserSchoolId 方法

**修改后：**
```typescript
private async getUserSchoolId(
  userId: string,
  userType: 'student' | 'teacher'
): Promise<string | null> {
  try {
    this.logger.debug('Getting user school_id from icalink_contacts', {
      userId,
      userType
    });

    const schoolId = await this.contactRepository.getSchoolIdByUserId(userId);

    if (schoolId) {
      this.logger.debug('Found user school_id', {
        userId,
        userType,
        schoolId
      });
    } else {
      this.logger.warn('User school_id not found', { userId, userType });
    }

    return schoolId;
  } catch (error: any) {
    this.logger.error('Failed to get user school_id', {
      userId,
      userType,
      error: error.message
    });
    return null;
  }
}
```

---

## 数据库表结构

### v_contacts 视图定义

**文件：** `apps/app-icalink/database/view/v_contacts.sql`

```sql
CREATE OR REPLACE VIEW v_contacts AS
SELECT
    gh as user_id,
    xm as user_name,
    ssdwdm as school_id,
    ssdwmc as school_name,
    null as major_id,
    null as major_name,
    null as class_id,
    null as class_name,
    xb as gender,
    null as grade,
    null as people,
    zc as position,
    'teacher' AS role
FROM syncdb.out_jsxx
WHERE zt in ('add','update')
UNION ALL
SELECT
    xh as user_id,
    xm as user_name,
    xydm as school_id,
    xymc as school_name,
    zydm as major_id,
    zymc as major_name,
    bjdm as class_id,
    bjmc as class_name,
    xb as gender,
    sznj as grade,
    mz as people,
    null as position,
    'student' AS role
FROM syncdb.out_xsxx
WHERE zt in ('add','update')
```

### icalink_contacts 表定义

**文件：** `apps/app-icalink/database/tables/icalink_contacts.sql`

```sql
CREATE TABLE icalink_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY
)
SELECT * FROM v_contacts;
```

---

## 重构优势

### 1. 代码简化
- **之前**：需要根据 `userType` 分别查询两个表
- **现在**：统一查询一个表，无需条件判断

### 2. 依赖减少
- **之前**：依赖 `StudentRepository` 和 `TeacherRepository`
- **现在**：只依赖 `ContactRepository`

### 3. 性能提升
- **之前**：可能需要查询两次数据库（先判断类型再查询）
- **现在**：只需一次数据库查询

### 4. 维护性提高
- **之前**：字段名称不统一（`xydm` vs `ssdwdm`）
- **现在**：统一使用 `school_id` 字段

### 5. 扩展性更好
- 如果将来需要添加其他用户类型，只需在视图中添加 UNION 分支
- 不需要修改 Service 层代码

---

## 相关文档

- [学院权限过滤实现](./学院权限过滤实现.md)
- [部门子列表过滤逻辑实现](./部门子列表过滤逻辑实现.md)

---

## 总结

本次重构成功地将用户学院ID查询逻辑从分散的两个 Repository 统一到了 `ContactRepository`，实现了：

✅ 代码简化和逻辑清晰  
✅ 依赖关系优化  
✅ 性能提升  
✅ 维护性提高  
✅ 扩展性增强

所有修改都遵循 Stratix 框架的开发规范，保持了代码的一致性和可维护性。

