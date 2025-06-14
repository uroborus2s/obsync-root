# 签到接口使用说明

## 接口信息
- **接口路径**: `/attendance/:attendance_record_id/checkin`
- **请求方法**: POST
- **功能**: 学生签到，如果已经签到则无法再次签到
- **路径参数**: `attendance_record_id` - 考勤记录ID（从URL路径中获取）

## API客户端修复
已修复 `attendance-api.ts` 中的 `studentCheckIn` 方法，现在从路径参数中获取考勤记录ID：

```typescript
async studentCheckIn(
  attendanceRecordId: string,
  request: StudentCheckInRequest
): Promise<StudentCheckInResponse> {
  const response = await this.apiClient.post(
    `/attendance/${encodeURIComponent(attendanceRecordId)}/checkin`,
    request
  );
  return {
    success: !!response.success,
    message: response.message || '签到完成',
    data: response.data
  };
}
```

## 请求参数
```typescript
interface StudentCheckInRequest {
  // 注意：attendance_record_id 现在从URL路径参数中获取
  location?: string;             // 位置描述
  latitude?: number;             // 纬度
  longitude?: number;            // 经度
  accuracy?: number;             // 位置精度
  remark?: string;               // 备注
}
```

## 响应格式
```typescript
interface StudentCheckInResponse {
  success: boolean;              // 是否成功
  message: string;               // 响应消息
  data?: {
    id: string;                  // 签到记录ID
    status: string;              // 签到状态
    checkin_time?: string;       // 签到时间
    approver?: {                 // 审批人信息
      id: string;
      name: string;
    };
  };
}
```

## 页面使用情况

### 1. CheckIn.tsx (✅ 已更新使用新接口)
```typescript
const response = await attendanceApi.studentCheckIn(attendanceId, {
  location: currentLocationInfo.address,
  latitude: currentLocationInfo.latitude,
  longitude: currentLocationInfo.longitude
});
```

### 2. StudentDashboard.tsx (✅ 已更新使用新接口)
```typescript
const response = await attendanceApi.studentCheckIn(id, {
  location: testLocation.address,
  latitude: testLocation.latitude,
  longitude: testLocation.longitude,
  accuracy: testLocation.accuracy
});
```

## 测试模式配置
两个页面都已配置为测试模式，使用固定位置信息：
```typescript
const FIXED_LOCATION = {
  latitude: 39.9042,
  longitude: 116.4074,
  address: '教学楼A座 201教室',
  accuracy: 10
};
```

## 防重复签到机制
- 后端接口会检查是否已经签到
- 如果已签到，返回错误信息
- 前端会显示相应的错误提示

## 接口变更说明
- **重要变更**: `attendance_record_id` 现在从URL路径参数中获取，不再在请求体中传递
- **新的URL格式**: `/api/attendance/:attendance_record_id/checkin`
- **兼容性**: 前端代码已全部更新以适配新接口

## 注意事项
1. 签到需要有效的 `attendance_record_id`，现在通过URL路径传递
2. 已签到的记录无法再次签到
3. 测试模式下使用固定位置，无需获取实际GPS位置
4. 签到成功后会重新加载数据以更新状态
5. URL中的 `attendance_record_id` 会自动进行URL编码处理 