/**
 * 日志工具
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (LogLevel = {}));
export class Logger {
    config;
    context = {};
    constructor(config = {}) {
        this.config = {
            level: LogLevel.INFO,
            format: 'json',
            output: 'console',
            includeStack: true,
            ...config
        };
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    clearContext() {
        this.context = {};
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    error(message, error, context) {
        this.log(LogLevel.ERROR, message, context, error);
    }
    fatal(message, error, context) {
        this.log(LogLevel.FATAL, message, context, error);
    }
    log(level, message, context, error) {
        if (level < this.config.level) {
            return;
        }
        const entry = {
            level,
            message,
            timestamp: Date.now(),
            context: { ...this.context, ...context },
            error,
            queue: context?.queue,
            messageId: context?.messageId,
            operation: context?.operation
        };
        this.output(entry);
    }
    output(entry) {
        const formatted = this.format(entry);
        if (this.config.output === 'console' || this.config.output === 'both') {
            this.outputToConsole(entry.level, formatted);
        }
        if (this.config.output === 'file' || this.config.output === 'both') {
            this.outputToFile(formatted);
        }
    }
    format(entry) {
        if (this.config.format === 'json') {
            return this.formatJson(entry);
        }
        else {
            return this.formatText(entry);
        }
    }
    formatJson(entry) {
        const logObject = {
            timestamp: new Date(entry.timestamp).toISOString(),
            level: LogLevel[entry.level],
            message: entry.message,
            ...entry.context
        };
        if (entry.queue) {
            logObject.queue = entry.queue;
        }
        if (entry.messageId) {
            logObject.messageId = entry.messageId;
        }
        if (entry.operation) {
            logObject.operation = entry.operation;
        }
        if (entry.error) {
            logObject.error = {
                name: entry.error.name,
                message: entry.error.message,
                ...(this.config.includeStack && { stack: entry.error.stack })
            };
        }
        return JSON.stringify(logObject);
    }
    formatText(entry) {
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = LogLevel[entry.level].padEnd(5);
        let message = `${timestamp} [${level}] ${entry.message}`;
        if (entry.queue) {
            message += ` queue=${entry.queue}`;
        }
        if (entry.messageId) {
            message += ` messageId=${entry.messageId}`;
        }
        if (entry.operation) {
            message += ` operation=${entry.operation}`;
        }
        if (entry.context && Object.keys(entry.context).length > 0) {
            message += ` context=${JSON.stringify(entry.context)}`;
        }
        if (entry.error) {
            message += `\nError: ${entry.error.message}`;
            if (this.config.includeStack && entry.error.stack) {
                message += `\n${entry.error.stack}`;
            }
        }
        return message;
    }
    outputToConsole(level, message) {
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(message);
                break;
            case LogLevel.INFO:
                console.info(message);
                break;
            case LogLevel.WARN:
                console.warn(message);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(message);
                break;
        }
    }
    outputToFile(message) {
        // 文件输出实现（简化版）
        // 在实际项目中可以使用 fs 模块或日志库如 winston
        if (typeof process !== 'undefined' && process.stdout) {
            process.stdout.write(message + '\n');
        }
    }
    // 创建子logger
    child(context) {
        const childLogger = new Logger(this.config);
        childLogger.setContext({ ...this.context, ...context });
        return childLogger;
    }
}
// 默认logger实例
export const defaultLogger = new Logger({
    level: LogLevel.INFO,
    format: 'json',
    output: 'console'
});
// 便捷函数
export const createLogger = (config) => {
    return new Logger(config);
};
// 队列专用logger
export const createQueueLogger = (queueName, config) => {
    const logger = new Logger(config);
    logger.setContext({ queue: queueName });
    return logger;
};
// 操作专用logger
export const createOperationLogger = (operation, config) => {
    const logger = new Logger(config);
    logger.setContext({ operation });
    return logger;
};
//# sourceMappingURL=logger.js.map