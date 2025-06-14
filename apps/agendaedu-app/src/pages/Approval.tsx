import {
  attendanceApi,
  type TeacherApprovalRequest,
  type TeacherLeaveApplicationItem,
  type TeacherLeaveApplicationQueryParams
} from '@/lib/attendance-api';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Eye,
  FileText,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 基于用户提供的实际API响应数据结构
interface StudentInfo {
  student_id: string;
  student_name: string;
  class_name: string;
  major_name: string;
}

interface TeacherInfo {
  teacher_id: string;
  teacher_name: string;
  teacher_department: string;
}

interface AttachmentInfo {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_time: string;
}

interface ApplicationItem {
  id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  class_date: string;
  class_time: string;
  class_location: string;
  teacher_name: string;
  leave_date: string;
  leave_reason: string;
  leave_type: 'sick' | 'personal' | 'emergency' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_comment: string | null;
  approval_time: string | null;
  application_time: string;
  approval_id: string;
  student_info: StudentInfo;
  teacher_info: TeacherInfo;
  attachments: AttachmentInfo[];
  jxz?: number | null;
}

export function Approval() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>(
    'pending'
  );
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending_count: 0,
    processed_count: 0,
    approved_count: 0,
    rejected_count: 0,
    cancelled_count: 0,
    total_count: 0
  });

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const loadApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 构建查询参数
      const params: TeacherLeaveApplicationQueryParams = {
        page: 1,
        page_size: 50
      };

      // 根据activeTab添加状态过滤
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else {
        // 已处理：包括approved, rejected, cancelled
        params.status = 'approved,rejected,cancelled';
      }

      // 使用API服务调用
      const response = await attendanceApi.getTeacherLeaveApplications(params);
      console.log(response);
      if (response.success && response.data) {
        // 转换数据格式以匹配我们的ApplicationItem接口
        const convertedApplications: ApplicationItem[] =
          response.data.applications.map(
            (app: TeacherLeaveApplicationItem) => ({
              id: app.id,
              student_id: app.student_id,
              student_name: app.student_name,
              course_id: app.course_id || '',
              course_name: app.course_name,
              class_date: app.class_date,
              class_time: app.class_time,
              class_location: app.class_location || '',
              teacher_name: app.teacher_name || '',
              leave_date: app.leave_date,
              leave_reason: app.leave_reason,
              leave_type: app.leave_type,
              status: app.status,
              approval_comment: app.approval_comment || null,
              approval_time: app.approval_time || null,
              application_time: app.application_time,
              approval_id: app.approval_id || '',
              student_info: {
                student_id: app.student_info?.student_id || app.student_id,
                student_name:
                  app.student_info?.student_name || app.student_name,
                class_name: app.student_info?.class_name || '',
                major_name: app.student_info?.major_name || ''
              },
              teacher_info: {
                teacher_id: app.teacher_info?.teacher_id || '',
                teacher_name:
                  app.teacher_info?.teacher_name || app.teacher_name || '',
                teacher_department: app.teacher_info?.teacher_department || ''
              },
              attachments:
                app.attachments?.map(
                  (
                    att: NonNullable<
                      TeacherLeaveApplicationItem['attachments']
                    >[0]
                  ) => ({
                    id: att.id,
                    file_name: att.file_name,
                    file_size: att.file_size,
                    file_type: att.file_type,
                    upload_time: att.upload_time || ''
                  })
                ) || [],
              jxz: app.jxz
            })
          );

        setApplications(convertedApplications);
        setStats(response.data.stats);
      } else {
        setError(response.message || '获取请假申请失败');
      }
    } catch (error) {
      console.error('加载请假申请失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (
    application: ApplicationItem,
    comment?: string
  ) => {
    if (!application.approval_id) {
      setError('缺少审批记录ID');
      return;
    }

    setProcessingId(application.id);
    try {
      const request: TeacherApprovalRequest = {
        approval_id: application.approval_id,
        action: 'approve',
        comment: comment || '同意请假申请'
      };

      const response = await attendanceApi.teacherApproveLeave(request);

      if (response.success) {
        alert('申请已批准');
        await loadApplications(); // 重新加载数据
      } else {
        setError(response.message || '审批失败');
      }
    } catch (error) {
      console.error('审批失败:', error);
      setError('审批失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (application: ApplicationItem) => {
    if (!application.approval_id) {
      setError('缺少审批记录ID');
      return;
    }

    const reason = prompt('请输入拒绝理由:');
    if (!reason?.trim()) {
      alert('请输入拒绝理由');
      return;
    }

    setProcessingId(application.id);
    try {
      const request: TeacherApprovalRequest = {
        approval_id: application.approval_id,
        action: 'reject',
        comment: reason.trim()
      };

      const response = await attendanceApi.teacherApproveLeave(request);

      if (response.success) {
        alert('申请已拒绝');
        await loadApplications(); // 重新加载数据
      } else {
        setError(response.message || '审批失败');
      }
    } catch (error) {
      console.error('审批失败:', error);
      setError('审批失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewAttachment = async (attachmentId: string) => {
    try {
      // 直接打开图片查看接口
      const imageUrl = `/api/attendance/attachments/${attachmentId}/image`;
      window.open(imageUrl, '_blank');
    } catch (error) {
      console.error('查看附件失败:', error);
      alert('查看附件失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已拒绝';
      case 'cancelled':
        return '已取消';
      default:
        return '未知状态';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className='h-4 w-4' />;
      case 'approved':
        return <CheckCircle className='h-4 w-4' />;
      case 'rejected':
        return <XCircle className='h-4 w-4' />;
      case 'cancelled':
        return <Ban className='h-4 w-4' />;
      default:
        return <AlertCircle className='h-4 w-4' />;
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
      default:
        return '未知';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 格式化日期为 MM/DD周X 格式
  const formatDateWithWeekday = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}${weekday}`;
  };

  const ApplicationCard = ({
    application
  }: {
    application: ApplicationItem;
  }) => (
    <div className='rounded-lg bg-white p-4 shadow-sm'>
      {/* 头部信息 */}
      <div className='mb-3 flex items-start justify-between'>
        <div className='flex items-center space-x-2'>
          <User className='h-5 w-5 text-gray-500' />
          <div>
            <div className='font-medium text-gray-900'>
              {application.student_info.student_name}
            </div>
            <div className='text-sm text-gray-500'>
              学号：{application.student_info.student_id}
              {application.student_info.class_name && (
                <span className='ml-2'>
                  班级：{application.student_info.class_name}
                </span>
              )}
              {application.student_info.major_name && (
                <span className='ml-2'>
                  专业：{application.student_info.major_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <span
            className={`inline-flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
              application.status
            )}`}
          >
            {getStatusIcon(application.status)}
            <span>{getStatusText(application.status)}</span>
          </span>
        </div>
      </div>

      {/* 课程信息 - 按照图片格式重新设计 */}
      <div className='mb-3 rounded-lg border border-gray-200 bg-white p-4'>
        {/* 课程标题和状态 */}
        <div className='mb-3 flex items-start justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>
            {application.course_name}
          </h3>
          <span className='rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-600'>
            未开始
          </span>
        </div>

        {/* 课程详细信息 */}
        <div className='space-y-2 text-sm text-gray-600'>
          {/* 日期 */}
          <div className='flex items-center'>
            <span className='mr-2 h-4 w-4'>📅</span>
            <span>{formatDateWithWeekday(application.class_date)}</span>
          </div>

          {/* 时间 */}
          <div className='flex items-center'>
            <span className='mr-2 h-4 w-4'>🕘</span>
            <span>{application.class_time}</span>
          </div>

          {/* 地点 */}
          {application.class_location && (
            <div className='flex items-center'>
              <span className='mr-2 h-4 w-4'>📍</span>
              <span>{application.class_location}</span>
            </div>
          )}

          {/* 教师 */}
          {application.teacher_info.teacher_name && (
            <div className='flex items-center'>
              <span className='mr-2 h-4 w-4'>👨‍🏫</span>
              <span>{application.teacher_info.teacher_name}</span>
            </div>
          )}

          {/* 教学周/节次 */}
          <div className='flex items-center'>
            <span className='mr-2 h-4 w-4'>📖</span>
            <span>
              {application.jxz ? `第${application.jxz}教学周` : '第17教学周'}{' '}
              3/4节
            </span>
          </div>
        </div>
      </div>

      {/* 请假信息 */}
      <div className='mb-3 rounded-lg bg-yellow-50 p-3'>
        <div className='mb-2 text-sm font-medium text-yellow-700'>请假信息</div>
        <div className='grid grid-cols-1 gap-2 text-sm text-yellow-600'>
          <div className='flex items-center'>
            <span className='w-16 font-medium'>类型：</span>
            <span>{getLeaveTypeText(application.leave_type)}</span>
          </div>
          <div className='flex items-center'>
            <span className='w-16 font-medium'>日期：</span>
            <span>{formatDate(application.leave_date)}</span>
          </div>
        </div>
      </div>

      {/* 请假原因 */}
      <div className='mb-3 rounded-lg bg-gray-50 p-3'>
        <div className='mb-2 text-sm font-medium text-gray-700'>请假原因</div>
        <div className='text-sm text-gray-600'>{application.leave_reason}</div>
      </div>

      {/* 附件 - 只保留查看按钮 */}
      {application.attachments && application.attachments.length > 0 && (
        <div className='mb-3 rounded-lg bg-yellow-50 p-3'>
          <div className='mb-2 text-sm font-medium text-yellow-700'>附件</div>
          <div className='space-y-2'>
            {application.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className='flex items-center justify-between rounded border bg-white p-2'
              >
                <div className='flex items-center space-x-2'>
                  <FileText className='h-4 w-4 text-gray-500' />
                  <div>
                    <div className='text-sm text-gray-700'>
                      {attachment.file_name}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {(attachment.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleViewAttachment(attachment.id)}
                  className='flex items-center space-x-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-600 hover:bg-blue-200'
                  title='查看附件'
                >
                  <Eye className='h-3 w-3' />
                  <span>查看</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='mb-3 flex items-center justify-between text-xs text-gray-500'>
        <span>申请时间：{formatDateTime(application.application_time)}</span>
        {application.approval_time && (
          <span>审批时间：{formatDateTime(application.approval_time)}</span>
        )}
      </div>

      {application.approval_comment && (
        <div className='mb-3 rounded-lg bg-blue-50 p-3'>
          <div className='mb-2 text-sm font-medium text-blue-700'>审批意见</div>
          <div className='text-sm text-blue-600'>
            {application.approval_comment}
          </div>
        </div>
      )}

      {/* 审批按钮 - 移除查看详情按钮 */}
      {application.status === 'pending' && (
        <div className='flex space-x-2'>
          <button
            onClick={() => handleApprove(application)}
            disabled={processingId === application.id}
            className='flex-1 rounded-lg bg-green-500 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50'
          >
            {processingId === application.id ? '处理中...' : '批准'}
          </button>
          <button
            onClick={() => handleReject(application)}
            disabled={processingId === application.id}
            className='flex-1 rounded-lg bg-red-500 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50'
          >
            {processingId === application.id ? '处理中...' : '拒绝'}
          </button>
        </div>
      )}
    </div>
  );

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
            <h1 className='ml-3 text-lg font-semibold'>请假审批</h1>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className='border-t'>
        <div className='flex'>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'pending'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            待审批 ({stats.pending_count})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'processed'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            已处理 ({stats.processed_count})
          </button>
        </div>
      </div>

      <div className='p-4'>
        {/* 错误提示 */}
        {error && (
          <div className='mb-4 rounded-lg bg-red-50 p-4'>
            <div className='flex items-center'>
              <AlertCircle className='mr-2 h-5 w-5 text-red-500' />
              <span className='text-sm text-red-700'>{error}</span>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && applications.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-center'>
              <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
              <p className='text-gray-600'>加载中...</p>
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className='rounded-lg bg-white p-8 text-center shadow-sm'>
            <FileText className='mx-auto mb-4 h-12 w-12 text-gray-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              {activeTab === 'pending' && '暂无待审批申请'}
              {activeTab === 'processed' && '暂无已处理申请'}
            </h3>
            <p className='text-gray-600'>
              {activeTab === 'pending' && '当前没有需要审批的请假申请'}
              {activeTab === 'processed' && '暂无已处理的请假申请'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {applications.map((application) => (
              <ApplicationCard
                key={`${application.id}-${application.approval_id}`}
                application={application}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
