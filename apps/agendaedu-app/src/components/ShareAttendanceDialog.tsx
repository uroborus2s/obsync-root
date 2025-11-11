import { attendanceApi, type ExportTaskResponse } from '@/lib/attendance-api';
import {
  AlertCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type DialogState = 'select' | 'progress' | 'ready' | 'error';
type ExportType = 'realtime' | 'history';

interface ShareAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseCode: string;
  courseName: string;
}

export function ShareAttendanceDialog({
  isOpen,
  onClose,
  courseId,
  courseCode
}: ShareAttendanceDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('select');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  // 重置状态
  const resetState = () => {
    setDialogState('select');
    setTaskId(null);
    setProgress(0);
    setStatusText('');
    setFileName('');
    setFileSize(0);
    setRecordCount(0);
    setCacheInfo(null);
    setErrorMessage('');
    setIsPolling(false);
  };

  // 关闭对话框
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 选择导出类型
  const handleSelectType = async (type: ExportType) => {
    try {
      let response: ExportTaskResponse;

      if (type === 'realtime') {
        // 实时数据：直接调用API
        response = await attendanceApi.exportRealtimeData(courseId);
      } else {
        // 历史数据：调用API并检查缓存
        response = await attendanceApi.exportHistoryData(courseCode);
      }

      setTaskId(response.taskId);
      setFileName(response.fileName || '');
      setFileSize(response.fileSize || 0);
      setRecordCount(response.recordCount || 0);

      if (response.cacheHit) {
        // 命中缓存：直接显示下载按钮
        setDialogState('ready');
        setCacheInfo('使用已生成的文件');
      } else {
        // 未命中缓存:显示进度条并开始轮询
        setDialogState('progress');
        setProgress(0); // 从0%开始
        setStatusText('正在准备导出...');
        setIsPolling(true);
      }
    } catch (error) {
      setDialogState('error');
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
      toast.error('导出失败');
    }
  };

  // 轮询任务状态
  useEffect(() => {
    if (!isPolling || !taskId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await attendanceApi.getExportTaskStatus(taskId);

        // 检查任务状态
        if (response.status === 'completed') {
          // 任务完成：进度设为100%
          setProgress(100);
          setStatusText('导出完成！');
          setIsPolling(false);
          setDialogState('ready');
          setFileName(response.fileName || '');
          setFileSize(response.fileSize || 0);
          setRecordCount(response.recordCount || 0);
          toast.success('文件生成成功');
        } else if (response.status === 'failed') {
          setIsPolling(false);
          setDialogState('error');
          setErrorMessage(response.error || '任务执行失败');
          toast.error('导出失败');
        } else {
          // 任务进行中：每次增加10%，但不超过90%
          setProgress((prevProgress) => {
            const newProgress = Math.min(prevProgress + 10, 90);

            // 根据进度更新状态文字
            if (newProgress < 30) {
              setStatusText('正在查询数据...');
            } else if (newProgress < 60) {
              setStatusText('正在生成Excel...');
            } else if (newProgress < 90) {
              setStatusText('正在上传文件...');
            } else {
              setStatusText('即将完成...');
            }

            return newProgress;
          });
        }
      } catch (error) {
        setIsPolling(false);
        setDialogState('error');
        setErrorMessage(error instanceof Error ? error.message : '查询失败');
        toast.error('查询任务状态失败');
      }
    }, 1000); // 每1秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isPolling, taskId]);

  // 下载文件
  const handleDownload = async () => {
    if (!taskId || !fileName) return;

    try {
      await attendanceApi.downloadExportFile(taskId, fileName);
      toast.success('文件下载成功');
      handleClose();
    } catch (error) {
      toast.error('下载失败');
    }
  };

  // 重试
  const handleRetry = () => {
    resetState();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
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
        <h2 className='mb-6 text-xl font-semibold text-gray-900'>
          分享考勤数据
        </h2>

        {/* 状态1: 选择数据类型 */}
        {dialogState === 'select' && (
          <div className='space-y-4'>
            <button
              type='button'
              onClick={() => handleSelectType('realtime')}
              className='flex w-full items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50'
            >
              <FileSpreadsheet className='h-8 w-8 text-blue-600' />
              <div className='flex-1 text-left'>
                <div className='font-medium text-gray-900'>实时数据</div>
                <div className='text-sm text-gray-500'>
                  导出当前课程当天的实时签到数据
                </div>
              </div>
            </button>

            <button
              type='button'
              onClick={() => handleSelectType('history')}
              className='flex w-full items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50'
            >
              <Clock className='h-8 w-8 text-blue-600' />
              <div className='flex-1 text-left'>
                <div className='font-medium text-gray-900'>
                  历史统计数据（不含当天数据）
                </div>
                <div className='text-sm text-gray-500'>
                  导出学生缺勤统计报表
                </div>
              </div>
            </button>
          </div>
        )}

        {/* 状态2: 进度显示 */}
        {dialogState === 'progress' && (
          <div className='space-y-4'>
            <div className='flex items-center justify-center'>
              <Loader2 className='h-12 w-12 animate-spin text-blue-600' />
            </div>
            <div className='text-center'>
              <div className='text-lg font-medium text-gray-900'>
                正在生成Excel文件...
              </div>
              <div className='mt-2 text-sm text-gray-500'>{statusText}</div>
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm text-gray-600'>
                <span>进度</span>
                <span>{progress}%</span>
              </div>
              <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                <div
                  className='h-full bg-blue-600 transition-all duration-300'
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 状态3: 下载就绪 */}
        {dialogState === 'ready' && (
          <div className='space-y-4'>
            <div className='flex items-center justify-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                <Download className='h-8 w-8 text-green-600' />
              </div>
            </div>
            <div className='text-center'>
              <div className='text-lg font-medium text-gray-900'>
                Excel文件生成成功！
              </div>
              {cacheInfo && (
                <div className='mt-2 text-sm text-blue-600'>💡 {cacheInfo}</div>
              )}
            </div>
            <div className='space-y-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600'>
              <div className='flex justify-between'>
                <span>文件名：</span>
                <span className='font-medium'>{fileName}</span>
              </div>
              <div className='flex justify-between'>
                <span>文件大小：</span>
                <span className='font-medium'>
                  {(fileSize / 1024).toFixed(2)} KB
                </span>
              </div>
              <div className='flex justify-between'>
                <span>记录数：</span>
                <span className='font-medium'>{recordCount} 条</span>
              </div>
            </div>
            <button
              type='button'
              onClick={handleDownload}
              className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700'
            >
              <Download className='h-5 w-5' />
              下载Excel文件
            </button>
          </div>
        )}

        {/* 状态4: 错误提示 */}
        {dialogState === 'error' && (
          <div className='space-y-4'>
            <div className='flex items-center justify-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
                <AlertCircle className='h-8 w-8 text-red-600' />
              </div>
            </div>
            <div className='text-center'>
              <div className='text-lg font-medium text-gray-900'>生成失败</div>
              <div className='mt-2 text-sm text-red-600'>{errorMessage}</div>
            </div>
            <div className='flex gap-3'>
              <button
                type='button'
                onClick={handleRetry}
                className='flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50'
              >
                重试
              </button>
              <button
                type='button'
                onClick={handleClose}
                className='flex-1 rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700'
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
