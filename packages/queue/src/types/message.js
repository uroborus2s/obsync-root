/**
 * 消息相关类型定义
 */
// 消息状态
export var MessageStatus;
(function (MessageStatus) {
    MessageStatus["PENDING"] = "pending";
    MessageStatus["PROCESSING"] = "processing";
    MessageStatus["COMPLETED"] = "completed";
    MessageStatus["FAILED"] = "failed";
    MessageStatus["RETRYING"] = "retrying";
    MessageStatus["DEAD_LETTER"] = "dead_letter"; // 死信
})(MessageStatus || (MessageStatus = {}));
//# sourceMappingURL=message.js.map