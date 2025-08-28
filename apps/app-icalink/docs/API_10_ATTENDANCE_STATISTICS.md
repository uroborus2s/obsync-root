# 10. 本课程学生考勤记录统计接口

## 接口概述

提供课程考勤记录的多维度统计分析，支持学生和教师角色。学生只能查询自己的统计数据，教师可以查询该课程的完整统计分析。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/courses/:kkh/attendance-statistics`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface StatisticsPathParams {
  kkh: string; // 开课号
}
```

### 查询参数 (Query Parameters)

```typescript
interface StatisticsQueryParams {
  semester?: string;     // 学年学期
  start_date?: string;   // 统计开始日期 YYYY-MM-DD
  end_date?: string;     // 统计结束日期 YYYY-MM-DD
  group_by?: 'student' | 'class' | 'date' | 'week'; // 统计维度
  student_id?: string;   // 特定学生统计（教师查询）
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| kkh | string | ✅ | - | 开课号 |
| semester | string | ❌ | - | 学年学期筛选 |
| start_date | string | ❌ | - | 统计开始日期 |
| end_date | string | ❌ | - | 统计结束日期 |
| group_by | string | ❌ | 'student' | 统计维度 |
| student_id | string | ❌ | - | 特定学生ID（仅教师可用） |

## 响应格式

### 成功响应

```typescript
interface AttendanceStatisticsResponse {
  success: boolean;
  message: string;
  data: {
    course_info: {
      kkh: string;
      course_name: string;
      teacher_name: string;
      semester: string;
      total_classes: number;
      date_range: {
        start_date: string;
        end_date: string;
      };
    };
    overall_statistics: {
      total_students: number;
      total_records: number;
      present_count: number;
      absent_count: number;
      leave_count: number;
      late_count: number;
      overall_attendance_rate: number;
      average_late_minutes: number;
    };
    detailed_statistics: Array<{
      // 按学生统计
      student_id?: string;
      student_name?: string;
      class_name?: string;
      
      // 按班级统计
      class_code?: string;
      class_name_stat?: string;
      
      // 按日期统计
      date?: string;
      week_number?: number;
      
      // 统计数据
      total_classes: number;
      present_count: number;
      absent_count: number;
      leave_count: number;
      late_count: number;
      attendance_rate: number;
      punctuality_rate: number; // 准时率
      leave_rate: number;        // 请假率
    }>;
    trends: {
      weekly_attendance_rates: Array<{
        week: number;
        attendance_rate: number;
        total_classes: number;
      }>;
      monthly_summary: Array<{
        month: string;
        attendance_rate: number;
        total_classes: number;
      }>;
    };
  };
}
```

### 按学生统计响应示例

```json
{
  "success": true,
  "message": "获取考勤统计数据成功",
  "data": {
    "course_info": {
      "kkh": "MATH001-2024-1",
      "course_name": "高等数学",
      "teacher_name": "李老师",
      "semester": "2024-2025-1",
      "total_classes": 32,
      "date_range": {
        "start_date": "2024-01-01",
        "end_date": "2024-06-30"
      }
    },
    "overall_statistics": {
      "total_students": 45,
      "total_records": 1440,
      "present_count": 1200,
      "absent_count": 120,
      "leave_count": 80,
      "late_count": 40,
      "overall_attendance_rate": 88.9,
      "average_late_minutes": 8.5
    },
    "detailed_statistics": [
      {
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "total_classes": 32,
        "present_count": 28,
        "absent_count": 2,
        "leave_count": 2,
        "late_count": 1,
        "attendance_rate": 93.75,
        "punctuality_rate": 96.55,
        "leave_rate": 6.25
      },
      {
        "student_id": "20210002",
        "student_name": "李四",
        "class_name": "2021级1班",
        "total_classes": 32,
        "present_count": 25,
        "absent_count": 5,
        "leave_count": 2,
        "late_count": 3,
        "attendance_rate": 84.38,
        "punctuality_rate": 89.29,
        "leave_rate": 6.25
      }
    ],
    "trends": {
      "weekly_attendance_rates": [
        {
          "week": 1,
          "attendance_rate": 95.5,
          "total_classes": 2
        },
        {
          "week": 2,
          "attendance_rate": 92.2,
          "total_classes": 2
        }
      ],
      "monthly_summary": [
        {
          "month": "2024-01",
          "attendance_rate": 91.2,
          "total_classes": 8
        },
        {
          "month": "2024-02",
          "attendance_rate": 88.7,
          "total_classes": 8
        }
      ]
    }
  }
}
```

### 按班级统计响应示例

```json
{
  "success": true,
  "message": "获取班级考勤统计成功",
  "data": {
    "course_info": {
      "kkh": "MATH001-2024-1",
      "course_name": "高等数学",
      "teacher_name": "李老师",
      "semester": "2024-2025-1",
      "total_classes": 32
    },
    "overall_statistics": {
      "total_students": 45,
      "total_records": 1440,
      "present_count": 1200,
      "absent_count": 120,
      "leave_count": 80,
      "late_count": 40,
      "overall_attendance_rate": 88.9,
      "average_late_minutes": 8.5
    },
    "detailed_statistics": [
      {
        "class_code": "2021-SE-01",
        "class_name_stat": "2021级软件工程1班",
        "total_classes": 32,
        "present_count": 600,
        "absent_count": 50,
        "leave_count": 30,
        "late_count": 20,
        "attendance_rate": 90.0,
        "punctuality_rate": 96.8,
        "leave_rate": 4.3
      },
      {
        "class_code": "2021-SE-02",
        "class_name_stat": "2021级软件工程2班",
        "total_classes": 32,
        "present_count": 600,
        "absent_count": 70,
        "leave_count": 50,
        "late_count": 20,
        "attendance_rate": 87.8,
        "punctuality_rate": 96.8,
        "leave_rate": 6.8
      }
    ]
  }
}
```

## 权限控制

### 学生权限
- 只能查询自己在该课程的统计数据
- 系统自动过滤为当前学生的记录
- 忽略 `student_id` 和 `group_by` 参数

### 教师权限
- 可以查询该课程的完整统计分析
- 可以使用所有统计维度和筛选条件
- 只能查询自己授课的课程

### 课程权限验证
- 验证用户是否有该课程的访问权限
- 学生需验证是否选修该课程
- 教师需验证是否为该课程的授课教师

## 业务逻辑

### 统计维度说明

#### 1. 按学生统计 (student)
- 每个学生的个人考勤统计
- 包含出勤率、准时率、请假率等指标
- 适用于个人表现分析

#### 2. 按班级统计 (class)
- 每个班级的整体考勤统计
- 便于班级间对比分析
- 适用于班级管理

#### 3. 按日期统计 (date)
- 每个上课日期的考勤统计
- 显示考勤趋势变化
- 适用于时间序列分析

#### 4. 按周统计 (week)
- 每周的考勤统计汇总
- 便于周期性分析
- 适用于趋势观察

### 统计指标计算

#### 基础指标
- **出勤率**: (出勤次数 + 请假次数) / 总课程次数 × 100%
- **准时率**: 出勤次数 / (出勤次数 + 迟到次数) × 100%
- **请假率**: 请假次数 / 总课程次数 × 100%
- **缺勤率**: 缺勤次数 / 总课程次数 × 100%

#### 高级指标
- **平均迟到时间**: 总迟到分钟数 / 迟到次数
- **连续出勤天数**: 最长连续出勤记录
- **改善趋势**: 近期出勤率与历史平均值对比

### 趋势分析
- 按周统计出勤率变化
- 按月汇总考勤情况
- 识别出勤率下降趋势
- 提供预警和建议

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 无权限查询该课程统计 | 确认用户权限 |
| `NOT_FOUND` | 404 | 课程不存在 | 确认开课号正确 |
| `BAD_REQUEST` | 400 | 统计参数错误 | 检查请求参数 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您无权查询此课程的统计数据",
  "code": "FORBIDDEN"
}
```

```json
{
  "success": false,
  "message": "统计维度参数无效",
  "code": "BAD_REQUEST",
  "data": {
    "valid_options": ["student", "class", "date", "week"]
  }
}
```

## 使用示例

### 学生查询个人统计

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-statistics?semester=2024-2025-1" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 教师按学生统计

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-statistics?group_by=student&start_date=2024-01-01&end_date=2024-06-30" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### 教师按班级统计

```bash
curl -X GET "/api/icalink/v1/courses/MATH001-2024-1/attendance-statistics?group_by=class" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### JavaScript调用示例

```javascript
// 获取考勤统计
async function getAttendanceStatistics(kkh, options = {}) {
  try {
    const params = new URLSearchParams();
    
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== '') {
        params.append(key, options[key]);
      }
    });

    const url = `/api/icalink/v1/courses/${kkh}/attendance-statistics${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-User-Id': 'T001',
        'X-User-Type': 'teacher',
        'X-User-Name': encodeURIComponent('李老师')
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('考勤统计:', result.data);
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

// 生成统计报告
function generateStatisticsReport(data) {
  const { course_info, overall_statistics, detailed_statistics } = data;
  
  let report = `课程考勤统计报告\n`;
  report += `课程: ${course_info.course_name} (${course_info.kkh})\n`;
  report += `教师: ${course_info.teacher_name}\n`;
  report += `学期: ${course_info.semester}\n`;
  report += `总课程数: ${course_info.total_classes}\n\n`;
  
  report += `整体统计:\n`;
  report += `总学生数: ${overall_statistics.total_students}\n`;
  report += `总记录数: ${overall_statistics.total_records}\n`;
  report += `出勤次数: ${overall_statistics.present_count}\n`;
  report += `缺勤次数: ${overall_statistics.absent_count}\n`;
  report += `请假次数: ${overall_statistics.leave_count}\n`;
  report += `迟到次数: ${overall_statistics.late_count}\n`;
  report += `整体出勤率: ${overall_statistics.overall_attendance_rate}%\n`;
  report += `平均迟到时间: ${overall_statistics.average_late_minutes}分钟\n\n`;
  
  if (detailed_statistics.length > 0) {
    report += `详细统计:\n`;
    detailed_statistics.forEach(stat => {
      if (stat.student_name) {
        report += `${stat.student_name} (${stat.class_name}): `;
        report += `出勤率${stat.attendance_rate}%, `;
        report += `准时率${stat.punctuality_rate}%, `;
        report += `请假率${stat.leave_rate}%\n`;
      } else if (stat.class_name_stat) {
        report += `${stat.class_name_stat}: `;
        report += `出勤率${stat.attendance_rate}%, `;
        report += `准时率${stat.punctuality_rate}%\n`;
      }
    });
  }
  
  return report;
}

// 导出统计数据为Excel格式
function exportStatisticsToExcel(data) {
  // 这里需要使用如SheetJS等库来生成Excel文件
  console.log('导出统计数据:', data);
  // 实际实现会根据具体需求来编写
}

// 绘制趋势图表
function drawTrendChart(trends) {
  const { weekly_attendance_rates, monthly_summary } = trends;
  
  // 使用Chart.js或其他图表库绘制趋势图
  console.log('周出勤率趋势:', weekly_attendance_rates);
  console.log('月度汇总:', monthly_summary);
  
  // 实际实现会使用具体的图表库
}
```

### Chart.js图表示例

```javascript
// 绘制出勤率趋势图
function createAttendanceTrendChart(canvasId, trends) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: trends.weekly_attendance_rates.map(item => `第${item.week}周`),
      datasets: [{
        label: '出勤率',
        data: trends.weekly_attendance_rates.map(item => item.attendance_rate),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '周出勤率趋势'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

// 绘制学生出勤率对比图
function createStudentComparisonChart(canvasId, statistics) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  const studentStats = statistics.filter(stat => stat.student_name);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: studentStats.map(stat => stat.student_name),
      datasets: [
        {
          label: '出勤率',
          data: studentStats.map(stat => stat.attendance_rate),
          backgroundColor: 'rgba(54, 162, 235, 0.8)'
        },
        {
          label: '准时率',
          data: studentStats.map(stat => stat.punctuality_rate),
          backgroundColor: 'rgba(255, 99, 132, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '学生出勤率对比'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}
```

## 注意事项

1. **数据准确性**: 确保统计计算的准确性和一致性
2. **性能优化**: 大数据量时考虑缓存和分页
3. **权限验证**: 严格验证用户对课程的访问权限
4. **时间范围**: 注意统计时间范围的边界处理
5. **图表展示**: 提供直观的图表展示功能
6. **导出功能**: 支持统计数据的导出
7. **移动端适配**: 确保在移动设备上正常显示
8. **实时更新**: 考虑统计数据的更新频率

## 相关接口

- [课程历史考勤数据查询接口](./API_08_ATTENDANCE_HISTORY.md) - 查看详细历史记录
- [本次课学生考勤信息查询接口](./API_09_CURRENT_ATTENDANCE.md) - 查看当前考勤状态
- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看请假申请统计
