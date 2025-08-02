/**
 * 请假申请相关类型定义
 */
/**
 * 请假类型枚举
 */
export var LeaveType;
(function (LeaveType) {
    LeaveType["SICK"] = "sick";
    LeaveType["PERSONAL"] = "personal";
    LeaveType["EMERGENCY"] = "emergency";
    LeaveType["OTHER"] = "other";
})(LeaveType || (LeaveType = {}));
/**
 * 申请状态枚举
 */
export var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "pending";
    ApplicationStatus["APPROVED"] = "approved";
    ApplicationStatus["REJECTED"] = "rejected";
})(ApplicationStatus || (ApplicationStatus = {}));
//# sourceMappingURL=leave-application.js.map