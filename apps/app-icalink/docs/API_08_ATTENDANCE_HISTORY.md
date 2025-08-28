# 8. 课程历史考勤数据查询接口

## 接口概述

通过开课号(kkh)查询课程的历史考勤数据，支持学生和教师角色。学生只能查询自己的考勤历史，教师可以查询该课程所有学生的考勤历史。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/courses/:kkh/attendance-history`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface HistoryPathParams {
  kkh: string; // 开课号
}
```

### 查询参数 (Query Parameters)

```typescript
interface HistoryQueryParams {
  semester?: string;    // 学年学期，如"2024-2025-1"
  start_date?: string;  // 开始日期 YYYY-MM-DD
  end_date?: string;    // 结束日期 YYYY-MM-DD
  status?: 'all' | 'present' | 'absent' | 'leave' | 'late';
  student_id?: string;  // 特定学生ID（教师查询）
  page?: number;        // 页码，默认1
  page_size?: number;   // 每页大小，默认50
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| kkh | string | ✅ | - | 开课号 |
| semester | string | ❌ | - | 学年学期筛选 |
| start_date | string | ❌ | - | 开始日期，格式：YYYY-MM-DD |
| end_date | string | ❌ | - | 结束日期，格式：YYYY-MM-DD |
| status | string | ❌ | 'all' | 考勤状态筛选 |
| student_id | string | ❌ | - | 特定学生ID（仅教师可用） |
| page | number | ❌ | 1 | 页码 |
| page_size | number | ❌ | 50 | 每页大小，最大100 |

## 响应格式

### 成功响应

```typescript
interface AttendanceHistoryResponse {
  success: boolean;
  message: string;
  data: {
    course_info: {
      kkh: string;
      course_name: string;
      teacher_name: string;
      semester: string;
      total_classes: number;
    };
    attendance_records: Array<{
      record_id: number;
      course_id: number;
      course_name: string;
      class_date: string;           // YYYY-MM-DD 格式
      student_id: string;
      student_name: string;
      class_name: string;
      status: 'present' | 'absent' | 'leave' | 'late';
      checkin_time?: string;        // ISO 8601 格式
      is_late: boolean;
      late_minutes?: number;
      leave_type?: string;
      leave_reason?: string;
      approval_status?: string;
      approval_time?: string;
    }>;
    statistics: {
      total_records: number;
      present_count: number;
      absent_count: number;
      leave_count: number;
      late_count: number;
      attendance_rate: number;      // 出勤率百分比
    };
    pagination: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    };
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "查询课程历史考勤数据成功",
  "data": {
    "course_info": {
      "kkh": "MATH001-2024-1",
      "course_name": "高等数学",
      "teacher_name": "李老师",
      "semester": "2024-2025-1",
      "total_classes": 32
    },
    "attendance_records": [
      {
        "record_id": 1001,
        "course_id": 123,
        "course_name": "高等数学",
        "class_date": "2024-01-16",
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "status": "present",
        "checkin_time": "2024-01-16T08:25:00Z",
        "is_late": false,
        "late_minutes": 0
      },
      {
        "record_id": 1002,
        "course_id": 123,
        "course_name": "高等数学",
        "class_date": "2024-01-18",
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "status": "leave",
        "leave_type": "sick",
        "leave_reason": "感冒发烧",
        "approval_status": "approved",
        "approval_time": "2024-01-18T10:30:00Z"
      }
    ],
    "statistics": {
      "total_records": 32,
      "present_count": 28,
      "absent_count": 2,
      "leave_count": 2,
      "late_count": 3,
      "attendance_rate": 87.5
    },
    "pagination": {
      "total": 32,
      "page": 1,
      "page_size": 50,
      "total_pages": 1
    }
  }
}
```

## 权限控制

### 学生权限
- 只能查询自己在该课程的考勤历史
- 系统自动过滤为当前学生的记录
- 忽略 `student_id` 参数

### 教师权限
- 可以查询该课程所有学生的考勤历史
- 可以使用 `student_id` 筛选特定学生
- 只能查询自己授课的课程

### 课程权限验证
- 验证用户是否有该课程的访问权限
- 学生需验证是否选修该课程
- 教师需验证是否为该课程的授课教师

## 业务逻辑

### 数据查询逻辑
1. **课程验证**: 验证开课号是否存在
2. **权限检查**: 根据用户角色验证访问权限
3. **数据筛选**: 应用各种筛选条件
4. **统计计算**: 计算出勤率等统计数据
5. **分页处理**: 处理分页查询

### 统计计算规则
- **出勤率**: (出勤次数 + 请假次数) / 总课程次数 × 100%
- **准时率**: 出勤次数 / (出勤次数 + 迟到次数) × 100%
- **请假率**: 请假次数 / 总课程次数 × 100%

### 排序规则
- 默认按课程日期倒序排列
- 同一日期按学生学号排序
- 支持自定义排序字段

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 无权限查询该课程 | 确认用户权限 |
| `NOT_FOUND` | 404 | 课程不存在 | 确认开课号正确 |
| `BAD_REQUEST` | 400 | 参数错误 | 检查请求参数格式 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您无权查询此课程的考勤数据",
  "code": "FORBIDDEN"
}
```

```json
{
  "success": false,
  "message": "开课号不存在或课程已结束",
  "code": "NOT_FOUND"
}
```

## 使用示例

### 学生查询自己的考勤历史

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-history?semester=2024-2025-1&page=1&page_size=20" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 教师查询课程所有学生考勤

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-history?start_date=2024-01-01&end_date=2024-01-31&status=all" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### 教师查询特定学生考勤

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-history?student_id=20210001&status=absent" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### JavaScript调用示例

```javascript
// 查询考勤历史
async function getAttendanceHistory(kkh, filters = {}) {
  try {
    const params = new URLSearchParams();
    
    // 添加筛选参数
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const url = `/api/icalink/v1/courses/${kkh}/attendance-history${params.toString() ? '?' + params.toString() : ''}`;

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
      console.log('考勤历史:', result.data);
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
    present: '出勤',
    absent: '缺勤',
    leave: '请假',
    late: '迟到'
  };
  return statusMap[status] || '未知';
}

// 格式化请假类型
function formatLeaveType(type) {
  const typeMap = {
    sick: '病假',
    personal: '事假',
    emergency: '紧急事假',
    other: '其他'
  };
  return typeMap[type] || '';
}

// 生成考勤报表
function generateAttendanceReport(data) {
  const { course_info, attendance_records, statistics } = data;
  
  let report = `课程考勤报表\n`;
  report += `课程名称: ${course_info.course_name}\n`;
  report += `授课教师: ${course_info.teacher_name}\n`;
  report += `学年学期: ${course_info.semester}\n`;
  report += `总课程数: ${course_info.total_classes}\n\n`;
  
  report += `统计信息:\n`;
  report += `出勤率: ${statistics.attendance_rate}%\n`;
  report += `出勤次数: ${statistics.present_count}\n`;
  report += `缺勤次数: ${statistics.absent_count}\n`;
  report += `请假次数: ${statistics.leave_count}\n`;
  report += `迟到次数: ${statistics.late_count}\n\n`;
  
  report += `详细记录:\n`;
  attendance_records.forEach(record => {
    report += `${record.class_date} - ${record.student_name} - ${formatAttendanceStatus(record.status)}`;
    if (record.is_late) {
      report += ` (迟到${record.late_minutes}分钟)`;
    }
    if (record.leave_type) {
      report += ` (${formatLeaveType(record.leave_type)}: ${record.leave_reason})`;
    }
    report += `\n`;
  });
  
  return report;
}

// 导出考勤数据为CSV
function exportToCSV(data) {
  const { attendance_records } = data;
  
  const headers = ['日期', '学生姓名', '班级', '状态', '签到时间', '迟到分钟', '请假类型', '请假原因'];
  const csvContent = [
    headers.join(','),
    ...attendance_records.map(record => [
      record.class_date,
      record.student_name,
      record.class_name,
      formatAttendanceStatus(record.status),
      record.checkin_time || '',
      record.late_minutes || '',
      formatLeaveType(record.leave_type) || '',
      record.leave_reason || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_history_${data.course_info.kkh}.csv`;
  link.click();
}
```

### Vue.js组件示例

```vue
<template>
  <div class="attendance-history">
    <div class="filters">
      <h3>筛选条件</h3>
      <div class="filter-row">
        <label>学年学期:</label>
        <select v-model="filters.semester">
          <option value="">全部</option>
          <option value="2024-2025-1">2024-2025-1</option>
          <option value="2023-2024-2">2023-2024-2</option>
        </select>
        
        <label>状态:</label>
        <select v-model="filters.status">
          <option value="all">全部</option>
          <option value="present">出勤</option>
          <option value="absent">缺勤</option>
          <option value="leave">请假</option>
          <option value="late">迟到</option>
        </select>
        
        <label>开始日期:</label>
        <input type="date" v-model="filters.start_date" />
        
        <label>结束日期:</label>
        <input type="date" v-model="filters.end_date" />
        
        <button @click="loadData" class="btn btn-primary">查询</button>
        <button @click="exportData" class="btn btn-secondary">导出</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="results">
      <div class="course-info">
        <h3>{{ data.course_info.course_name }}</h3>
        <p>授课教师: {{ data.course_info.teacher_name }}</p>
        <p>学年学期: {{ data.course_info.semester }}</p>
        <p>总课程数: {{ data.course_info.total_classes }}</p>
      </div>
      
      <div class="statistics">
        <h4>统计信息</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="label">出勤率:</span>
            <span class="value">{{ data.statistics.attendance_rate }}%</span>
          </div>
          <div class="stat-item">
            <span class="label">出勤:</span>
            <span class="value">{{ data.statistics.present_count }}</span>
          </div>
          <div class="stat-item">
            <span class="label">缺勤:</span>
            <span class="value">{{ data.statistics.absent_count }}</span>
          </div>
          <div class="stat-item">
            <span class="label">请假:</span>
            <span class="value">{{ data.statistics.leave_count }}</span>
          </div>
          <div class="stat-item">
            <span class="label">迟到:</span>
            <span class="value">{{ data.statistics.late_count }}</span>
          </div>
        </div>
      </div>
      
      <div class="records-table">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>学生姓名</th>
              <th>班级</th>
              <th>状态</th>
              <th>签到时间</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in data.attendance_records" :key="record.record_id">
              <td>{{ record.class_date }}</td>
              <td>{{ record.student_name }}</td>
              <td>{{ record.class_name }}</td>
              <td>
                <span :class="getStatusClass(record.status)">
                  {{ formatStatus(record.status) }}
                </span>
              </td>
              <td>{{ formatTime(record.checkin_time) }}</td>
              <td>{{ getRemarkText(record) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="pagination">
        <button 
          @click="changePage(data.pagination.page - 1)"
          :disabled="data.pagination.page <= 1"
        >
          上一页
        </button>
        <span>
          第 {{ data.pagination.page }} 页，共 {{ data.pagination.total_pages }} 页
        </span>
        <button 
          @click="changePage(data.pagination.page + 1)"
          :disabled="data.pagination.page >= data.pagination.total_pages"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    kkh: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      data: null,
      loading: false,
      error: null,
      filters: {
        semester: '',
        status: 'all',
        start_date: '',
        end_date: '',
        page: 1,
        page_size: 20
      }
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      this.error = null;
      
      try {
        this.data = await getAttendanceHistory(this.kkh, this.filters);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    changePage(page) {
      if (page >= 1 && page <= this.data.pagination.total_pages) {
        this.filters.page = page;
        this.loadData();
      }
    },
    
    exportData() {
      if (this.data) {
        exportToCSV(this.data);
      }
    },
    
    formatStatus(status) {
      return formatAttendanceStatus(status);
    },
    
    getStatusClass(status) {
      return `status-${status}`;
    },
    
    formatTime(timeString) {
      if (!timeString) return '';
      return new Date(timeString).toLocaleTimeString('zh-CN');
    },
    
    getRemarkText(record) {
      if (record.is_late) {
        return `迟到${record.late_minutes}分钟`;
      }
      if (record.leave_type) {
        return `${formatLeaveType(record.leave_type)}: ${record.leave_reason}`;
      }
      return '';
    }
  }
};
</script>
```

## 注意事项

1. **权限验证**: 严格验证用户对课程的访问权限
2. **数据量控制**: 大量数据时使用分页查询
3. **统计准确性**: 确保统计数据计算正确
4. **时间范围**: 注意时间筛选的边界条件
5. **缓存策略**: 历史数据可以适当缓存
6. **导出功能**: 提供数据导出功能
7. **移动端适配**: 确保在移动设备上正常显示
8. **性能优化**: 大数据量时考虑分页和索引优化

## 相关接口

- [本次课学生考勤信息查询接口](./API_09_CURRENT_ATTENDANCE.md) - 查看当前课程考勤
- [本课程学生考勤记录统计接口](./API_10_ATTENDANCE_STATISTICS.md) - 查看统计分析
- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看请假申请
