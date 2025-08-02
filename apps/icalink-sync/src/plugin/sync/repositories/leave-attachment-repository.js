/**
 * 请假附件仓库
 * 处理请假附件的数据库操作
 */
import { randomUUID } from 'crypto';
import { BaseRepository } from './base-repository.js';
/**
 * 请假附件仓库类
 */
export class LeaveAttachmentRepository extends BaseRepository {
    db;
    constructor(db, log) {
        super(log);
        this.db = db;
    }
    /**
     * 创建请假附件
     */
    async createLeaveAttachment(params) {
        try {
            const id = randomUUID().replace(/-/g, ''); // 去除连字符
            const now = new Date();
            this.log.debug({
                applicationId: params.application_id,
                fileName: params.file_name,
                fileSize: params.file_size,
                fileType: params.file_type
            }, '创建请假附件');
            // 验证文件大小（5MB限制）
            const maxFileSize = 5 * 1024 * 1024; // 5MB
            if (params.file_size > maxFileSize) {
                throw new Error('文件大小超过5MB限制');
            }
            // 验证文件类型
            const allowedTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'application/pdf'
            ];
            if (!allowedTypes.includes(params.file_type)) {
                throw new Error('不支持的文件类型');
            }
            await this.db
                .insertInto('icalink_leave_attachments')
                .values({
                id,
                application_id: params.application_id,
                file_name: params.file_name,
                file_path: undefined, // 使用数据库存储时不需要文件路径
                file_content: params.file_content,
                file_size: params.file_size,
                file_type: params.file_type,
                storage_type: params.storage_type || 'database',
                upload_time: now
            })
                .execute();
            const createdRecord = await this.getLeaveAttachmentById(id);
            if (!createdRecord) {
                throw new Error('创建请假附件后无法获取记录');
            }
            this.log.info({
                id,
                applicationId: params.application_id,
                fileName: params.file_name,
                fileSize: params.file_size
            }, '请假附件创建成功');
            return createdRecord;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                applicationId: params.application_id,
                fileName: params.file_name
            }, '创建请假附件失败');
            throw error;
        }
    }
    /**
     * 根据ID获取请假附件
     */
    async getLeaveAttachmentById(id) {
        try {
            this.log.debug({ id }, '根据ID获取请假附件');
            const result = await this.db
                .selectFrom('icalink_leave_attachments')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
            if (!result) {
                this.log.debug({ id }, '请假附件不存在');
                return null;
            }
            this.log.debug({ id, fileName: result.file_name }, '获取请假附件成功');
            return result;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                id
            }, '获取请假附件失败');
            throw error;
        }
    }
    /**
     * 根据申请ID获取所有附件
     */
    async getLeaveAttachmentsByApplicationId(applicationId) {
        try {
            this.log.debug({ applicationId }, '根据申请ID获取所有附件');
            const results = await this.db
                .selectFrom('icalink_leave_attachments')
                .selectAll()
                .where('application_id', '=', applicationId)
                .orderBy('upload_time', 'asc')
                .execute();
            this.log.debug({ applicationId, count: results.length }, '获取申请附件列表成功');
            return results;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                applicationId
            }, '获取申请附件列表失败');
            throw error;
        }
    }
    /**
     * 删除请假附件
     */
    async deleteLeaveAttachment(id) {
        try {
            this.log.debug({ id }, '删除请假附件');
            const result = await this.db
                .deleteFrom('icalink_leave_attachments')
                .where('id', '=', id)
                .execute();
            const deleted = result.length > 0;
            if (deleted) {
                this.log.info({ id }, '请假附件删除成功');
            }
            else {
                this.log.debug({ id }, '请假附件不存在，无需删除');
            }
            return deleted;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                id
            }, '删除请假附件失败');
            throw error;
        }
    }
    /**
     * 批量创建请假附件
     */
    async batchCreateLeaveAttachments(attachments) {
        try {
            this.log.debug({ count: attachments.length }, '批量创建请假附件');
            const now = new Date();
            const records = attachments.map((attachment) => ({
                id: randomUUID().replace(/-/g, ''), // 去除连字符
                application_id: attachment.application_id,
                file_name: attachment.file_name,
                file_path: undefined,
                file_content: attachment.file_content,
                file_size: attachment.file_size,
                file_type: attachment.file_type,
                storage_type: attachment.storage_type || 'database',
                upload_time: now
            }));
            // 验证所有文件
            const maxFileSize = 5 * 1024 * 1024; // 5MB
            const allowedTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'application/pdf'
            ];
            for (const record of records) {
                if (record.file_size > maxFileSize) {
                    throw new Error(`文件 ${record.file_name} 大小超过5MB限制`);
                }
                if (!allowedTypes.includes(record.file_type)) {
                    throw new Error(`文件 ${record.file_name} 类型不支持`);
                }
            }
            await this.db
                .insertInto('icalink_leave_attachments')
                .values(records)
                .execute();
            this.log.info({ createdCount: records.length }, '批量创建请假附件成功');
            // 返回创建的记录
            const createdRecords = records.map((record) => ({
                ...record,
                file_path: record.file_path || undefined,
                file_content: record.file_content || undefined,
                storage_type: record.storage_type
            }));
            return createdRecords;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                count: attachments.length
            }, '批量创建请假附件失败');
            throw error;
        }
    }
}
//# sourceMappingURL=leave-attachment-repository.js.map