/**
 * 日志工具
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: any;
    error?: Error;
    queue?: string;
    messageId?: string;
    operation?: string;
}
export interface LoggerConfig {
    level: LogLevel;
    format: 'json' | 'text';
    output: 'console' | 'file' | 'both';
    filename?: string;
    maxFileSize?: number;
    maxFiles?: number;
    includeStack?: boolean;
}
export declare class Logger {
    private config;
    private context;
    constructor(config?: Partial<LoggerConfig>);
    setContext(context: any): void;
    clearContext(): void;
    debug(message: string, context?: any): void;
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, error?: Error, context?: any): void;
    fatal(message: string, error?: Error, context?: any): void;
    private log;
    private output;
    private format;
    private formatJson;
    private formatText;
    private outputToConsole;
    private outputToFile;
    child(context: any): Logger;
}
export declare const defaultLogger: Logger;
export declare const createLogger: (config?: Partial<LoggerConfig>) => Logger;
export declare const createQueueLogger: (queueName: string, config?: Partial<LoggerConfig>) => Logger;
export declare const createOperationLogger: (operation: string, config?: Partial<LoggerConfig>) => Logger;
//# sourceMappingURL=logger.d.ts.map