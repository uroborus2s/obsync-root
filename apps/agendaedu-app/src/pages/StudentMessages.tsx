import { useToast } from '@/hooks/use-toast';
import {
  attendanceApi,
  type StudentLeaveApplicationItem
} from '@/lib/attendance-api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MapPin,
  RotateCcw,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function StudentMessages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<
    StudentLeaveApplicationItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'leave_pending' | 'leave' | 'leave_rejected'
  >('leave_pending');
  const [stats, setStats] = useState({
    total_count: 0,
    leave_pending_count: 0,
    leave_count: 0,
    leave_rejected_count: 0
  });
  const [withdrawingIds, setWithdrawingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const loadApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await attendanceApi.getStudentLeaveApplications({
        status: activeTab,
        page: 1,
        page_size: 50
      });
      if (response.success && response.data) {
        setApplications(response.data.applications);
        setStats(response.data.stats);
      } else {
        const errorMessage = response.message || '获取请假申请记录失败';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('加载申请记录失败:', error);
      const errorMessage = '网络错误，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 撤回请假申请
  const handleWithdrawLeave = async (applicationId: string) => {
    const isWithdrawing = withdrawingIds.has(applicationId);
    if (isWithdrawing) {
      return; // 防止重复点击
    }

    setWithdrawingIds((prev) => new Set(prev).add(applicationId));

    try {
      const response = await attendanceApi.studentWithdrawLeave(applicationId);

      if (response.success) {
        toast.success('请假申请撤回成功', {
          description: '已成功撤回您的请假申请'
        });
        // 重新加载申请列表
        await loadApplications();
      } else {
        toast.error(response.message || '撤回失败');
      }
    } catch (error) {
      console.error('撤回请假申请失败:', error);
      toast.error('撤回失败，请稍后重试');
    } finally {
      setWithdrawingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  // 检查是否可以撤回（课程开始时间之前且状态允许）
  const canWithdraw = (application: StudentLeaveApplicationItem): boolean => {
    // 检查状态是否允许撤回
    // 注意：后端返回的状态可能是 'approved'、'pending' 等
    const allowedStatuses = [
      'leave_pending',
      'leave_rejected',
      'leave',
      'approved', // 已批准状态
      'pending' // 待审批状态
    ] as const;

    if (!allowedStatuses.includes(application.status)) {
      console.log('🚫 撤回失败：状态不允许', application.status);
      return false;
    }

    // 检查课程开始时间
    const courseStartTime = application.course_info?.course_start_time;
    if (!courseStartTime) {
      console.log('🚫 撤回失败：没有课程开始时间', application.course_info);
      return false;
    }

    const now = new Date();
    // 处理 "YYYY-MM-DD HH:mm:ss" 格式的时间字符串
    // 确保正确解析为本地时间
    let startTime: Date;
    if (courseStartTime.includes('T')) {
      // ISO格式
      startTime = new Date(courseStartTime);
    } else {
      // "YYYY-MM-DD HH:mm:ss" 格式，需要转换为ISO格式
      startTime = new Date(courseStartTime.replace(' ', 'T'));
    }

    console.log('⏰ 撤回时间检查:', {
      applicationId: application.id,
      status: application.status,
      courseStartTime,
      now: now.toISOString(),
      startTime: startTime.toISOString(),
      nowLocal: now.toLocaleString('zh-CN'),
      startTimeLocal: startTime.toLocaleString('zh-CN'),
      canWithdraw: now < startTime
    });

    // 只有在课程开始时间之前才能撤回
    return now < startTime;
  };

  const getStatusIcon = (status: StudentLeaveApplicationItem['status']) => {
    switch (status) {
      case 'leave':
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case 'leave_rejected':
        return <XCircle className='h-5 w-5 text-red-500' />;
      case 'leave_pending':
        return <AlertCircle className='h-5 w-5 text-yellow-500' />;
    }
  };

  const getStatusText = (status: StudentLeaveApplicationItem['status']) => {
    switch (status) {
      case 'leave':
        return '已批准';
      case 'leave_rejected':
        return '已拒绝';
      case 'leave_pending':
        return '待审批';
    }
  };

  const getStatusColor = (status: StudentLeaveApplicationItem['status']) => {
    switch (status) {
      case 'leave':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'leave_rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'leave_pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getLeaveTypeText = (
    type: StudentLeaveApplicationItem['leave_type']
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

  const formatCourseTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatCourseDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${date.getMonth() + 1}月${date.getDate()}日 (周${weekday})`;
  };

  const getTabCount = (
    status: 'leave_pending' | 'leave' | 'leave_rejected'
  ) => {
    switch (status) {
      case 'leave_pending':
        return stats.leave_pending_count;
      case 'leave':
        return stats.leave_count;
      case 'leave_rejected':
        return stats.leave_rejected_count;
      default:
        return 0;
    }
  };

  const handleTabChange = (
    newTab: 'leave_pending' | 'leave' | 'leave_rejected'
  ) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const handleViewAttachment = async (
    attachmentId: string,
    fileName: string
  ) => {
    try {
      // 使用完整的API基础URL构建图片URL
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api';
      const imageUrl = `${baseUrl}/icalink/v1/attendance/attachments/${attachmentId}/image`;

      console.log('尝试查看附件:', {
        attachmentId,
        fileName,
        imageUrl,
        baseUrl
      });

      // 先测试图片是否可以访问
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        credentials: 'include' // 包含Cookie
      });

      console.log('HEAD请求响应:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type'),
        contentLength: response.headers.get('Content-Length'),
        cacheControl: response.headers.get('Cache-Control')
      });

      if (!response.ok) {
        console.error('附件访问失败:', {
          status: response.status,
          statusText: response.statusText,
          url: imageUrl
        });

        if (response.status === 404) {
          toast.error('附件不存在或已被删除');
        } else if (response.status === 403) {
          toast.error('没有权限查看此附件');
        } else {
          toast.error(`附件加载失败 (${response.status})`);
        }
        return;
      }

      // 检查Content-Type是否正确
      const contentType = response.headers.get('Content-Type');
      if (contentType && !contentType.startsWith('image/')) {
        console.warn('Content-Type不是图片类型:', contentType);
        toast.error('附件不是有效的图片格式');
        return;
      }

      // 直接获取blob数据并转换为Data URL
      console.log('开始获取图片blob数据...');

      const imageResponse = await fetch(imageUrl, {
        method: 'GET',
        credentials: 'include'
      });

      if (!imageResponse.ok) {
        console.error('获取图片数据失败:', imageResponse.status);
        toast.error('获取图片数据失败');
        return;
      }

      // 检查响应Content-Type，判断是否是JSON格式的Buffer
      const imageContentType = imageResponse.headers.get('Content-Type');
      console.log('响应Content-Type:', imageContentType);

      let blob: Blob;

      if (imageContentType && imageContentType.includes('application/json')) {
        // 处理JSON格式的Buffer数据
        console.log('检测到JSON响应，解析Buffer数据...');
        const jsonData = await imageResponse.json();

        if (jsonData.type === 'Buffer' && Array.isArray(jsonData.data)) {
          // 将数字数组转换为Uint8Array
          const uint8Array = new Uint8Array(jsonData.data);
          blob = new Blob([uint8Array], { type: 'image/png' });
          console.log('成功从JSON Buffer创建blob:', {
            originalSize: jsonData.data.length,
            blobSize: blob.size,
            type: blob.type
          });
        } else {
          throw new Error('无效的Buffer JSON格式');
        }
      } else {
        // 看起来是正常响应，但可能内容仍然是JSON格式的Buffer
        // 先尝试作为文本读取，检查是否是JSON
        const responseText = await imageResponse.text();

        try {
          // 尝试解析为JSON
          const jsonData = JSON.parse(responseText);

          if (jsonData.type === 'Buffer' && Array.isArray(jsonData.data)) {
            // 确实是JSON格式的Buffer，即使Content-Type说是image/png
            console.log(
              '虽然Content-Type是image/png，但内容是JSON Buffer，进行转换...'
            );
            const uint8Array = new Uint8Array(jsonData.data);
            blob = new Blob([uint8Array], { type: 'image/png' });
            console.log('成功从伪装的JSON Buffer创建blob:', {
              originalSize: jsonData.data.length,
              blobSize: blob.size,
              type: blob.type
            });
          } else {
            throw new Error('不是有效的Buffer JSON格式');
          }
        } catch (parseError) {
          // 不是JSON，说明真的是二进制数据，但已经被读取为文本了
          // 需要重新获取
          console.log('不是JSON，重新获取二进制数据...');
          const newResponse = await fetch(imageUrl, {
            method: 'GET',
            credentials: 'include'
          });
          blob = await newResponse.blob();
          console.log('获取到真正的blob数据:', {
            size: blob.size,
            type: blob.type
          });
        }
      }

      // 将blob转换为Data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      console.log('转换为Data URL成功，长度:', dataUrl.length);

      // 使用Data URL显示图片
      setSelectedImage({
        url: dataUrl,
        name: fileName
      });

      console.log('附件查看成功:', { fileName, dataUrlLength: dataUrl.length });
    } catch (error) {
      console.error('查看附件失败:', error);
      toast.error('查看附件失败，请稍后重试');
    }
  };

  // 截取文件名，如果超过30个字符则用...代替
  const truncateFileName = (fileName: string, maxLength: number = 25) => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return fileName.substring(0, maxLength) + '...';
  };

  // 渲染内容列表的组件
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-8'>
          <div className='text-center'>
            <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
            <p className='text-gray-600'>加载中...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex items-center justify-center py-8'>
          <div className='rounded-lg bg-white p-8 text-center shadow-sm'>
            <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>加载失败</h3>
            <p className='mb-4 text-gray-600'>{error}</p>
            <button
              onClick={loadApplications}
              className='rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    if (applications.length === 0) {
      return (
        <div className='rounded-lg bg-white p-8 text-center shadow-sm'>
          <FileText className='mx-auto mb-4 h-12 w-12 text-gray-400' />
          <h3 className='mb-2 text-lg font-medium text-gray-900'>
            暂无申请记录
          </h3>
          <p className='text-gray-600'>
            暂无
            {activeTab === 'leave_pending'
              ? '待审批'
              : activeTab === 'leave'
                ? '已批准'
                : '已拒绝'}
            的申请
          </p>
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        {applications.map((application) => (
          <div
            key={application.id}
            className='rounded-lg bg-white p-4 shadow-sm'
          >
            {/* 申请头部 */}
            <div className='mb-3 flex items-start justify-between'>
              <div className='flex-1'>
                <h3 className='font-medium text-gray-900'>
                  {application.course_info?.kcmc || application.course_name}
                </h3>
                <div className='mt-1 flex items-center text-sm text-gray-500'>
                  <Calendar className='mr-1 h-4 w-4' />
                  {application.course_info?.course_start_time
                    ? formatCourseDate(
                        application.course_info.course_start_time
                      )
                    : application.class_date}
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                    application.status
                  )}`}
                >
                  {getStatusIcon(application.status)}
                  <span className='ml-1'>
                    {getStatusText(application.status)}
                  </span>
                </span>
              </div>
            </div>

            {/* 课程信息 */}
            <div className='mb-3 space-y-2 text-sm text-gray-600'>
              <div className='flex items-center'>
                <Clock className='mr-2 h-4 w-4 text-gray-400' />
                <span>
                  {application.course_info?.course_start_time &&
                  application.course_info?.course_end_time
                    ? formatCourseTime(
                        application.course_info.course_start_time,
                        application.course_info.course_end_time
                      )
                    : application.class_time}
                </span>
                {application.course_info?.jc_s && (
                  <span className='ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600'>
                    第{application.course_info.jc_s}节
                  </span>
                )}
              </div>

              {(application.course_info?.room_s ||
                application.class_location) && (
                <div className='flex items-center'>
                  <MapPin className='mr-2 h-4 w-4 text-gray-400' />
                  <span>
                    {application.course_info?.lq && (
                      <span className='text-gray-500'>
                        {application.course_info.lq}{' '}
                      </span>
                    )}
                    {application.course_info?.room_s ||
                      application.class_location}
                  </span>
                </div>
              )}

              <div className='flex items-center'>
                <User className='mr-2 h-4 w-4 text-gray-400' />
                <span>
                  {application.course_info?.xm_s || application.teacher_name}
                </span>
              </div>

              {application.course_info?.jxz && (
                <div className='flex items-center'>
                  <Calendar className='mr-2 h-4 w-4 text-gray-400' />
                  <span>第{application.course_info.jxz}教学周</span>
                </div>
              )}
            </div>

            {/* 请假信息 */}
            <div className='mb-3 rounded-lg bg-gray-50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>
                  请假类型：{getLeaveTypeText(application.leave_type)}
                </span>
              </div>
              <p className='text-sm text-gray-600'>
                {application.leave_reason}
              </p>
            </div>

            {/* 附件信息 */}
            {application.attachments && application.attachments.length > 0 && (
              <div className='mb-3 rounded-lg bg-yellow-50 p-3'>
                <div className='mb-2 text-sm font-medium text-yellow-700'>
                  附件：
                </div>
                <div className='space-y-1'>
                  {application.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className='flex items-center justify-between rounded bg-white p-2'
                    >
                      <div className='flex items-center space-x-2'>
                        <FileText className='h-4 w-4 text-gray-500' />
                        <span className='text-sm text-gray-700'>
                          {truncateFileName(attachment.file_name)}
                        </span>
                        <span className='text-xs text-gray-500'>
                          ({Math.round(attachment.file_size / 1024)}KB)
                        </span>
                      </div>
                      <div className='flex space-x-1'>
                        <button
                          onClick={() =>
                            handleViewAttachment(
                              attachment.id,
                              attachment.file_name
                            )
                          }
                          className='rounded p-1 hover:bg-gray-100'
                          title='查看图片'
                        >
                          <Eye className='h-4 w-4 text-blue-500' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 审批信息 */}
            {application.approvals && application.approvals.length > 0 && (
              <div className='mb-3 rounded-lg bg-blue-50 p-3'>
                <div className='mb-2 text-sm font-medium text-blue-700'>
                  审批记录：
                </div>
                <div className='space-y-2'>
                  {application.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className='rounded bg-white p-2 text-sm'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-medium text-gray-700'>
                          {approval.approver_name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            approval.approval_result === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : approval.approval_result === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : approval.approval_result === 'cancelled'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {approval.approval_result === 'approved'
                            ? '已批准'
                            : approval.approval_result === 'rejected'
                              ? '已拒绝'
                              : approval.approval_result === 'cancelled'
                                ? '已取消'
                                : '待审批'}
                        </span>
                      </div>
                      {approval.approval_comment && (
                        <div className='mt-1 text-gray-600'>
                          意见：{approval.approval_comment}
                        </div>
                      )}
                      {approval.approval_time && (
                        <div className='mt-1 text-xs text-gray-500'>
                          审批时间：{formatDateTime(approval.approval_time)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div className='flex items-center justify-between text-xs text-gray-500'>
              <span>
                申请时间：{formatDateTime(application.application_time)}
              </span>
              {application.approval_time && (
                <span>
                  审批时间：{formatDateTime(application.approval_time)}
                </span>
              )}
            </div>

            {/* 审批意见 */}
            {application.approval_comment && (
              <div className='mt-3 rounded-lg bg-blue-50 p-3'>
                <div className='text-sm font-medium text-blue-700'>
                  审批意见：
                </div>
                <div className='text-sm text-blue-600'>
                  {application.approval_comment}
                </div>
              </div>
            )}

            {/* 撤回按钮 - 移到卡片底部，更加醒目 */}
            {canWithdraw(application) && (
              <div className='mt-4 border-t border-gray-200 pt-3'>
                <button
                  onClick={() => handleWithdrawLeave(application.id)}
                  disabled={withdrawingIds.has(application.id)}
                  className='flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                  title='撤回请假申请'
                >
                  {withdrawingIds.has(application.id) ? (
                    <>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent'></div>
                      <span>撤回中...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className='h-4 w-4' />
                      <span>撤回申请</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header - 固定不变 */}
      <div className='bg-white shadow-sm'>
        <div className='flex items-center px-4 py-4'>
          <button
            onClick={() => navigate(-1)}
            className='rounded-lg p-2 hover:bg-gray-100'
            aria-label='返回'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='ml-3 text-lg font-semibold'>申请状态</h1>
        </div>
      </div>

      <div className='mx-auto max-w-md p-4'>
        {/* 状态标签页 - 只保留三个tab */}
        <div className='mb-6 rounded-lg bg-white p-1 shadow-sm'>
          <div className='grid grid-cols-3 gap-1'>
            {[
              { key: 'leave_pending', label: '待审批' },
              { key: 'leave', label: '已批准' },
              { key: 'leave_rejected', label: '已拒绝' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  handleTabChange(
                    tab.key as 'leave_pending' | 'leave' | 'leave_rejected'
                  )
                }
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {getTabCount(
                  tab.key as 'leave_pending' | 'leave' | 'leave_rejected'
                ) > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                      activeTab === tab.key
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {getTabCount(
                      tab.key as 'leave_pending' | 'leave' | 'leave_rejected'
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 - 只有这部分会根据tab切换而更新 */}
        {renderContent()}
      </div>

      {/* 图片查看模态框 */}
      {selectedImage && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75'>
          <div className='relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white'>
            <div className='flex items-center justify-between border-b p-4'>
              <h3 className='text-lg font-medium text-gray-900'>
                {selectedImage.name}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className='rounded-lg p-1 hover:bg-gray-100'
                title='关闭'
                aria-label='关闭图片查看器'
              >
                <XCircle className='h-5 w-5' />
              </button>
            </div>
            <div className='p-4'>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className='max-h-[70vh] max-w-full object-contain'
                onError={(e) => {
                  console.error(
                    'Data URL图片加载失败，这通常不应该发生:',
                    selectedImage.url.substring(0, 100) + '...'
                  );
                  // 显示错误占位图
                  e.currentTarget.src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4=';
                  toast.error('图片数据格式错误');
                }}
                onLoad={() => {
                  console.log('Data URL图片加载成功');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
