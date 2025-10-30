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
  const { externalId } = useParams<{ externalId: string }>();
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (externalId) {
      loadAttendanceData();
    } else {
      setError('缺少课程ID参数');
      setIsLoading(false);
    }
  }, [externalId]);

  // 实时更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadAttendanceData = async () => {
    if (!externalId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response =
        await attendanceApi.getStudentAttendanceRecord(externalId);
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
    if (!externalId) {
      toast.error('提交失败', {
        description: '缺少课程ID',
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

      // 检查是否有课程ID或考勤记录ID
      // 优先使用 attendance_record_id，如果不存在则使用课程 id
      if (!attendanceData || !attendanceData.data) {
        toast.error('提交失败', {
          description: '缺少必要的课程信息，无法提交请假申请',
          duration: 4000
        });
        setIsSubmitting(false);
        return;
      }

      const recordId =
        attendanceData.data.attendance_record_id || attendanceData.data.id;

      if (!recordId) {
        toast.error('提交失败', {
          description: '缺少必要的课程信息，无法提交请假申请',
          duration: 4000
        });
        setIsSubmitting(false);
        return;
      }

      // 获取学生信息
      const student = attendanceData.data.student;
      if (!student || !student.xh || !student.xm) {
        toast.error('提交失败', {
          description: '缺少学生信息，无法提交请假申请',
          duration: 4000
        });
        setIsSubmitting(false);
        return;
      }

      const leaveRequest: StudentLeaveRequest = {
        attendance_record_id: String(recordId),
        leave_reason: reason.trim(),
        leave_type: leaveType,
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
        // 添加学生信息
        student_id: student.xh,
        student_name: student.xm,
        class_name: student.bjmc || '',
        major_name: student.zymc || ''
      };

      const response = await attendanceApi.studentLeave(leaveRequest);

      if (response.success) {
        toast.success('请假申请提交成功！', {
          description: '您的请假申请已提交，等待审批',
          duration: 3000
        });

        // 请假成功后导航到StudentDashboard页面
        setTimeout(() => {
          navigate(`/attendance/view?id=${encodeURIComponent(externalId)}`);
          // console.log('请假成功，返回上一页');
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
      const validFiles: File[] = [];
      const maxSize = 3 * 1024 * 1024; // 减少到3MB
      const maxTotalSize = 8 * 1024 * 1024; // 总大小限制8MB

      Array.from(files).forEach((file) => {
        // 检查文件类型是否为图片
        if (!file.type.startsWith('image/')) {
          toast.error('文件格式错误', {
            description: `文件 "${file.name}" 不是图片格式，请上传图片文件`,
            duration: 4000
          });
          return;
        }

        // 检查文件大小是否超过3MB
        if (file.size > maxSize) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          toast.error('文件过大', {
            description: `文件 "${file.name}" 大小为 ${fileSizeMB}MB，超过3MB限制`,
            duration: 4000
          });
          return;
        }

        validFiles.push(file);
      });

      if (validFiles.length === 0) {
        event.target.value = '';
        return;
      }

      // 限制总附件数量不超过3个
      const candidateFiles = validFiles.slice(0, 3 - attachments.length);

      // 检查总大小限制
      const currentTotalSize = attachments.reduce(
        (sum: number, file: File) => sum + file.size,
        0
      );
      const newFilesTotalSize = candidateFiles.reduce(
        (sum: number, file: File) => sum + file.size,
        0
      );

      if (currentTotalSize + newFilesTotalSize > maxTotalSize) {
        const totalSizeMB = (
          (currentTotalSize + newFilesTotalSize) /
          (1024 * 1024)
        ).toFixed(2);
        toast.error('文件总大小超限', {
          description: `所有图片总大小 ${totalSizeMB}MB，超过8MB限制`,
          duration: 4000
        });
        event.target.value = '';
        return;
      }

      // 直接添加文件，不进行压缩
      if (candidateFiles.length > 0) {
        setAttachments([...attachments, ...candidateFiles]);
        toast.success('图片上传成功', {
          description: `已添加 ${candidateFiles.length} 张图片`,
          duration: 2000
        });
      }

      // 如果超出数量限制，给出提示
      if (validFiles.length > candidateFiles.length) {
        toast.warning('附件数量限制', {
          description: '最多只能上传3个附件',
          duration: 3000
        });
      }
    }

    // 清空input的值，允许重复选择同一文件
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast.info('附件已移除', {
      duration: 2000
    });
  };

  const canSubmitLeave = () => {
    if (!attendanceData?.data) return false;

    const { course, attendance_status } = attendanceData.data;

    // 如果 attendance_status 不存在，默认可以请假
    if (!attendance_status) {
      const courseStartTime = new Date(course.course_start_time);
      return currentTime < courseStartTime;
    }

    // 如果已经签到，不能请假
    if (attendance_status.is_checked_in) {
      return false;
    }

    // 如果已经请假或请假审批中，不能重复请假
    if (
      attendance_status.status === 'leave' ||
      attendance_status.status === 'leave_pending'
    ) {
      return false;
    }

    // 获取课程开始时间
    const courseStartTime = new Date(course.course_start_time);

    // 只要在课程开始前，都可以请假
    return currentTime < courseStartTime;
  };

  // 获取请假状态提示信息
  const getLeaveStatusMessage = () => {
    if (!attendanceData?.data) return '数据加载中...';

    const { course, attendance_status } = attendanceData.data;

    // 如果 attendance_status 不存在，检查课程时间
    if (!attendance_status) {
      const courseStartTime = new Date(course.course_start_time);
      if (currentTime >= courseStartTime) {
        return '课程已开始，无法请假';
      }
      return '可以申请请假';
    }

    if (attendance_status.is_checked_in) {
      return '已签到的课程无法请假';
    }

    if (attendance_status.status === 'leave') {
      return '已申请请假，请假已通过';
    }

    if (attendance_status.status === 'leave_pending') {
      return '请假申请审批中';
    }

    const courseStartTime = new Date(course.course_start_time);

    if (currentTime >= courseStartTime) {
      return '课程已开始，无法请假';
    }

    return '可以申请请假';
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
              图片附件（可选）
            </label>
            <div className='mb-2 text-xs text-gray-500'>
              支持JPG、PNG、GIF等图片格式，单个文件不超过3MB，总大小不超过8MB，最多3张
            </div>
            <div className='space-y-2'>
              {/* 上传按钮 */}
              {attachments.length < 3 && (
                <label className='flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-gray-400'>
                  <div className='text-center'>
                    <Upload className='mx-auto mb-2 h-6 w-6 text-gray-400' />
                    <span className='text-sm text-gray-600'>
                      点击上传图片（最多3张）
                    </span>
                  </div>
                  <input
                    type='file'
                    className='hidden'
                    accept='image/*'
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
                  <div className='flex flex-1 items-center'>
                    <FileText className='mr-2 h-4 w-4 text-gray-400' />
                    <div className='flex-1'>
                      <div className='text-sm text-gray-700'>{file.name}</div>
                      <div className='text-xs text-gray-500'>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className='rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    title='移除图片'
                    aria-label='移除图片'
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
                    {getLeaveStatusMessage()}
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
