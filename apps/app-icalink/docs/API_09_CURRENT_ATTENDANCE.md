# 9. 本次课学生考勤信息查询接口

## 接口概述

查询当前课程的实时考勤状态，支持学生和教师角色。学生只能查询自己的考勤状态，教师可以查询该课程所有学生的实时考勤状态。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/courses/:course_id/current-attendance`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface CurrentAttendancePathParams {
  course_id: string; // 考勤课程ID
}
```

### 查询参数 (Query Parameters)

```typescript
interface CurrentAttendanceQueryParams {
  status?: 'all' | 'present' | 'absent' | 'not_started' | 'leave_pending';
  class_name?: string;  // 按班级筛选
  search?: string;      // 学生姓名或学号搜索
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| course_id | string | ✅ | - | 考勤课程ID |
| status | string | ❌ | 'all' | 考勤状态筛选 |
| class_name | string | ❌ | - | 按班级筛选（教师可用） |
| search | string | ❌ | - | 学生姓名或学号搜索（教师可用） |

## 响应格式

### 成功响应

```typescript
interface CurrentAttendanceResponse {
  success: boolean;
  message: string;
  data: {
    course_info: {
      id: number;
      course_name: string;
      teacher_name: string;
      class_date: string;           // YYYY-MM-DD 格式
      class_time: string;           // HH:MM 格式
      location: string;
      is_active: boolean;           // 是否正在进行
      checkin_start_time?: string;  // 签到开始时间
      checkin_end_time?: string;    // 签到结束时间
    };
    student_records: Array<{
      record_id: number;
      student_id: string;
      student_name: string;
      class_name: string;
      major_name: string;
      status: 'not_started' | 'present' | 'absent' | 'leave' | 'leave_pending' | 'late';
      checkin_time?: string;        // ISO 8601 格式
      is_late: boolean;
      late_minutes?: number;
      leave_application?: {
        id: number;
        leave_type: string;
        leave_reason: string;
        application_time: string;
        has_attachments: boolean;
      };
    }>;
    summary: {
      total_students: number;
      present_count: number;
      absent_count: number;
      leave_count: number;
      leave_pending_count: number;
      not_started_count: number;
      attendance_rate: number;      // 出勤率百分比
    };
  };
}
```

### 教师查询响应示例

```json
{
  "success": true,
  "message": "获取当前课程考勤信息成功",
  "data": {
    "course_info": {
      "id": 123,
      "course_name": "高等数学",
      "teacher_name": "李老师",
      "class_date": "2024-01-16",
      "class_time": "08:30",
      "location": "教学楼A101",
      "is_active": true,
      "checkin_start_time": "08:15",
      "checkin_end_time": "09:00"
    },
    "student_records": [
      {
        "record_id": 1001,
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "major_name": "软件工程",
        "status": "present",
        "checkin_time": "2024-01-16T08:25:00Z",
        "is_late": false,
        "late_minutes": 0
      },
      {
        "record_id": 1002,
        "student_id": "20210002",
        "student_name": "李四",
        "class_name": "2021级1班",
        "major_name": "软件工程",
        "status": "leave_pending",
        "is_late": false,
        "leave_application": {
          "id": 456,
          "leave_type": "sick",
          "leave_reason": "感冒发烧",
          "application_time": "2024-01-16T07:30:00Z",
          "has_attachments": true
        }
      },
      {
        "record_id": 1003,
        "student_id": "20210003",
        "student_name": "王五",
        "class_name": "2021级2班",
        "major_name": "软件工程",
        "status": "not_started",
        "is_late": false
      }
    ],
    "summary": {
      "total_students": 45,
      "present_count": 35,
      "absent_count": 5,
      "leave_count": 2,
      "leave_pending_count": 1,
      "not_started_count": 2,
      "attendance_rate": 82.2
    }
  }
}
```

### 学生查询响应示例

```json
{
  "success": true,
  "message": "获取个人考勤信息成功",
  "data": {
    "course_info": {
      "id": 123,
      "course_name": "高等数学",
      "teacher_name": "李老师",
      "class_date": "2024-01-16",
      "class_time": "08:30",
      "location": "教学楼A101",
      "is_active": true,
      "checkin_start_time": "08:15",
      "checkin_end_time": "09:00"
    },
    "student_records": [
      {
        "record_id": 1001,
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "major_name": "软件工程",
        "status": "present",
        "checkin_time": "2024-01-16T08:25:00Z",
        "is_late": false,
        "late_minutes": 0
      }
    ],
    "summary": {
      "total_students": 1,
      "present_count": 1,
      "absent_count": 0,
      "leave_count": 0,
      "leave_pending_count": 0,
      "not_started_count": 0,
      "attendance_rate": 100
    }
  }
}
```

## 权限控制

### 学生权限
- 只能查询自己在该课程的考勤状态
- 系统自动过滤为当前学生的记录
- 忽略筛选和搜索参数

### 教师权限
- 可以查询该课程所有学生的实时考勤状态
- 可以使用筛选和搜索功能
- 只能查询自己授课的课程

### 课程权限验证
- 验证用户是否有该课程的访问权限
- 学生需验证是否选修该课程
- 教师需验证是否为该课程的授课教师

## 业务逻辑

### 实时状态计算
1. **not_started**: 尚未开始签到或签到
2. **present**: 已签到且未迟到
3. **late**: 已签到但迟到
4. **absent**: 未签到且超过签到时间
5. **leave_pending**: 有待审批的请假申请
6. **leave**: 请假已批准

### 考勤状态优先级
1. 请假状态优先级最高（leave > leave_pending）
2. 已签到状态次之（present > late）
3. 未签到状态最低（absent > not_started）

### 统计计算规则
- **出勤率**: (出勤人数 + 请假人数) / 总人数 × 100%
- **实时更新**: 状态随学生签到和请假申请实时更新
- **时间窗口**: 考虑签到时间窗口的动态变化

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 无权限查询该课程 | 确认用户权限 |
| `NOT_FOUND` | 404 | 课程不存在 | 确认课程ID正确 |
| `BAD_REQUEST` | 400 | 参数错误 | 检查请求参数 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您无权查询此课程的考勤信息",
  "code": "FORBIDDEN"
}
```

```json
{
  "success": false,
  "message": "课程不存在或已结束",
  "code": "NOT_FOUND"
}
```

## 使用示例

### 学生查询自己的考勤状态

```bash
curl -X GET "/api/icalink/v1/courses/123/current-attendance" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 教师查询所有学生考勤状态

```bash
curl -X GET "/api/icalink/v1/courses/123/current-attendance?status=all" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### 教师按班级筛选

```bash
curl -X GET "/api/icalink/v1/courses/123/current-attendance?class_name=2021级1班&status=absent" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### JavaScript调用示例

```javascript
// 获取当前考勤信息
async function getCurrentAttendance(courseId, filters = {}) {
  try {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const url = `/api/icalink/v1/courses/${courseId}/current-attendance${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('当前考勤信息:', result.data);
      return result.data;
    } else {
      console.error('查询失败:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 格式化考勤状态
function formatAttendanceStatus(status) {
  const statusMap = {
    not_started: '未开始',
    present: '已签到',
    late: '迟到',
    absent: '缺勤',
    leave_pending: '请假待审',
    leave: '已请假'
  };
  return statusMap[status] || '未知';
}

// 获取状态样式类
function getStatusClass(status) {
  const classMap = {
    not_started: 'status-pending',
    present: 'status-success',
    late: 'status-warning',
    absent: 'status-danger',
    leave_pending: 'status-info',
    leave: 'status-secondary'
  };
  return classMap[status] || 'status-default';
}

// 实时刷新考勤状态
class AttendanceMonitor {
  constructor(courseId, refreshInterval = 30000) {
    this.courseId = courseId;
    this.refreshInterval = refreshInterval;
    this.isMonitoring = false;
    this.intervalId = null;
    this.callbacks = [];
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.refresh();
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.refreshInterval);
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async refresh() {
    try {
      const data = await getCurrentAttendance(this.courseId);
      this.notifyCallbacks(data);
    } catch (error) {
      console.error('刷新考勤状态失败:', error);
    }
  }

  onUpdate(callback) {
    this.callbacks.push(callback);
  }

  notifyCallbacks(data) {
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('回调函数执行失败:', error);
      }
    });
  }
}

// 使用示例
const monitor = new AttendanceMonitor(123, 30000); // 30秒刷新一次

monitor.onUpdate((data) => {
  console.log('考勤状态更新:', data);
  updateAttendanceDisplay(data);
});

monitor.start();

// 页面卸载时停止监控
window.addEventListener('beforeunload', () => {
  monitor.stop();
});
```

### React Hook示例

```jsx
import { useState, useEffect, useCallback } from 'react';

// 自定义Hook：实时考勤监控
function useCurrentAttendance(courseId, refreshInterval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await getCurrentAttendance(courseId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
    
    const intervalId = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData };
}

// 考勤状态组件
function AttendanceStatus({ courseId }) {
  const { data, loading, error, refresh } = useCurrentAttendance(courseId);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!data) return <div>暂无数据</div>;

  return (
    <div className="attendance-status">
      <div className="course-info">
        <h2>{data.course_info.course_name}</h2>
        <p>时间: {data.course_info.class_date} {data.course_info.class_time}</p>
        <p>地点: {data.course_info.location}</p>
        <p>状态: {data.course_info.is_active ? '进行中' : '未开始'}</p>
      </div>

      <div className="summary">
        <h3>考勤统计</h3>
        <div className="stats">
          <span>总人数: {data.summary.total_students}</span>
          <span>已签到: {data.summary.present_count}</span>
          <span>缺勤: {data.summary.absent_count}</span>
          <span>请假: {data.summary.leave_count}</span>
          <span>出勤率: {data.summary.attendance_rate}%</span>
        </div>
      </div>

      <div className="student-list">
        <h3>学生考勤状态</h3>
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>班级</th>
              <th>状态</th>
              <th>签到时间</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {data.student_records.map(record => (
              <tr key={record.record_id}>
                <td>{record.student_name}</td>
                <td>{record.class_name}</td>
                <td>
                  <span className={getStatusClass(record.status)}>
                    {formatAttendanceStatus(record.status)}
                  </span>
                </td>
                <td>
                  {record.checkin_time ? 
                    new Date(record.checkin_time).toLocaleTimeString() : 
                    '-'
                  }
                </td>
                <td>
                  {record.is_late && `迟到${record.late_minutes}分钟`}
                  {record.leave_application && 
                    `${record.leave_application.leave_type}: ${record.leave_application.leave_reason}`
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={refresh} className="refresh-btn">
        手动刷新
      </button>
    </div>
  );
}
```

## 注意事项

1. **实时性**: 数据会实时更新，建议定期刷新
2. **权限验证**: 严格验证用户对课程的访问权限
3. **状态优先级**: 理解各种考勤状态的优先级关系
4. **时间窗口**: 注意签到时间窗口的动态变化
5. **网络优化**: 避免过于频繁的刷新请求
6. **移动端适配**: 确保在移动设备上正常显示
7. **错误处理**: 处理网络中断和数据异常
8. **用户体验**: 提供加载状态和错误提示

## 相关接口

- [学生签到接口](./API_02_STUDENT_CHECKIN.md) - 学生签到
- [课程历史考勤数据查询接口](./API_08_ATTENDANCE_HISTORY.md) - 查看历史考勤
- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看请假申请
- [审批请假申请接口](./API_05_LEAVE_APPROVAL.md) - 教师审批请假
