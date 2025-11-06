import { addMinutes, isAfter, isBefore, isEqual, subMinutes } from 'date-fns';

// 定义从后端获取的完整数据结构
export interface BackendAttendanceData {
  id: number;
  attendance_record_id?: number; // 考勤记录ID，用于请假申请和撤回请假
  course: {
    external_id: string;
    kcmc: string; // 课程名称
    course_start_time: string;
    course_end_time: string;
    room_s: string; // 教室
    xm_s: string; // 教师姓名
    jc_s: string; // 节次
    jxz: number; // 教学周
    lq: string; // 楼区
    rq?: string;
    need_checkin: number; // 0: 无需签到, 1: 需要签到
  };
  student: {
    xh: string; // 学号
    xm: string; // 姓名
    bjmc: string; // 班级名称
    zymc: string; // 专业名称
  };
  final_status?:
    | 'truant'
    | 'present'
    | 'absent'
    | 'leave'
    | 'leave_pending'
    | 'pending_approval'
    | 'late';
  pending_status?: 'leave' | 'leave_pending' | 'unstarted';
  live_status?:
    | 'truant'
    | 'present'
    | 'absent'
    | 'leave'
    | 'leave_pending'
    | 'pending_approval'
    | 'late';
  verification_windows?: {
    id: number;
    window_id: string;
    course_id: number;
    verification_round: number;
    open_time: string; // Changed to string to match backend typical ISO format
    duration_minutes: number;
    attendance_record?: {
      id: number;
      checkin_time: string; // Changed to string
      status: string;
      last_checkin_source: string;
      last_checkin_reason: string;
      window_id: string;
    };
  };
  metadata?: {
    photo_url?: string;
    location_offset_distance?: number;
    reason?: string;
  };
}

// 定义UI渲染所需的状态对象结构
export interface DisplayState {
  statusText: string;
  statusIcon: string;
  statusColor: string;
  subText: string | null;
  showCheckInButton: boolean;
  checkInButtonDisabled: boolean;
  checkInButtonText: string;
  showLeaveButton: boolean;
  leaveButtonDisabled: boolean;
  leaveButtonText: string;
  statusType: 'final' | 'pending' | 'live' | 'default';
  uiCategory:
    | 'textOnly'
    | 'leaveCheckinDisabled'
    | 'leaveCheckinEnabled'
    | 'checkinOnly'; // New field
  updateStatusField: 'final_status' | 'pending_status' | 'live_status' | null; // New field
}

const initialDisplayState: DisplayState = {
  statusText: '加载中...',
  statusIcon: '⏳',
  statusColor: 'text-gray-600',
  subText: null,
  showCheckInButton: false,
  checkInButtonDisabled: true,
  checkInButtonText: '签到',
  showLeaveButton: false,
  leaveButtonDisabled: true,
  leaveButtonText: '请假',
  statusType: 'default',
  uiCategory: 'textOnly',
  updateStatusField: null
};

/**
 * 根据后端返回的数据和当前时间，决定前端UI的显示状态
 * @param data - 从后端 /complete 接口获取的数据
 * @param now - 当前时间Date对象
 * @returns DisplayState - 用于驱动UI渲染的状态对象
 */
export function determineDisplayState(
  data: BackendAttendanceData | null,
  now: Date
): DisplayState {
  if (!data) {
    return {
      ...initialDisplayState,
      statusText: '暂无课程数据',
      subText: '无法获取签到详情，请检查网络或刷新页面。',
      statusType: 'default',
      uiCategory: 'textOnly',
      updateStatusField: null
    };
  }

  const {
    live_status,
    final_status,
    pending_status,
    course,
    verification_windows
  } = data;
  const courseStartTime = new Date(course.course_start_time);

  // 【最高优先级】检查是否需要签到
  if (course.need_checkin === 0) {
    return {
      ...initialDisplayState,
      statusText: '无需签到',
      statusIcon: '✓',
      statusColor: 'text-gray-600',
      subText: '本课程无需签到。',
      showCheckInButton: false,
      showLeaveButton: false,
      statusType: 'final',
      uiCategory: 'textOnly',
      updateStatusField: null
    };
  }

  // 1. 最高优先级：final_status
  if (final_status) {
    switch (final_status) {
      case 'present':
        return {
          ...initialDisplayState,
          statusText: '已签到',
          statusIcon: '✓',
          statusColor: 'text-green-600',
          subText: '您已完成本次签到。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'absent':
        return {
          ...initialDisplayState,
          statusText: '缺勤',
          statusIcon: '⚠️',
          statusColor: 'text-red-600',
          subText: '您本次签到被标记为缺勤。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'truant':
        return {
          ...initialDisplayState,
          statusText: '旷课',
          statusIcon: '🚫',
          statusColor: 'text-red-800',
          subText: '您本次签到被标记为旷课。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'leave':
        return {
          ...initialDisplayState,
          statusText: '已请假',
          statusIcon: '📝',
          statusColor: 'text-orange-600',
          subText: '您的请假申请已通过。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'leave_pending':
        return {
          ...initialDisplayState,
          statusText: '请假审批中',
          statusIcon: '⏳',
          statusColor: 'text-yellow-600',
          subText: '您的请假申请正在等待审批。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'pending_approval':
        return {
          ...initialDisplayState,
          statusText: '签到审批中',
          statusIcon: '⏳',
          statusColor: 'text-blue-600',
          subText: '您的签到正在等待教师确认，请及时提醒老师确认。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'final',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
    }
  }

  // 2. 中等优先级：pending_status
  if (pending_status) {
    switch (pending_status) {
      case 'leave':
        return {
          ...initialDisplayState,
          statusText: '已请假',
          statusIcon: '📝',
          statusColor: 'text-orange-600',
          subText: '您的请假申请已通过。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'pending',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'leave_pending':
        return {
          ...initialDisplayState,
          statusText: '请假审批中',
          statusIcon: '⏳',
          statusColor: 'text-yellow-600',
          subText: '您的请假申请正在等待审批。',
          showCheckInButton: false,
          showLeaveButton: false,
          statusType: 'pending',
          uiCategory: 'textOnly',
          updateStatusField: null
        };
      case 'unstarted':
        return {
          ...initialDisplayState,
          statusText: '尚未开始',
          statusIcon: '⏰',
          statusColor: 'text-blue-600',
          subText: '课程尚未开始，您可以提前申请请假。',
          showCheckInButton: false,
          showLeaveButton: true,
          leaveButtonDisabled: false,
          leaveButtonText: '请假',
          statusType: 'pending',
          uiCategory: 'leaveCheckinDisabled',
          updateStatusField: 'pending_status'
        };
    }
  }

  // 3. 最低优先级：live_status (结合时间窗口)
  if (live_status) {
    // 3.1 请假状态优先
    if (live_status === 'leave') {
      return {
        ...initialDisplayState,
        statusText: '已请假',
        statusIcon: '📝',
        statusColor: 'text-orange-600',
        subText: '您的请假申请已通过。',
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }
    if (live_status === 'leave_pending') {
      return {
        ...initialDisplayState,
        statusText: '请假审批中',
        statusIcon: '⏳',
        statusColor: 'text-yellow-600',
        subText: '您的请假申请正在等待审批。',
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }
    if (live_status === 'pending_approval') {
      return {
        ...initialDisplayState,
        statusText: '签到审核中',
        statusIcon: '⏳',
        statusColor: 'text-blue-600',
        subText: '您的签到申请已提交，请提醒教师审批',
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }

    const preCheckinStart = subMinutes(courseStartTime, 10);
    const checkinGracePeriodEnd = addMinutes(courseStartTime, 10);

    // 补签窗口信息
    const makeupWindowOpenTime = verification_windows?.open_time
      ? new Date(verification_windows.open_time)
      : null;
    const makeupWindowDuration = verification_windows?.duration_minutes || 2; // Default to 2 minutes
    const makeupWindowEndTime = makeupWindowOpenTime
      ? addMinutes(makeupWindowOpenTime, makeupWindowDuration)
      : null;
    const isInMakeupWindow =
      makeupWindowOpenTime &&
      makeupWindowEndTime &&
      isAfter(now, makeupWindowOpenTime) &&
      isBefore(now, makeupWindowEndTime);
    const hasCheckedInWindow =
      verification_windows?.attendance_record?.window_id ===
      verification_windows?.window_id;

    // 3.2 签到未开始 (提前10分钟以上)
    if (isBefore(now, preCheckinStart)) {
      return {
        ...initialDisplayState,
        statusText: '未到签到时间',
        statusIcon: '⏰',
        statusColor: 'text-gray-600',
        subText: `签到将于 ${preCheckinStart.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 开始`,
        showCheckInButton: false,
        checkInButtonDisabled: true,
        checkInButtonText: '不在签到时间',
        showLeaveButton: true,
        leaveButtonDisabled: false,
        leaveButtonText: '请假',
        statusType: 'live',
        uiCategory: 'leaveCheckinDisabled',
        updateStatusField: 'live_status'
      };
    }

    // New: 窗口内已签
    if (live_status === 'present' && isInMakeupWindow && hasCheckedInWindow) {
      return {
        ...initialDisplayState,
        statusText: '已签到',
        statusIcon: '✅', // Changed icon
        statusColor: 'text-green-500',
        subText: '您已在补签窗口内完成签到。',
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }

    // 3.3 已签到 (非窗口期)
    if (live_status === 'present' && !isInMakeupWindow) {
      return {
        ...initialDisplayState,
        statusText: '已签到',
        statusIcon: '✓',
        statusColor: 'text-green-600',
        subText: '您已完成本次签到。',
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }

    // 3.4 签到预备期 (提前10分钟内) 且 状态为缺勤
    if (
      (isAfter(now, preCheckinStart) || isEqual(now, preCheckinStart)) &&
      isBefore(now, courseStartTime) &&
      live_status === 'absent'
    ) {
      return {
        ...initialDisplayState,
        statusText: '即将开始签到',
        statusIcon: '🏃',
        statusColor: 'text-blue-600',
        subText: '签到已开放，请准备签到。',
        showCheckInButton: true,
        checkInButtonDisabled: false,
        checkInButtonText: '签到',
        showLeaveButton: true,
        leaveButtonDisabled: false,
        leaveButtonText: '请假',
        statusType: 'live',
        uiCategory: 'leaveCheckinEnabled',
        updateStatusField: 'live_status'
      };
    }

    // 3.5 签到开始后10分钟内 且 状态为缺勤
    if (
      (isAfter(now, courseStartTime) || isEqual(now, courseStartTime)) &&
      isBefore(now, checkinGracePeriodEnd) &&
      live_status === 'absent'
    ) {
      return {
        ...initialDisplayState,
        statusText: '请立即签到',
        statusIcon: '🚨',
        statusColor: 'text-red-600',
        subText: `签到将在 ${checkinGracePeriodEnd.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 结束`,
        showCheckInButton: true,
        checkInButtonDisabled: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'checkinOnly',
        updateStatusField: 'live_status'
      };
    }

    // 3.6 补签窗口期
    if (isInMakeupWindow && !hasCheckedInWindow) {
      return {
        ...initialDisplayState,
        statusText: '补签进行中',
        statusIcon: '🏃',
        statusColor: 'text-yellow-600',
        subText: `补签将在 ${makeupWindowEndTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 结束`,
        showCheckInButton: true,
        checkInButtonDisabled: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'checkinOnly',
        updateStatusField: 'live_status'
      };
    }

    // 3.7 缺勤状态和旷课状态
    if (live_status === 'absent' || live_status === 'truant') {
      return {
        ...initialDisplayState,
        statusText: live_status === 'absent' ? '缺勤' : '旷课',
        statusIcon: live_status === 'absent' ? '❌' : '🚫',
        statusColor: live_status === 'absent' ? 'text-red-600' : 'text-red-800',
        subText: `您本次签到被标记为${live_status === 'absent' ? '缺勤' : '旷课'}。`,
        showCheckInButton: false,
        showLeaveButton: false,
        statusType: 'live',
        uiCategory: 'textOnly',
        updateStatusField: null
      };
    }
  }

  // 兜底状态：如果所有逻辑都不匹配，则显示一个通用状态
  return {
    ...initialDisplayState,
    statusText: '签到已结束',
    statusIcon: '🛑',
    statusColor: 'text-gray-700',
    subText: '本次课程的签到时间已过。',
    showCheckInButton: false,
    checkInButtonDisabled: true,
    checkInButtonText: '签到已结束',
    showLeaveButton: false,
    leaveButtonDisabled: true,
    leaveButtonText: '请假已截止',
    statusType: 'default',
    uiCategory: 'textOnly',
    updateStatusField: null
  };
}
