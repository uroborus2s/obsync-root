# 2. 学生签到接口

## 接口概述

学生签到接口，仅限学生使用。支持位置信息记录，自动判断迟到状态，防重复签到。

## 接口规范

- **HTTP方法**: `POST`
- **路径**: `/api/icalink/v1/attendance/:course_id/checkin`
- **权限**: 仅限学生
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface CheckinPathParams {
  course_id: string; // 考勤课程ID
}
```

### 请求体 (Request Body)

```typescript
interface CheckinRequest {
  location?: string;    // 签到位置描述
  latitude?: number;    // 纬度 (-90 到 90)
  longitude?: number;   // 经度 (-180 到 180)
  accuracy?: number;    // 位置精度（米）
  remark?: string;      // 签到备注
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| course_id | string | ✅ | 考勤课程ID |
| location | string | ❌ | 签到位置描述，如"教学楼A101" |
| latitude | number | ❌ | GPS纬度坐标 |
| longitude | number | ❌ | GPS经度坐标 |
| accuracy | number | ❌ | GPS定位精度（米） |
| remark | string | ❌ | 签到备注信息 |

## 响应格式

### 成功响应

```typescript
interface CheckinResponse {
  success: boolean;
  message: string;
  data: {
    record_id: number;
    student_id: string;
    student_name: string;
    course_name: string;
    status: 'present' | 'late';
    checkin_time: string;        // ISO 8601 格式
    is_late: boolean;
    late_minutes?: number;
    location?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "签到成功",
  "data": {
    "record_id": 12345,
    "student_id": "20210001",
    "student_name": "张三",
    "course_name": "高等数学",
    "status": "present",
    "checkin_time": "2024-01-16T08:30:00Z",
    "is_late": false,
    "late_minutes": 0,
    "location": "教学楼A101",
    "coordinates": {
      "latitude": 39.9042,
      "longitude": 116.4074,
      "accuracy": 10
    }
  }
}
```

### 迟到签到响应示例

```json
{
  "success": true,
  "message": "签到成功，但您已迟到5分钟",
  "data": {
    "record_id": 12346,
    "student_id": "20210001",
    "student_name": "张三",
    "course_name": "高等数学",
    "status": "late",
    "checkin_time": "2024-01-16T08:35:00Z",
    "is_late": true,
    "late_minutes": 5,
    "location": "教学楼A101"
  }
}
```

## 权限控制

### 学生权限验证
- 仅限学生角色可以签到
- 验证学生是否选修该课程
- 检查学生的课程访问权限

### 课程权限验证
- 验证课程是否存在且处于活跃状态
- 检查当前时间是否在签到时间窗口内
- 确认学生有该课程的签到权限

## 业务逻辑

### 签到时间窗口验证
1. **签到开始时间**: 课程开始前15分钟
2. **签到结束时间**: 课程开始后30分钟
3. **迟到判定**: 课程开始时间后签到视为迟到
4. **迟到计算**: 自动计算迟到分钟数

### 防重复签到
- 每个学生每门课程只能签到一次
- 已签到的学生再次请求返回冲突错误
- 支持查看已有签到记录

### 位置信息处理
- 位置信息为可选项
- 支持GPS坐标和位置描述
- 自动记录签到时的IP地址和User-Agent

### 状态更新逻辑
1. **准时签到**: 状态设为 `present`
2. **迟到签到**: 状态设为 `late`，记录迟到分钟数
3. **记录创建**: 如果不存在签到记录则创建新记录
4. **记录更新**: 如果已存在记录则更新签到信息

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 非学生用户或无课程权限 | 确认用户角色和课程权限 |
| `BAD_REQUEST` | 400 | 课程ID无效 | 检查课程ID格式 |
| `NOT_FOUND` | 404 | 课程不存在 | 确认课程ID正确 |
| `CONFLICT` | 409 | 已经签到过 | 提示用户已签到 |
| `UNPROCESSABLE_ENTITY` | 422 | 不在签到时间窗口内 | 提示签到时间限制 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您已经签到过了，无法重复签到",
  "code": "CONFLICT",
  "data": {
    "existing_record": {
      "record_id": 12345,
      "checkin_time": "2024-01-16T08:30:00Z",
      "status": "present"
    }
  }
}
```

```json
{
  "success": false,
  "message": "当前不在签到时间窗口内，签到时间：08:00-08:30",
  "code": "UNPROCESSABLE_ENTITY",
  "data": {
    "checkin_window": {
      "start_time": "08:00",
      "end_time": "08:30",
      "current_time": "09:00"
    }
  }
}
```

## 使用示例

### 基本签到

```bash
curl -X POST "/api/icalink/v1/attendance/123/checkin" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -d '{
    "location": "教学楼A101",
    "remark": "准时到达"
  }'
```

### 带位置信息的签到

```bash
curl -X POST "/api/icalink/v1/attendance/123/checkin" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -d '{
    "location": "教学楼A101",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "accuracy": 10,
    "remark": "GPS定位签到"
  }'
```

### JavaScript调用示例

```javascript
// 基本签到
async function checkin(courseId, locationData = {}) {
  try {
    const response = await fetch(`/api/icalink/v1/attendance/${courseId}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      },
      body: JSON.stringify({
        location: locationData.location || '教学楼A101',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        remark: locationData.remark
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('签到成功:', result.data);
      if (result.data.is_late) {
        alert(`签到成功，但您已迟到${result.data.late_minutes}分钟`);
      } else {
        alert('签到成功！');
      }
    } else {
      console.error('签到失败:', result.message);
      alert(`签到失败: ${result.message}`);
    }
  } catch (error) {
    console.error('网络错误:', error);
    alert('网络错误，请重试');
  }
}

// 获取位置并签到
function checkinWithLocation(courseId) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        checkin(courseId, {
          location: '当前位置',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          remark: 'GPS自动定位'
        });
      },
      (error) => {
        console.warn('获取位置失败:', error);
        checkin(courseId, { location: '位置获取失败' });
      }
    );
  } else {
    checkin(courseId, { location: '浏览器不支持定位' });
  }
}
```

## 注意事项

1. **时间窗口**: 签到有严格的时间窗口限制
2. **防重复**: 每门课程只能签到一次
3. **位置精度**: GPS定位精度可能受环境影响
4. **网络状况**: 确保网络连接稳定
5. **浏览器权限**: 使用位置功能需要用户授权
6. **时区处理**: 所有时间使用服务器时区
7. **数据验证**: 坐标范围和精度会进行验证
