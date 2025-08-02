/**
 * 考勤状态枚举
 */
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["LEAVE"] = "leave";
    AttendanceStatus["LATE"] = "late";
    AttendanceStatus["EARLY"] = "early";
})(AttendanceStatus || (AttendanceStatus = {}));
/**
 * 课程状态枚举
 */
export var CourseStatus;
(function (CourseStatus) {
    CourseStatus["NOT_STARTED"] = "not_started";
    CourseStatus["IN_PROGRESS"] = "in_progress";
    CourseStatus["FINISHED"] = "finished";
})(CourseStatus || (CourseStatus = {}));
//# sourceMappingURL=attendance.types.js.map