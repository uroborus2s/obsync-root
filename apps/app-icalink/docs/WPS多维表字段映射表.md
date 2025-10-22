# WPS 多维表字段映射表

## 数据库表：icalink_absent_student_relations

### 完整字段映射

| 序号 | 数据库字段名 | 数据库类型 | WPS 字段名 | WPS 字段类型 | 是否必填 | 说明 |
|------|-------------|-----------|-----------|-------------|---------|------|
| 1 | id | number | ID | Number | 否 | 记录唯一标识（自增主键） |
| 2 | course_stats_id | number | 课程统计ID | Number | 是 | 关联课程统计表的ID |
| 3 | course_id | number | 课程ID | Number | 是 | 课程ID（课节ID） |
| 4 | course_code | string | 课程代码 | SingleLineText | 是 | 课程代码 |
| 5 | course_name | string | 课程名称 | SingleLineText | 是 | 课程名称 |
| 6 | student_id | string | 学生ID | SingleLineText | 是 | 学生学号 |
| 7 | student_name | string | 学生姓名 | SingleLineText | 是 | 学生姓名 |
| 8 | school_name | string \| null | 学院名称 | SingleLineText | 否 | 学院名称（可为空） |
| 9 | class_name | string \| null | 班级名称 | SingleLineText | 否 | 班级名称（可为空） |
| 10 | major_name | string \| null | 专业名称 | SingleLineText | 否 | 专业名称（可为空） |
| 11 | absence_type | enum | 缺勤类型 | SingleSelect | 是 | 缺勤类型（缺勤/旷课/请假/请假待审批） |
| 12 | stat_date | Date | 统计日期 | Date | 是 | 统计日期 |
| 13 | semester | string | 学期 | SingleLineText | 是 | 学期（如：2024-2025-1） |
| 14 | teaching_week | number | 教学周 | Number | 是 | 教学周次 |
| 15 | week_day | number | 星期 | Number | 是 | 星期几（1-7） |
| 16 | periods | string \| null | 节次 | SingleLineText | 否 | 节次（如：1-2节） |
| 17 | time_period | string | 时间段 | SingleSelect | 是 | 时间段（am/pm） |
| 18 | leave_reason | string \| null | 请假原因 | MultiLineText | 否 | 请假原因（可为空） |
| 19 | created_at | Date | 创建时间 | Date | 是 | 记录创建时间 |
| 20 | updated_at | Date | 更新时间 | Date | 是 | 记录更新时间 |

## WPS 字段类型说明

### 1. SingleLineText（单行文本）
- **用途**：存储简短的文本信息
- **适用字段**：课程代码、课程名称、学生ID、学生姓名、学院名称、班级名称、专业名称、学期、节次
- **特点**：
  - 不支持换行
  - 适合存储简短的标识符和名称
  - 可以设置最大长度限制

### 2. MultiLineText（多行文本）
- **用途**：存储较长的文本信息
- **适用字段**：请假原因
- **特点**：
  - 支持换行
  - 适合存储描述性文本
  - 可以设置是否唯一

### 3. Number（数字）
- **用途**：存储数值信息
- **适用字段**：ID、课程统计ID、课程ID、教学周、星期
- **特点**：
  - 支持整数和小数
  - 可以设置数字格式
  - 支持数学运算

### 4. Date（日期）
- **用途**：存储日期信息
- **适用字段**：统计日期、创建时间、更新时间
- **特点**：
  - 格式：YYYY-MM-DD
  - 支持日期计算
  - 可以设置默认值

### 5. SingleSelect（单选）
- **用途**：从预定义选项中选择一个值
- **适用字段**：缺勤类型、时间段
- **特点**：
  - 需要预定义选项列表
  - 每个选项可以设置颜色
  - 支持输入时添加新选项

## 缺勤类型选项配置

### absence_type 字段选项

| 数据库值 | 显示值 | 颜色建议 | 说明 |
|---------|-------|---------|------|
| absent | 缺勤 | 橙色 | 未签到但未请假 |
| truant | 旷课 | 红色 | 无故缺勤 |
| leave | 请假 | 绿色 | 已批准的请假 |
| leave_pending | 请假待审批 | 黄色 | 请假申请待审批 |

### WPS 配置示例

```json
{
  "name": "缺勤类型",
  "type": "SingleSelect",
  "data": {
    "allow_add_item_while_inputting": false,
    "items": [
      { "value": "缺勤", "color": 3 },
      { "value": "旷课", "color": 1 },
      { "value": "请假", "color": 5 },
      { "value": "请假待审批", "color": 4 }
    ]
  }
}
```

## 时间段选项配置

### time_period 字段选项

| 数据库值 | 显示值 | 颜色建议 | 说明 |
|---------|-------|---------|------|
| am | 上午 | 蓝色 | 上午时段 |
| pm | 下午 | 紫色 | 下午时段 |

### WPS 配置示例

```json
{
  "name": "时间段",
  "type": "SingleSelect",
  "data": {
    "allow_add_item_while_inputting": false,
    "items": [
      { "value": "上午", "color": 2 },
      { "value": "下午", "color": 6 }
    ]
  }
}
```

## 星期字段说明

### week_day 字段值映射

| 数据库值 | 显示值 |
|---------|-------|
| 1 | 星期一 |
| 2 | 星期二 |
| 3 | 星期三 |
| 4 | 星期四 |
| 5 | 星期五 |
| 6 | 星期六 |
| 7 | 星期日 |

**注意**：在 WPS 中直接存储数字值（1-7），可以在视图中使用公式转换为中文显示。

## 数据转换规则

### 1. 空值处理

```typescript
// 字符串类型的空值转换为空字符串
school_name: record.school_name || ''
class_name: record.class_name || ''
major_name: record.major_name || ''
periods: record.periods || ''
leave_reason: record.leave_reason || ''
```

### 2. 枚举值转换

```typescript
// 缺勤类型转换
const absenceTypeMap = {
  'absent': '缺勤',
  'truant': '旷课',
  'leave': '请假',
  'leave_pending': '请假待审批'
};

// 时间段转换
const timePeriodMap = {
  'am': '上午',
  'pm': '下午'
};
```

### 3. 日期格式化

```typescript
// 日期格式化为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

## 创建 WPS 多维表字段的 API 调用示例

### 完整字段定义

```typescript
import { DBSheetFieldType } from '@stratix/was-v7';

const fields = [
  {
    name: 'ID',
    type: DBSheetFieldType.Number
  },
  {
    name: '课程统计ID',
    type: DBSheetFieldType.Number
  },
  {
    name: '课程ID',
    type: DBSheetFieldType.Number
  },
  {
    name: '课程代码',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程名称',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学生ID',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学生姓名',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学院名称',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '班级名称',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '专业名称',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '缺勤类型',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '缺勤', color: 3 },
        { value: '旷课', color: 1 },
        { value: '请假', color: 5 },
        { value: '请假待审批', color: 4 }
      ]
    }
  },
  {
    name: '统计日期',
    type: DBSheetFieldType.Date
  },
  {
    name: '学期',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教学周',
    type: DBSheetFieldType.Number
  },
  {
    name: '星期',
    type: DBSheetFieldType.Number
  },
  {
    name: '节次',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '时间段',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '上午', color: 2 },
        { value: '下午', color: 6 }
      ]
    }
  },
  {
    name: '请假原因',
    type: DBSheetFieldType.MultiLineText
  },
  {
    name: '创建时间',
    type: DBSheetFieldType.Date
  },
  {
    name: '更新时间',
    type: DBSheetFieldType.Date
  }
];

// 创建字段
await wasV7ApiDbsheet.createFields(fileId, sheetId, { fields });
```

## 字段验证规则

### 必填字段验证

以下字段在写入时必须有值：
- 课程统计ID
- 课程ID
- 课程代码
- 课程名称
- 学生ID
- 学生姓名
- 缺勤类型
- 统计日期
- 学期
- 教学周
- 星期
- 时间段

### 数据类型验证

```typescript
// 数字类型验证
if (typeof record.course_stats_id !== 'number') {
  throw new Error('课程统计ID 必须是数字类型');
}

// 日期类型验证
if (!(record.stat_date instanceof Date)) {
  throw new Error('统计日期 必须是日期类型');
}

// 枚举值验证
const validAbsenceTypes = ['absent', 'truant', 'leave', 'leave_pending'];
if (!validAbsenceTypes.includes(record.absence_type)) {
  throw new Error('缺勤类型 值无效');
}
```

## 性能优化建议

### 1. 批量创建字段

一次性创建所有字段，而不是逐个创建：

```typescript
// ✅ 推荐：批量创建
await wasV7ApiDbsheet.createFields(fileId, sheetId, { fields: allFields });

// ❌ 不推荐：逐个创建
for (const field of allFields) {
  await wasV7ApiDbsheet.createFields(fileId, sheetId, { fields: [field] });
}
```

### 2. 字段索引

为常用查询字段创建索引（如果 WPS 支持）：
- 学生ID
- 课程ID
- 统计日期
- 缺勤类型

### 3. 数据分区

如果数据量很大，考虑按学期或月份分表存储。

## 常见问题

### Q1: 为什么不直接使用数据库字段名？

**A**: 使用中文字段名的优点：
- 更直观，便于非技术人员理解
- 符合中文用户习惯
- 在 WPS 界面中显示更友好

### Q2: 如何处理字段名称变更？

**A**: 使用字段 ID 而不是字段名称进行引用：
```typescript
// 使用 prefer_id: true
await wasV7ApiDbsheet.createRecords(fileId, sheetId, {
  prefer_id: true,
  records: [
    {
      fields_value: {
        'field_id_123': 'value'  // 使用字段 ID
      }
    }
  ]
});
```

### Q3: 如何批量更新字段类型？

**A**: 使用 updateFields API：
```typescript
await wasV7ApiDbsheet.updateFields(fileId, sheetId, {
  fields: [
    {
      id: 'field_id',
      name: '新字段名',
      type: DBSheetFieldType.Number
    }
  ]
});
```

## 相关文档

- [WriteSheetService 使用说明](./WriteSheetService使用说明.md)
- [WriteSheetService 配置指南](./WriteSheetService配置指南.md)
- [WPS DBSheet API 文档](https://open.wps.cn/documents/app-integration-dev/wps365/server/dbsheet/)

