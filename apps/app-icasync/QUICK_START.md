# 课程日历参与者同步 - 快速开始指南

## 功能简介

这个服务能够自动同步课程的教师和学生参与者到 WPS 日历系统。

## 快速开始

### 1. 启动应用

```bash
cd /Users/uroborus/NodeProject/wps/obsync-root
pnpm run dev @wps/app-icasync
```

### 2. 手动触发同步

```bash
# 触发参与者同步
curl -X POST http://localhost:3000/api/icasync/participants/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

**响应示例：**

```json
{
  "success": true,
  "message": "参与者同步完成",
  "data": {
    "totalCourses": 10,
    "successCourses": 10,
    "failedCourses": 0,
    "totalAdded": 45,
    "totalRemoved": 12,
    "details": [
      {
        "kkh": "COURSE001",
        "calendarId": "cal-001",
        "success": true,
        "addedCount": 5,
        "removedCount": 2,
        "failedCount": 0,
        "duration": 1234
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. 查询课程参与者

```bash
# 获取课程 COURSE001 的所有参与者
curl http://localhost:3000/api/icasync/participants/course/COURSE001
```

**响应示例：**

```json
{
  "success": true,
  "message": "获取课程 COURSE001 的参与者详情成功",
  "data": {
    "kkh": "COURSE001",
    "participantCount": 35,
    "participants": [
      {
        "userId": "teacher1",
        "userType": "teacher",
        "userName": "张三"
      },
      {
        "userId": "student1",
        "userType": "student",
        "userName": "李四"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. 检查服务状态

```bash
curl http://localhost:3000/api/icasync/participants/status
```

## API 端点详解

### POST /api/icasync/participants/sync

**功能：** 手动触发参与者同步

**请求体：** 空对象 `{}`

**返回值：**
- `success` - 是否全部成功
- `totalCourses` - 总课程数
- `successCourses` - 成功同步的课程数
- `failedCourses` - 失败的课程数
- `totalAdded` - 新增的参与者总数
- `totalRemoved` - 删除的参与者总数
- `details` - 每个课程的详细结果

### GET /api/icasync/participants/status

**功能：** 获取服务状态

**返回值：**
```json
{
  "success": true,
  "message": "参与者同步服务正常运行",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/icasync/participants/course/:kkh

**功能：** 获取课程的参与者详情

**参数：**
- `kkh` - 开课号（必需）

**返回值：**
- `kkh` - 开课号
- `participantCount` - 参与者总数
- `participants` - 参与者列表

### GET /api/icasync/participants/history

**功能：** 获取同步历史（当前为占位符）

## 工作流程

```
1. 获取有效课程映射
   ↓
2. 对于每个课程：
   a. 获取 WPS 日历当前参与者
   b. 获取数据库中的实际参与者
   c. 对比差异
   d. 批量新增参与者
   e. 批量删除参与者
   ↓
3. 返回同步结果
```

## 数据库查询

### 获取有效课程映射

```sql
SELECT ic.*
FROM icasync.icasync_calendar_mapping ic
INNER JOIN (
  SELECT DISTINCT kkh 
  FROM syncdb.u_jw_kcb_cur 
  WHERE zt IN ('update', 'add')
) uk_filtered 
  ON ic.kkh = uk_filtered.kkh
WHERE ic.is_deleted = false
```

### 获取课程参与者

```sql
-- 教师
SELECT gh AS userId, xm AS userName
FROM syncdb.out_jsxx
WHERE kkh = ? AND zt IN ('update', 'add')

-- 学生
SELECT xh AS userId, xm AS userName
FROM syncdb.out_xsxx
WHERE kkh = ? AND zt IN ('update', 'add')
```

## 性能指标

- **批量处理大小** - 每批最多 100 个参与者
- **并发课程数** - 最多 5 个课程同时同步
- **预期处理时间** - 取决于课程数量和参与者数量

## 常见问题

### Q: 同步失败怎么办？

A: 检查以下几点：
1. 数据库连接是否正常
2. WPS API 是否可用
3. 查看日志获取详细错误信息

### Q: 如何查看同步日志？

A: 应用会输出详细的日志信息，包括：
- 获取的课程映射数量
- 每个课程的参与者数量
- 新增/删除的参与者数量
- 处理时间
- 错误信息

### Q: 可以定时自动同步吗？

A: 当前版本需要手动触发，后续版本会支持定时同步。

### Q: 同步会影响现有数据吗？

A: 不会。同步只会：
- 新增数据库中有但 WPS 日历中没有的参与者
- 删除 WPS 日历中有但数据库中没有的参与者
- 保留已存在的参与者

## 故障排查

### 问题：获取课程映射失败

**原因：** 数据库连接问题

**解决方案：**
1. 检查数据库连接配置
2. 确认 icasync_calendar_mapping 表存在
3. 确认 u_jw_kcb_cur 表存在

### 问题：参与者未同步

**原因：** 参与者数据不存在或状态不正确

**解决方案：**
1. 确认参与者数据存在于 out_jsxx 或 out_xsxx 表
2. 确认参与者状态为 'update' 或 'add'
3. 确认课程映射存在

### 问题：WPS API 调用失败

**原因：** WPS API 凭证或网络问题

**解决方案：**
1. 检查 WPS API 凭证是否有效
2. 检查网络连接
3. 检查 WPS API 是否可用

## 下一步

- 查看 [PARTICIPANTS_SYNC.md](./PARTICIPANTS_SYNC.md) 了解详细的功能文档
- 查看 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) 了解实现细节

