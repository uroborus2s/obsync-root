# 课程考勤数据分享功能实现指南 - Part4: 前端实现

本文档提供详细的前端实现代码示例。

---

## 1. API客户端方法

### 1.1 在 attendance-api.ts 中添加导出相关方法

**文件路径**: `apps/agendaedu-app/src/lib/attendance-api.ts`

```typescript
/**
 * 导出任务响应
 */
export interface ExportTaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  cacheHit?: boolean;
  progress?: number;
  error?: string;
}

/**
 * 导出实时数据
 */
export async function exportRealtimeData(courseId: number): Promise<ExportTaskResponse> {
  const response = await icaLinkApiClient.post<ExportTaskResponse>(
    '/icalink/v1/attendance/export/realtime',
    { courseId }
  );
  
  // 处理响应格式
  const responseData = response as unknown as ExtendedApiResponse<ExportTaskResponse>;
  if (responseData.success && responseData.data) {
    return responseData.data;
  }
  
  throw new Error('导出实时数据失败');
}

/**
 * 导出历史统计数据
 */
export async function exportHistoryData(
  courseCode: string,
  sortField: string = 'absence_rate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ExportTaskResponse> {
  const response = await icaLinkApiClient.post<ExportTaskResponse>(
    '/icalink/v1/attendance/export/history',
    { courseCode, sortField, sortOrder }
  );
  
  // 处理响应格式
  const responseData = response as unknown as ExtendedApiResponse<ExportTaskResponse>;
  if (responseData.success && responseData.data) {
    return responseData.data;
  }
  
  throw new Error('导出历史数据失败');
}

/**
 * 查询导出任务状态
 */
export async function getExportTaskStatus(taskId: string): Promise<ExportTaskResponse> {
  const response = await icaLinkApiClient.get<ExportTaskResponse>(
    `/icalink/v1/attendance/export/status/${taskId}`
  );
  
  // 处理响应格式
  const responseData = response as unknown as ExtendedApiResponse<ExportTaskResponse>;
  if (responseData.success && responseData.data) {
    return responseData.data;
  }
  
  throw new Error('查询任务状态失败');
}

/**
 * 下载导出文件
 */
export async function downloadExportFile(taskId: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(
      `${icaLinkApiClient.defaults.baseURL}/icalink/v1/attendance/export/download/${taskId}`,
      {
        method: 'GET',
        headers: {
          // 如果需要认证，添加token
          // 'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('下载文件失败');
    }

    // 获取文件blob
    const blob = await response.blob();

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载文件失败:', error);
    throw error;
  }
}
```

---

## 2. 分享对话框组件

### 2.1 创建 ShareAttendanceDialog 组件

**文件路径**: `apps/agendaedu-app/src/components/ShareAttendanceDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportRealtimeData,
  exportHistoryData,
  getExportTaskStatus,
  downloadExportFile,
  type ExportTaskResponse
} from '../lib/attendance-api';

/**
 * 对话框状态
 */
type DialogState = 'select' | 'progress' | 'ready' | 'error';

/**
 * 数据类型
 */
type ExportType = 'realtime' | 'history';

/**
 * 组件Props
 */
interface ShareAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseCode: string;
  courseName: string;
}

/**
 * 分享考勤数据对话框组件
 */
export default function ShareAttendanceDialog({
  isOpen,
  onClose,
  courseId,
  courseCode,
  courseName
}: ShareAttendanceDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('select');
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  /**
   * 重置状态
   */
  const resetState = () => {
    setDialogState('select');
    setExportType(null);
    setTaskId(null);
    setProgress(0);
    setStatusText('');
    setDownloadUrl(null);
    setFileName('');
    setFileSize('');
    setCacheInfo(null);
    setErrorMessage('');
    setIsPolling(false);
  };

  /**
   * 关闭对话框
   */
  const handleClose = () => {
    resetState();
    onClose();
  };

  /**
   * 选择数据类型
   */
  const handleSelectType = async (type: ExportType) => {
    setExportType(type);

    try {
      let response: ExportTaskResponse;

      if (type === 'realtime') {
        // 导出实时数据
        response = await exportRealtimeData(courseId);
        setFileName(`实时考勤数据_${courseName}_${Date.now()}.xlsx`);
      } else {
        // 导出历史统计数据
        response = await exportHistoryData(courseCode);
        setFileName(`课程缺勤统计_${courseName}_${Date.now()}.xlsx`);
      }

      setTaskId(response.taskId);

      // 检查是否命中缓存
      if (response.cacheHit && response.status === 'completed') {
        // 命中缓存，直接显示下载按钮
        setDialogState('ready');
        setDownloadUrl(response.downloadUrl || '');
        setCacheInfo('使用已生成的文件');
      } else {
        // 未命中缓存，显示进度
        setDialogState('progress');
        setProgress(0);
        setStatusText('正在准备...');
        setIsPolling(true);
      }
    } catch (error) {
      console.error('创建导出任务失败:', error);
      setDialogState('error');
      setErrorMessage(error instanceof Error ? error.message : '创建导出任务失败');
      toast.error('创建导出任务失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 轮询任务状态
   */
  useEffect(() => {
    if (!isPolling || !taskId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await getExportTaskStatus(taskId);

        // 更新进度
        setProgress(response.progress || 0);

        // 更新状态文字
        if (response.progress !== undefined) {
          if (response.progress < 30) {
            setStatusText('正在查询数据...');
          } else if (response.progress < 70) {
            setStatusText('正在生成Excel...');
          } else if (response.progress < 90) {
            setStatusText('正在上传文件...');
          } else {
            setStatusText('即将完成...');
          }
        }

        // 检查任务状态
        if (response.status === 'completed') {
          setIsPolling(false);
          setDialogState('ready');
          setDownloadUrl(response.downloadUrl || '');
          setProgress(100);
        } else if (response.status === 'failed') {
          setIsPolling(false);
          setDialogState('error');
          setErrorMessage(response.error || '任务执行失败');
          toast.error('生成Excel失败', {
            description: response.error || '未知错误'
          });
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
        setIsPolling(false);
        setDialogState('error');
        setErrorMessage(error instanceof Error ? error.message : '查询任务状态失败');
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isPolling, taskId]);

  /**
   * 下载文件
   */
  const handleDownload = async () => {
    if (!taskId) return;

    try {
      await downloadExportFile(taskId, fileName);
      toast.success('下载成功', {
        description: '文件已保存到下载文件夹'
      });
      // 下载完成后关闭对话框
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('下载文件失败:', error);
      toast.error('下载失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 重试
   */
  const handleRetry = () => {
    resetState();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
        {/* 关闭按钮 */}
        <button
          type='button'
          onClick={handleClose}
          className='absolute right-4 top-4 text-gray-400 hover:text-gray-600'
        >
          <X className='h-5 w-5' />
        </button>

        {/* 标题 */}
        <h2 className='mb-6 text-xl font-semibold text-gray-900'>分享考勤数据</h2>

        {/* 状态1: 选择数据类型 */}
        {dialogState === 'select' && (
          <div className='space-y-4'>
            <button
              type='button'
              onClick={() => handleSelectType('realtime')}
              className='flex w-full items-start gap-4 rounded-lg border-2 border-gray-200 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50'
            >
              <FileSpreadsheet className='mt-1 h-6 w-6 flex-shrink-0 text-blue-600' />
              <div>
                <div className='font-medium text-gray-900'>实时数据</div>
                <div className='mt-1 text-sm text-gray-600'>
                  导出当前课程的实时签到数据
                </div>
              </div>
            </button>

            <button
              type='button'
              onClick={() => handleSelectType('history')}
              className='flex w-full items-start gap-4 rounded-lg border-2 border-gray-200 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50'
            >
              <Clock className='mt-1 h-6 w-6 flex-shrink-0 text-green-600' />
              <div>
                <div className='font-medium text-gray-900'>历史统计数据</div>
                <div className='mt-1 text-sm text-gray-600'>
                  导出学生缺勤统计报表
                </div>
              </div>
            </button>
          </div>
        )}

        {/* 状态2: 进度显示 */}
        {dialogState === 'progress' && (
          <div className='space-y-6'>
            <div className='text-center'>
              <div className='mb-4 text-lg font-medium text-gray-900'>
                正在生成Excel文件...
              </div>

              {/* 进度条 */}
              <div className='mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                <div
                  className='h-full bg-blue-600 transition-all duration-300'
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* 进度百分比 */}
              <div className='mb-4 text-2xl font-bold text-blue-600'>{progress}%</div>

              {/* 状态文字 */}
              <div className='text-sm text-gray-600'>{statusText}</div>
            </div>
          </div>
        )}

        {/* 状态3: 下载就绪 */}
        {dialogState === 'ready' && (
          <div className='space-y-6'>
            <div className='text-center'>
              <div className='mb-4 text-5xl'>✅</div>
              <div className='mb-6 text-lg font-medium text-gray-900'>
                Excel文件生成成功！
              </div>

              {/* 下载按钮 */}
              <button
                type='button'
                onClick={handleDownload}
                className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700'
              >
                <Download className='h-5 w-5' />
                下载Excel文件
              </button>

              {/* 文件信息 */}
              <div className='mt-4 space-y-1 text-sm text-gray-600'>
                <div>文件名: {fileName}</div>
                {fileSize && <div>大小: {fileSize}</div>}
              </div>

              {/* 缓存提示 */}
              {cacheInfo && (
                <div className='mt-4 flex items-center justify-center gap-2 text-sm text-gray-500'>
                  <span>💡</span>
                  <span>{cacheInfo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 状态4: 错误提示 */}
        {dialogState === 'error' && (
          <div className='space-y-6'>
            <div className='text-center'>
              <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-600' />
              <div className='mb-2 text-lg font-medium text-gray-900'>生成失败</div>
              <div className='mb-6 text-sm text-gray-600'>{errorMessage}</div>

              {/* 按钮组 */}
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={handleRetry}
                  className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50'
                >
                  重试
                </button>
                <button
                  type='button'
                  onClick={handleClose}
                  className='flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 3. 集成到 AttendanceSheet 页面

### 3.1 修改 Tab 导航栏布局

**文件路径**: `apps/agendaedu-app/src/pages/AttendanceSheet.tsx`

在文件顶部导入组件：

```typescript
import ShareAttendanceDialog from '../components/ShareAttendanceDialog';
import { Share2 } from 'lucide-react';
```

添加状态管理：

```typescript
// 分享对话框状态
const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
```

修改 Tab 导航栏部分（约1424行）：

```typescript
{/* Tab 导航栏 */}
<div className='flex items-center border-b border-gray-200'>
  {/* Tab按钮组 - 使用flex-1占据左侧空间 */}
  <div className='flex flex-1'>
    {/* 签到情况 Tab - 仅在 need_checkin = 1 时显示 */}
    {course.need_checkin === 1 && (
      <button
        type='button'
        onClick={() => setActiveTab('attendance')}
        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
          activeTab === 'attendance'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        签到情况
      </button>
    )}
    {/* 缺勤统计 Tab - 始终显示 */}
    <button
      type='button'
      onClick={() => setActiveTab('absence')}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
        activeTab === 'absence'
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-600 hover:text-gray-800'
      }`}
    >
      缺勤统计
    </button>
  </div>

  {/* 分享按钮 - 固定在右侧 */}
  <button
    type='button'
    onClick={() => setIsShareDialogOpen(true)}
    className='flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:text-blue-600'
  >
    <Share2 className='h-4 w-4' />
    分享
  </button>
</div>
```

在页面底部添加对话框组件（约1849行之前）：

```typescript
{/* 分享考勤数据对话框 */}
{teacherData?.course && (
  <ShareAttendanceDialog
    isOpen={isShareDialogOpen}
    onClose={() => setIsShareDialogOpen(false)}
    courseId={teacherData.course.id}
    courseCode={teacherData.course.course_code}
    courseName={teacherData.course.course_name}
  />
)}
```

---

## 4. 样式优化建议

### 4.1 进度条动画

在 ShareAttendanceDialog 组件中，可以添加更平滑的动画效果：

```typescript
{/* 进度条 - 添加动画 */}
<div className='mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200'>
  <div
    className='h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out'
    style={{ width: `${progress}%` }}
  />
</div>
```

### 4.2 按钮悬停效果

```typescript
{/* 数据类型选择按钮 - 添加悬停动画 */}
<button
  type='button'
  onClick={() => handleSelectType('realtime')}
  className='group flex w-full items-start gap-4 rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md'
>
  <FileSpreadsheet className='mt-1 h-6 w-6 flex-shrink-0 text-blue-600 transition-transform group-hover:scale-110' />
  {/* ... */}
</button>
```

---

## 5. 测试建议

### 5.1 单元测试

测试 API 客户端方法：

```typescript
// attendance-api.test.ts
import { exportRealtimeData, exportHistoryData, getExportTaskStatus } from './attendance-api';

describe('Attendance Export API', () => {
  it('should export realtime data', async () => {
    const response = await exportRealtimeData(123);
    expect(response.taskId).toBeDefined();
    expect(response.status).toBe('pending');
  });

  it('should export history data with cache hit', async () => {
    const response = await exportHistoryData('COURSE001');
    if (response.cacheHit) {
      expect(response.status).toBe('completed');
      expect(response.downloadUrl).toBeDefined();
    }
  });
});
```

### 5.2 集成测试

测试完整的用户流程：

1. 点击分享按钮
2. 选择数据类型
3. 等待进度完成
4. 下载文件

---

## 6. 注意事项

1. **错误处理**: 确保所有API调用都有完善的错误处理
2. **加载状态**: 在等待API响应时显示加载指示器
3. **用户反馈**: 使用toast提示用户操作结果
4. **清理资源**: 组件卸载时清理定时器和事件监听器
5. **响应式设计**: 确保对话框在移动设备上也能正常显示
6. **无障碍访问**: 添加适当的ARIA标签和键盘导航支持

---

## 7. 后续优化

1. **添加下载历史**: 记录用户的下载历史
2. **支持批量下载**: 一次下载多个课程的数据
3. **自定义字段**: 允许用户选择要导出的字段
4. **预览功能**: 在下载前预览Excel内容
5. **分享链接**: 生成可分享的下载链接

