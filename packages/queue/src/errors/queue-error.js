/**
 * 队列相关错误定义
 */
export class QueueError extends Error {
    code;
    queue;
    messageId;
    details;
    constructor(message, code, queue, messageId, details) {
        super(message);
        this.name = 'QueueError';
        this.code = code;
        this.queue = queue;
        this.messageId = messageId;
        this.details = details;
        // 确保错误堆栈正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, QueueError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            queue: this.queue,
            messageId: this.messageId,
            details: this.details,
            stack: this.stack
        };
    }
}
// 队列不存在错误
export class QueueNotFoundError extends QueueError {
    constructor(queueName) {
        super(`Queue '${queueName}' not found`, 'QUEUE_NOT_FOUND', queueName);
        this.name = 'QueueNotFoundError';
    }
}
// 队列已存在错误
export class QueueAlreadyExistsError extends QueueError {
    constructor(queueName) {
        super(`Queue '${queueName}' already exists`, 'QUEUE_ALREADY_EXISTS', queueName);
        this.name = 'QueueAlreadyExistsError';
    }
}
// 消息发送错误
export class MessageSendError extends QueueError {
    constructor(message, queue, messageId, details) {
        super(message, 'MESSAGE_SEND_ERROR', queue, messageId, details);
        this.name = 'MessageSendError';
    }
}
// 消息接收错误
export class MessageReceiveError extends QueueError {
    constructor(message, queue, messageId, details) {
        super(message, 'MESSAGE_RECEIVE_ERROR', queue, messageId, details);
        this.name = 'MessageReceiveError';
    }
}
// 消息确认错误
export class MessageAckError extends QueueError {
    constructor(message, queue, messageId, details) {
        super(message, 'MESSAGE_ACK_ERROR', queue, messageId, details);
        this.name = 'MessageAckError';
    }
}
// 消息序列化错误
export class MessageSerializationError extends QueueError {
    constructor(message, details) {
        super(message, 'MESSAGE_SERIALIZATION_ERROR', undefined, undefined, details);
        this.name = 'MessageSerializationError';
    }
}
// 消息反序列化错误
export class MessageDeserializationError extends QueueError {
    constructor(message, details) {
        super(message, 'MESSAGE_DESERIALIZATION_ERROR', undefined, undefined, details);
        this.name = 'MessageDeserializationError';
    }
}
// 消费者组错误
export class ConsumerGroupError extends QueueError {
    constructor(message, queue, groupName, details) {
        super(message, 'CONSUMER_GROUP_ERROR', queue, undefined, {
            groupName,
            ...details
        });
        this.name = 'ConsumerGroupError';
    }
}
// 配置错误
export class ConfigurationError extends QueueError {
    constructor(message, details) {
        super(message, 'CONFIGURATION_ERROR', undefined, undefined, details);
        this.name = 'ConfigurationError';
    }
}
// 队列配置错误
export class QueueConfigurationError extends QueueError {
    constructor(message, details) {
        super(message, 'QUEUE_CONFIGURATION_ERROR', undefined, undefined, details);
        this.name = 'QueueConfigurationError';
    }
}
// 队列操作错误
export class QueueOperationError extends QueueError {
    constructor(message, queue, details) {
        super(message, 'QUEUE_OPERATION_ERROR', queue, undefined, details);
        this.name = 'QueueOperationError';
    }
}
// 消息验证错误
export class MessageValidationError extends QueueError {
    constructor(message, details) {
        super(message, 'MESSAGE_VALIDATION_ERROR', undefined, undefined, details);
        this.name = 'MessageValidationError';
    }
}
// 消息处理错误
export class MessageProcessingError extends QueueError {
    constructor(message, queue, details) {
        super(message, 'MESSAGE_PROCESSING_ERROR', queue, undefined, details);
        this.name = 'MessageProcessingError';
    }
}
// 序列化错误
export class SerializationError extends QueueError {
    constructor(message, code, details) {
        super(message, code, undefined, undefined, details);
        this.name = 'SerializationError';
    }
}
// 超时错误
export class TimeoutError extends QueueError {
    constructor(operation, timeout, queue) {
        super(`Operation '${operation}' timed out after ${timeout}ms`, 'TIMEOUT_ERROR', queue, undefined, { operation, timeout });
        this.name = 'TimeoutError';
    }
}
// 重试次数超限错误
export class MaxRetriesExceededError extends QueueError {
    constructor(maxRetries, queue, messageId) {
        super(`Maximum retry attempts (${maxRetries}) exceeded`, 'MAX_RETRIES_EXCEEDED', queue, messageId, { maxRetries });
        this.name = 'MaxRetriesExceededError';
    }
}
// 队列满错误
export class QueueFullError extends QueueError {
    constructor(queueName, maxLength) {
        super(`Queue '${queueName}' is full (max length: ${maxLength})`, 'QUEUE_FULL', queueName, undefined, { maxLength });
        this.name = 'QueueFullError';
    }
}
// 无效消息错误
export class InvalidMessageError extends QueueError {
    constructor(message, details) {
        super(message, 'INVALID_MESSAGE', undefined, undefined, details);
        this.name = 'InvalidMessageError';
    }
}
// 权限错误
export class PermissionError extends QueueError {
    constructor(operation, queue) {
        super(`Permission denied for operation '${operation}' on queue '${queue}'`, 'PERMISSION_DENIED', queue, undefined, { operation });
        this.name = 'PermissionError';
    }
}
// 错误工厂函数
export const createQueueError = {
    queueNotFound: (queueName) => new QueueNotFoundError(queueName),
    queueAlreadyExists: (queueName) => new QueueAlreadyExistsError(queueName),
    messageSend: (message, queue, messageId, details) => new MessageSendError(message, queue, messageId, details),
    messageReceive: (message, queue, messageId, details) => new MessageReceiveError(message, queue, messageId, details),
    messageAck: (message, queue, messageId, details) => new MessageAckError(message, queue, messageId, details),
    serialization: (message, details) => new MessageSerializationError(message, details),
    deserialization: (message, details) => new MessageDeserializationError(message, details),
    consumerGroup: (message, queue, groupName, details) => new ConsumerGroupError(message, queue, groupName, details),
    producer: (message, queue, details) => new QueueError(message, 'PRODUCER_ERROR', queue, undefined, details),
    consumer: (message, queue, details) => new QueueError(message, 'CONSUMER_ERROR', queue, undefined, details),
    // 发送失败
    sendFailed: (queue, reason) => new QueueError(`Failed to send message to queue '${queue}': ${reason}`, 'SEND_FAILED', queue),
    // 操作失败
    operationFailed: (queue, operation, reason) => new QueueError(`Failed to ${operation} queue '${queue}': ${reason}`, 'OPERATION_FAILED', queue),
    // 队列已存在
    alreadyExists: (queue) => new QueueError(`Queue '${queue}' already exists`, 'QUEUE_ALREADY_EXISTS', queue),
    // 无效名称
    invalidName: (reason) => new QueueError(`Invalid queue name: ${reason}`, 'INVALID_QUEUE_NAME'),
    // 最大重试次数超出
    maxRetriesExceeded: (queue, attempts) => new QueueError(`Maximum retry attempts (${attempts}) exceeded for queue '${queue}'`, 'MAX_RETRIES_EXCEEDED', queue),
    configuration: (message, details) => new ConfigurationError(message, details),
    timeout: (operation, timeout, queue) => new QueueError(`Operation '${operation}' timed out after ${timeout}ms`, 'TIMEOUT_ERROR', queue),
    queueFull: (queueName, maxLength) => new QueueFullError(queueName, maxLength),
    invalidMessage: (message, details) => new InvalidMessageError(message, details),
    permission: (operation, queue) => new PermissionError(operation, queue)
};
//# sourceMappingURL=queue-error.js.map