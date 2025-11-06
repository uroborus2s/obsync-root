# 位置校验失败对话框改进文档

## 改进概述

对 `LocationFailedDialog` 组件进行了全面的 UI 和交互逻辑优化，提升用户体验和功能完整性。

## 一、UI 改进

### 1. 刷新位置按钮 ✅

**位置**：距离文本右侧，使用 `justify-between` 布局靠右对齐

**实现**：

```tsx
<div className='flex items-center justify-between'>
  <p className='text-sm text-red-800'>
    您当前不在上课地点附近
    {distance && distance > 0 && (
      <span className='ml-1 font-medium'>
        （距离约 {Math.round(distance)}米）
      </span>
    )}
  </p>
  {distance && distance > 0 && (
    <button
      type='button'
      onClick={handleRefresh}
      disabled={isLoading || isRefreshing}
      className='ml-3 inline-flex items-center justify-center rounded-full bg-blue-50 p-2 text-blue-600 transition-all hover:scale-110 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50'
      title='点击刷新位置'
    >
      <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  )}
</div>
```

**特性**：

- 使用 Flexbox 布局（`flex items-center justify-between`），按钮自动靠右对齐
- 图标尺寸为 `h-6 w-6`（24px），非常显眼
- 使用蓝色图标（`text-blue-600`）+ 浅蓝色背景（`bg-blue-50`）
- 圆形按钮（`rounded-full`），视觉上更突出
- 内边距 `p-2`（8px），点击区域更大
- 点击后显示旋转加载动画
- 刷新时禁用所有按钮，防止重复操作
- 悬停时显示更深的蓝色背景（`hover:bg-blue-100`）+ 中等阴影（`hover:shadow-md`）+ 放大效果（`hover:scale-110`）
- 平滑过渡动画（`transition-all`）

**优化历程**：

- ✅ **第一次优化**：移除了冗余的"重新获取位置"大按钮
- ✅ **第二次优化**：增强了内联刷新图标的显眼度（更大、更蓝、更明显）
- ✅ **第三次优化**：调整图标位置到括号外 + 增加背景色 + 圆形设计 + 阴影效果
- ✅ **第四次优化**：使用 Flexbox 布局靠右对齐 + 增大尺寸到 24px + 添加悬停放大效果
- ✅ 保留了 `onRetry` 回调（用于其他可能的调用场景）
- ✅ 更新提示文本："请点击右侧的刷新图标重新获取位置，或选择以下操作："

**视觉效果对比**：

| 版本           | 位置     | 尺寸 | 背景 | 形状 | 悬停效果  | 显眼度       |
| -------------- | -------- | ---- | ---- | ---- | --------- | ------------ |
| **初始版本**   | 括号内   | 14px | 无   | 方形 | 无        | ⭐⭐⭐       |
| **第一次优化** | 括号内   | 16px | 无   | 方形 | 无        | ⭐⭐⭐⭐     |
| **第二次优化** | 括号外   | 20px | 蓝色 | 圆形 | 阴影      | ⭐⭐⭐⭐⭐   |
| **当前版本**   | 右侧独立 | 24px | 蓝色 | 圆形 | 放大+阴影 | ⭐⭐⭐⭐⭐⭐ |

### 2. 图片签到确认机制 ✅

**新增元素**：勾选框（checkbox）+ 温馨提示

**实现**：

```tsx
{
  /* 图片签到确认提示 */
}
<div className='rounded-lg border border-yellow-300 bg-yellow-50 p-3'>
  <div className='mb-2 flex items-start gap-2'>
    <span className='text-yellow-600'>⚠️</span>
    <p className='text-xs text-yellow-800'>
      <strong>温馨提示：</strong>
      图片签到需要教师审批才能完成签到，提醒老师确认。
    </p>
  </div>
  <label className='flex cursor-pointer items-start gap-2'>
    <input
      type='checkbox'
      checked={isCheckboxChecked}
      onChange={(e) => setIsCheckboxChecked(e.target.checked)}
      disabled={isLoading || isRefreshing}
      className='mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50'
    />
    <span className='text-xs text-gray-700'>我已知晓并同意使用图片签到</span>
  </label>
</div>;
```

**按钮状态**：

- **未勾选**：按钮禁用，灰色样式
- **已勾选**：按钮可点击，蓝色样式

```tsx
<button
  type='button'
  onClick={onPhotoCheckin}
  disabled={isLoading || isRefreshing || !isCheckboxChecked}
  style={{
    borderColor: isCheckboxChecked ? '#2563eb' : '#d1d5db',
    backgroundColor: isCheckboxChecked ? '#ffffff' : '#f3f4f6',
    color: isCheckboxChecked ? '#2563eb' : '#9ca3af'
  }}
>
  <Camera className='h-5 w-5' />
  <span>使用图片签到</span>
</button>
```

## 二、交互逻辑改进

### 1. 刷新位置功能 ✅

**触发方式**：点击距离文本后的刷新图标按钮

**执行流程**：

```tsx
const handleRefreshLocation = async () => {
  try {
    // 1. 重新获取地理位置
    const locationData = await LocationHelper.getCurrentLocation();

    // 2. 验证位置范围
    const locationValidation = validateLocationForCheckIn(
      { lat: locationData.latitude, lng: locationData.longitude },
      roomInfo
    );

    if (locationValidation.valid) {
      // 3a. 校验成功：自动签到
      toast.info('位置校验成功', { description: '正在自动签到...' });

      // 关闭对话框
      setShowLocationFailedDialog(false);

      // 构建签到 payload 并发起请求
      const response = await attendanceApi.studentCheckIn(
        attendanceData.id,
        payload
      );

      if (response.success) {
        toast.success('签到成功!', { description: '签到状态已更新。' });
        await loadAttendanceData(true);
      }
    } else {
      // 3b. 校验仍然失败：更新距离显示
      setPendingLocationData(locationData);
      setLocationValidationDistance(locationValidation.distance);
      toast.warning('位置仍未在范围内', {
        description: `距离约 ${Math.round(distance)} 米，请继续刷新或使用图片签到`
      });
    }
  } catch (error) {
    toast.error('刷新位置失败', {
      description: error.message
    });
  }
};
```

**关键特性**：

- ✅ 校验成功时自动关闭对话框并完成签到
- ✅ 校验失败时对话框保持打开，更新距离显示
- ✅ 刷新时显示加载动画，禁用所有按钮
- ✅ 错误处理完善，显示明确的错误提示

### 2. 图片签到流程 ✅

**前置条件**：用户必须勾选确认框

**执行流程**（与现有逻辑一致）：

1. 打开相机/相册选择图片
2. 验证文件大小（< 10MB）和格式（JPEG/PNG/GIF/WebP）
3. 调用 `/api/icalink/v1/oss/presigned-upload-url` 获取预签名 URL
4. 上传图片到 OSS
5. 获取 `objectPath` 作为 `photo_url`
6. 调用签到接口，携带 `photo_url` 和 `location_offset_distance` 参数
7. 签到成功后关闭对话框并刷新页面

### 3. 自动关闭机制 ✅

**触发条件**：对话框打开后，当前时间超过签到窗口结束时间

**实现**：

```tsx
useEffect(() => {
  if (!isOpen || !windowEndTime) return;

  const checkWindowExpiry = () => {
    const now = new Date();
    const endTime = new Date(windowEndTime);

    if (now > endTime) {
      // 窗口已结束，自动关闭对话框
      onClose();
    }
  };

  // 立即检查一次
  checkWindowExpiry();

  // 每秒检查一次
  const interval = setInterval(checkWindowExpiry, 1000);

  return () => clearInterval(interval);
}, [isOpen, windowEndTime, onClose]);
```

**关闭行为**：

```tsx
onClose={() => {
  setShowLocationFailedDialog(false);
  setPendingLocationData(null);
  setLocationValidationDistance(undefined);
  setCheckinLoading(false);
  checkinAbortRef.current = null;

  // 显示窗口已结束提示
  if (attendanceData?.verification_windows) {
    const windowCloseTime = addMinutes(
      new Date(attendanceData.verification_windows.open_time),
      attendanceData.verification_windows.duration_minutes
    );
    const now = new Date();
    if (now > windowCloseTime) {
      toast.info('签到时间窗口已结束', {
        description: '请联系教师处理签到问题'
      });
      loadAttendanceData(true);
    }
  }
}}
```

## 三、新增 Props

### LocationFailedDialog 组件

```typescript
interface LocationFailedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPhotoCheckin: () => void;
  onRefreshLocation: () => Promise<void>; // 新增：刷新位置回调
  isLoading?: boolean;
  distance?: number;
  windowEndTime?: string; // 新增：签到窗口结束时间（ISO 格式）
}
```

### StudentDashboard 调用

```tsx
<LocationFailedDialog
  isOpen={showLocationFailedDialog}
  onClose={handleClose}
  onRetry={handleRetryLocation}
  onPhotoCheckin={handlePhotoCheckin}
  onRefreshLocation={handleRefreshLocation} // 新增
  isLoading={checkinLoading}
  distance={locationValidationDistance}
  windowEndTime={
    attendanceData?.verification_windows
      ? addMinutes(
          new Date(attendanceData.verification_windows.open_time),
          attendanceData.verification_windows.duration_minutes
        ).toISOString()
      : undefined
  } // 新增
/>
```

## 四、状态管理

### LocationFailedDialog 组件内部状态

```tsx
const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
```

**状态重置**：

```tsx
useEffect(() => {
  if (!isOpen) {
    setIsCheckboxChecked(false);
    setIsRefreshing(false);
  }
}, [isOpen]);
```

## 五、测试场景

### 1. 刷新位置成功 ✅

- 点击刷新图标
- 显示加载动画
- 位置校验通过
- 自动签到成功
- 对话框关闭
- 显示"签到成功"提示

### 2. 刷新位置失败 ✅

- 点击刷新图标
- 显示加载动画
- 位置仍超出范围
- 更新距离显示（例如：520米 → 480米）
- 对话框保持打开
- 显示"位置仍未在范围内"提示

### 3. 图片签到（未勾选确认框） ✅

- 不勾选确认框
- "使用图片签到"按钮保持禁用状态（灰色）
- 无法点击

### 4. 图片签到（已勾选确认框） ✅

- 勾选确认框
- "使用图片签到"按钮变为可点击状态（蓝色）
- 点击后打开相机/相册
- 上传图片
- 签到成功

### 5. 自动关闭（窗口结束） ✅

- 对话框打开
- 等待超过窗口结束时间
- 对话框自动关闭
- 显示"签到时间窗口已结束"提示
- 刷新页面数据

### 6. 防止重复操作 ✅

- 刷新位置时，所有按钮禁用
- 图片签到时，所有按钮禁用
- 加载状态清晰可见

## 六、用户体验优化

### 1. 加载状态

- ✅ 刷新位置时：刷新图标旋转动画
- ✅ 签到时：按钮禁用，显示"处理中..."
- ✅ 所有异步操作都有明确的加载状态

### 2. 错误处理

- ✅ 刷新位置失败：显示错误提示，对话框保持打开
- ✅ 图片上传失败：显示错误提示，可以重试
- ✅ 签到失败：显示错误提示，可以重试

### 3. 状态管理

- ✅ 对话框关闭时自动重置所有状态
- ✅ 所有异常情况下都能正确恢复
- ✅ 防止状态泄漏

### 4. 提示信息

- ✅ 位置校验成功：显示"位置校验成功，正在自动签到..."
- ✅ 位置仍未在范围内：显示距离和操作建议
- ✅ 窗口已结束：显示明确的提示和处理建议
- ✅ 图片签到：显示温馨提示和确认机制

## 七、相关文件

### 修改的文件

1. **`apps/agendaedu-app/src/components/LocationFailedDialog.tsx`**
   - 添加内联刷新按钮
   - 添加确认勾选框
   - 添加自动关闭定时器逻辑
   - 新增 `onRefreshLocation` 回调函数
   - 新增 `windowEndTime` prop

2. **`apps/agendaedu-app/src/pages/StudentDashboard.tsx`**
   - 实现 `handleRefreshLocation` 函数
   - 传递 `onRefreshLocation` 回调给 `LocationFailedDialog`
   - 传递签到窗口结束时间给对话框
   - 优化 `onClose` 回调，添加窗口结束提示

## 八、实现时间

2025-11-05
