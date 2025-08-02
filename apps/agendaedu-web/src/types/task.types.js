/**
 * 任务状态枚举
 */
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["PAUSED"] = "paused";
    TaskStatus["SUCCESS"] = "success";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
    TaskStatus["TIMEOUT"] = "timeout";
})(TaskStatus || (TaskStatus = {}));
//# sourceMappingURL=task.types.js.map