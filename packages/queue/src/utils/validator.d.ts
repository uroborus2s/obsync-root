/**
 * 参数验证工具
 */
import { ConsumerOptions, Message, ProducerConfig, QueueConfig } from '../types/index.js';
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface ValidationRule<T> {
    field: keyof T;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
    min?: number;
    max?: number;
    pattern?: RegExp;
    validator?: (value: any) => boolean;
    message?: string;
}
export declare class Validator {
    static validate<T>(data: T, rules: ValidationRule<T>[]): ValidationResult;
    private static validateType;
}
export declare const validateQueueConfig: (config: QueueConfig) => void;
export declare const validateProducerConfig: (config: ProducerConfig) => void;
export declare const validateConsumerOptions: (options: ConsumerOptions) => void;
export declare const validateMessage: <T>(message: Message<T>) => void;
export declare const validateQueueName: (name: string) => void;
export declare const validateRedisNode: (node: {
    host: string;
    port: number;
}) => void;
export declare const validateBatch: <T>(items: T[], validator: (item: T) => void) => void;
//# sourceMappingURL=validator.d.ts.map