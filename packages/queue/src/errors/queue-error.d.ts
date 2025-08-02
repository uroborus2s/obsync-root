/**
 * 队列相关错误定义
 */
export declare class QueueError extends Error {
    readonly code: string;
    readonly queue?: string;
    readonly messageId?: string;
    readonly details?: any;
    constructor(message: string, code: string, queue?: string, messageId?: string, details?: any);
    toJSON(): {
        name: string;
        message: string;
        code: string;
        queue: string | undefined;
        messageId: string | undefined;
        details: any;
        stack: string | undefined;
    };
}
export declare class QueueNotFoundError extends QueueError {
    constructor(queueName: string);
}
export declare class QueueAlreadyExistsError extends QueueError {
    constructor(queueName: string);
}
export declare class MessageSendError extends QueueError {
    constructor(message: string, queue?: string, messageId?: string, details?: any);
}
export declare class MessageReceiveError extends QueueError {
    constructor(message: string, queue?: string, messageId?: string, details?: any);
}
export declare class MessageAckError extends QueueError {
    constructor(message: string, queue?: string, messageId?: string, details?: any);
}
export declare class MessageSerializationError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class MessageDeserializationError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class ConsumerGroupError extends QueueError {
    constructor(message: string, queue?: string, groupName?: string, details?: any);
}
export declare class ConfigurationError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class QueueConfigurationError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class QueueOperationError extends QueueError {
    constructor(message: string, queue?: string, details?: any);
}
export declare class MessageValidationError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class MessageProcessingError extends QueueError {
    constructor(message: string, queue?: string, details?: any);
}
export declare class SerializationError extends QueueError {
    constructor(message: string, code: string, details?: any);
}
export declare class TimeoutError extends QueueError {
    constructor(operation: string, timeout: number, queue?: string);
}
export declare class MaxRetriesExceededError extends QueueError {
    constructor(maxRetries: number, queue?: string, messageId?: string);
}
export declare class QueueFullError extends QueueError {
    constructor(queueName: string, maxLength: number);
}
export declare class InvalidMessageError extends QueueError {
    constructor(message: string, details?: any);
}
export declare class PermissionError extends QueueError {
    constructor(operation: string, queue?: string);
}
export declare const createQueueError: {
    queueNotFound: (queueName: string) => QueueNotFoundError;
    queueAlreadyExists: (queueName: string) => QueueAlreadyExistsError;
    messageSend: (message: string, queue?: string, messageId?: string, details?: any) => MessageSendError;
    messageReceive: (message: string, queue?: string, messageId?: string, details?: any) => MessageReceiveError;
    messageAck: (message: string, queue?: string, messageId?: string, details?: any) => MessageAckError;
    serialization: (message: string, details?: any) => MessageSerializationError;
    deserialization: (message: string, details?: any) => MessageDeserializationError;
    consumerGroup: (message: string, queue?: string, groupName?: string, details?: any) => ConsumerGroupError;
    producer: (message: string, queue?: string, details?: any) => QueueError;
    consumer: (message: string, queue?: string, details?: any) => QueueError;
    sendFailed: (queue: string, reason: string) => QueueError;
    operationFailed: (queue: string, operation: string, reason: string) => QueueError;
    alreadyExists: (queue: string) => QueueError;
    invalidName: (reason: string) => QueueError;
    maxRetriesExceeded: (queue: string, attempts: number | string) => QueueError;
    configuration: (message: string, details?: any) => ConfigurationError;
    timeout: (operation: string, timeout: number, queue?: string) => QueueError;
    queueFull: (queueName: string, maxLength: number) => QueueFullError;
    invalidMessage: (message: string, details?: any) => InvalidMessageError;
    permission: (operation: string, queue?: string) => PermissionError;
};
//# sourceMappingURL=queue-error.d.ts.map