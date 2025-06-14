import { FloatingApprovalButton } from '@/components/FloatingApprovalButton';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import {
  attendanceApi,
  type StudentAttendanceSearchResponse,
  type StudentLeaveRequest
} from '@/lib/attendance-api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  Upload,
  User,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function LeaveContent() {
  const navigate = useNavigate();
  const { attendanceId } = useParams<{ attendanceId: string }>();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] =
    useState<StudentAttendanceSearchResponse | null>(null);
  const [leaveType, setLeaveType] = useState<
    'sick' | 'personal' | 'emergency' | 'other'
  >('sick');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (attendanceId) {
      loadAttendanceData();
    } else {
      setError('缺少考勤ID参数');
      setIsLoading(false);
    }
  }, [attendanceId]);

  const loadAttendanceData = async () => {
    if (!attendanceId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response =
        await attendanceApi.getStudentAttendanceRecord(attendanceId);
      console.log('response', response);
      if (response.success && response.data) {
        setAttendanceData(response);
      } else {
        setError(response.message || '获取考勤信息失败');
      }
    } catch (error) {
      console.error('加载考勤数据失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attendanceId) {
      toast.error('提交失败', {
        description: '缺少考勤ID',
        duration: 3000
      });
      return;
    }

    if (!reason.trim()) {
      toast.warning('请填写请假原因', {
        description: '请假原因不能为空',
        duration: 3000
      });
      return;
    }

    if (reason.trim().length < 5) {
      toast.warning('请假原因过短', {
        description: '请假原因至少需要5个字符',
        duration: 3000
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 处理附件转换为Base64
      let attachmentData: Array<{
        file_name: string;
        file_content: string;
        file_type: string;
        file_size: number;
      }> = [];

      if (attachments.length > 0) {
        toast.info('正在处理附件...', {
          duration: 2000
        });

        // 将文件转换为Base64
        const filePromises = attachments.map((file) => {
          return new Promise<{
            file_name: string;
            file_content: string;
            file_type: string;
            file_size: number;
          }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // 移除data:xxx;base64,前缀
              const base64Content = result.split(',')[1];
              resolve({
                file_name: file.name,
                file_content: base64Content,
                file_type: file.type,
                file_size: file.size
              });
            };
            reader.onerror = () =>
              reject(new Error(`读取文件 ${file.name} 失败`));
            reader.readAsDataURL(file);
          });
        });

        try {
          attachmentData = await Promise.all(filePromises);
        } catch (fileError) {
          toast.error('文件处理失败', {
            description:
              fileError instanceof Error ? fileError.message : '文件读取失败',
            duration: 4000
          });
          setIsSubmitting(false);
          return;
        }
      }

      const leaveRequest: StudentLeaveRequest = {
        attendance_record_id: attendanceId,
        leave_reason: reason.trim(),
        leave_type: leaveType,
        attachments: attachmentData.length > 0 ? attachmentData : undefined
      };

      const response = await attendanceApi.studentLeave(leaveRequest);

      if (response.success) {
        toast.success('请假申请提交成功！', {
          description: '您的请假申请已提交，等待审批',
          duration: 3000
        });

        // 请假成功后导航到StudentDashboard页面
        setTimeout(() => {
          navigate(
            `/attendance/student?id=${encodeURIComponent(attendanceId)}`
          );
        }, 1500);
      } else {
        setError(response.message || '提交失败');
        toast.error('提交失败', {
          description: response.message || '提交失败，请重试',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('提交请假申请失败:', error);
      setError('提交失败，请重试');
      toast.error('提交失败', {
        description: '网络错误，请稍后重试',
        duration: 4000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveTypeText = (
    type: 'sick' | 'personal' | 'emergency' | 'other'
  ) => {
    switch (type) {
      case 'sick':
        return '病假';
      case 'personal':
        return '事假';
      case 'emergency':
        return '紧急事假';
      case 'other':
        return '其他';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 3 - attachments.length);
      setAttachments([...attachments, ...newFiles]);

      if (newFiles.length > 0) {
        toast.success('文件上传成功', {
          description: `已添加 ${newFiles.length} 个附件`,
          duration: 2000
        });
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast.info('附件已移除', {
      duration: 2000
    });
  };

  const canSubmitLeave = () => {
    return (
      attendanceData?.data?.attendance_status.can_leave &&
      !attendanceData?.data?.attendance_status.is_checked_in
    );
  };

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>加载课程信息中...</p>
        </div>
      </div>
    );
  }

  if (error && !attendanceData) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='bg-white shadow-sm'>
          <div className='flex items-center px-4 py-4'>
            <button
              onClick={() => navigate(-1)}
              className='rounded-lg p-2 hover:bg-gray-100'
              aria-label='返回'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='ml-3 text-lg font-semibold'>课程请假</h1>
          </div>
        </div>
        <div className='flex items-center justify-center py-8'>
          <div className='rounded-lg bg-white p-8 text-center shadow-sm'>
            <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>加载失败</h3>
            <p className='mb-4 text-gray-600'>{error}</p>
            <button
              onClick={loadAttendanceData}
              className='rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='flex items-center justify-between px-4 py-4'>
          <div className='flex items-center'>
            <button
              onClick={() => navigate(-1)}
              className='rounded-lg p-2 hover:bg-gray-100'
              aria-label='返回'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='ml-3 text-lg font-semibold'>课程请假</h1>
          </div>
          <button
            onClick={loadAttendanceData}
            disabled={isLoading}
            className='rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50'
            aria-label='刷新'
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className='mx-auto max-w-md space-y-4 p-4'>
        {/* 错误提示 */}
        {error && (
          <div className='rounded-lg bg-red-50 p-4'>
            <div className='flex items-center'>
              <AlertCircle className='mr-2 h-5 w-5 text-red-500' />
              <span className='text-sm text-red-700'>{error}</span>
            </div>
          </div>
        )}

        {/* 课程信息卡片 */}
        {attendanceData?.data && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900'>课程信息</h2>
              <span className='rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600'>
                请假课程
              </span>
            </div>

            <div className='space-y-3'>
              {/* 课程名称 */}
              <div className='flex items-center'>
                <div className='mr-3 h-2 w-2 rounded-full bg-blue-500'></div>
                <div className='flex-1'>
                  <div className='text-lg font-medium text-gray-900'>
                    {attendanceData.data.course.kcmc}
                  </div>
                </div>
              </div>

              {/* 上课日期 */}
              <div className='flex items-center text-gray-600'>
                <Calendar className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  上课日期：
                  {attendanceData.data.course.rq ||
                    new Date(
                      attendanceData.data.course.course_start_time
                    ).toLocaleDateString('zh-CN')}
                </span>
              </div>

              {/* 上课时间 */}
              <div className='flex items-center text-gray-600'>
                <Clock className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  上课时间：
                  {attendanceData.data.course.sj_f ||
                    new Date(
                      attendanceData.data.course.course_start_time
                    ).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}{' '}
                  -{' '}
                  {attendanceData.data.course.sj_t ||
                    new Date(
                      attendanceData.data.course.course_end_time
                    ).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                </span>
              </div>

              {/* 上课地点 */}
              <div className='flex items-center text-gray-600'>
                <MapPin className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  上课地点：{attendanceData.data.course.lq}{' '}
                  {attendanceData.data.course.room_s}教室
                </span>
              </div>

              {/* 授课教师 */}
              <div className='flex items-center text-gray-600'>
                <User className='mr-3 h-4 w-4 text-gray-400' />
                <span className='text-sm'>
                  授课教师：{attendanceData.data.course.xm_s}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 请假表单 */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>请假申请</h3>

          {/* 请假类型选择 */}
          <div className='mb-4'>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              请假类型
            </label>
            <div className='grid grid-cols-2 gap-2'>
              {(['sick', 'personal', 'emergency', 'other'] as const).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setLeaveType(type)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      leaveType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {getLeaveTypeText(type)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 请假原因 */}
          <div className='mb-4'>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              请假原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='请详细说明请假原因...'
              className='w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              rows={4}
              maxLength={500}
            />
            <div className='mt-1 text-right text-xs text-gray-500'>
              {reason.length}/500
            </div>
          </div>

          {/* 附件上传 */}
          <div className='mb-6'>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              附件（可选）
            </label>
            <div className='space-y-2'>
              {/* 上传按钮 */}
              {attachments.length < 3 && (
                <label className='flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-gray-400'>
                  <div className='text-center'>
                    <Upload className='mx-auto mb-2 h-6 w-6 text-gray-400' />
                    <span className='text-sm text-gray-600'>
                      点击上传附件（最多3个）
                    </span>
                  </div>
                  <input
                    type='file'
                    className='hidden'
                    accept='image/*,.pdf,.doc,.docx'
                    multiple
                    onChange={handleFileUpload}
                  />
                </label>
              )}

              {/* 已上传的附件列表 */}
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between rounded-lg border border-gray-200 p-3'
                >
                  <div className='flex items-center'>
                    <FileText className='mr-2 h-4 w-4 text-gray-400' />
                    <span className='text-sm text-gray-700'>{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className='rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    title='移除附件'
                    aria-label='移除附件'
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className='space-y-3'>
            {!canSubmitLeave() && (
              <div className='rounded-lg bg-yellow-50 p-3'>
                <div className='flex items-center'>
                  <AlertCircle className='mr-2 h-4 w-4 text-yellow-500' />
                  <span className='text-sm text-yellow-700'>
                    {attendanceData?.data?.attendance_status.is_checked_in
                      ? '已签到的课程无法请假'
                      : '当前时间不允许请假'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmitLeave()}
              className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                isSubmitting || !canSubmitLeave()
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {isSubmitting ? '提交中...' : '提交请假申请'}
            </button>
          </div>
        </div>
      </div>

      <FloatingApprovalButton />
    </div>
  );
}

export function Leave() {
  return (
    <ToastProvider>
      <Toaster />
      <LeaveContent />
    </ToastProvider>
  );
}
