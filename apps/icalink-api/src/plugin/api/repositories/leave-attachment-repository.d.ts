/**
 * 请假附件仓库
 * 处理请假附件的数据库操作
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, LeaveAttachmentEntity } from './types.js';
/**
 * 创建请假附件参数
 */
export interface CreateLeaveAttachmentParams {
    application_id: string;
    file_name: string;
    file_content: Buffer;
    file_size: number;
    file_type: string;
    storage_type?: 'file' | 'database';
}
/**
 * 请假附件仓库类
 */
export declare class LeaveAttachmentRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 创建请假附件
     */
    createLeaveAttachment(params: CreateLeaveAttachmentParams): Promise<LeaveAttachmentEntity>;
    /**
     * 根据ID获取请假附件
     */
    getLeaveAttachmentById(id: string): Promise<LeaveAttachmentEntity | null>;
    /**
     * 根据申请ID获取所有附件
     */
    getLeaveAttachmentsByApplicationId(applicationId: string): Promise<LeaveAttachmentEntity[]>;
    /**
     * 删除请假附件
     */
    deleteLeaveAttachment(id: string): Promise<boolean>;
    /**
     * 批量创建请假附件
     */
    batchCreateLeaveAttachments(attachments: CreateLeaveAttachmentParams[]): Promise<LeaveAttachmentEntity[]>;
}
//# sourceMappingURL=leave-attachment-repository.d.ts.map