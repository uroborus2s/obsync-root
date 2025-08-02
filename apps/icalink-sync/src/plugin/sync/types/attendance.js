/**
 * 签到相关类型定义
 */
/**
 * 签到状态枚举
 */
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["LEAVE"] = "leave";
    AttendanceStatus["PENDING_APPROVAL"] = "pending_approval";
    AttendanceStatus["LEAVE_PENDING"] = "leave_pending";
    AttendanceStatus["LEAVE_REJECTED"] = "leave_rejected"; // 请假申请已拒绝
})(AttendanceStatus || (AttendanceStatus = {}));
//# sourceMappingURL=attendance.js.map