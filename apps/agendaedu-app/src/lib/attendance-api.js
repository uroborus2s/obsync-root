/**
 * 考勤API服务模块
 * 基于@stratix/icalink的attendance.controller.ts接口
 */
import { API_CONFIG } from '@/config/api-config';
import { ApiClient } from './api-client';
/**
 * 考勤API服务类
 */
export class AttendanceApiService {
    apiClient;
    constructor(baseUrl) {
        this.apiClient = new ApiClient(baseUrl || API_CONFIG.baseUrl);
    }
    /**
     * 获取学生签到记录
     */
    async getStudentAttendanceRecord(attendanceId) {
        const response = await this.apiClient.get(`/attendance/${attendanceId}/record?type=student`);
        return {
            success: !!response.success,
            message: response.message,
            data: response.data
        };
    }
    /**
     * 获取教师签到记录
     */
    async getTeacherAttendanceRecord(attendanceId) {
        const response = await this.apiClient.get(`/attendance/${attendanceId}/record?type=teacher`);
        return response.data;
    }
    /**
     * 学生签到
     */
    async studentCheckIn(attendanceRecordId, request) {
        const response = await this.apiClient.post(`/attendance/${encodeURIComponent(attendanceRecordId)}/checkin`, request);
        return {
            success: !!response.success,
            message: response.message || '签到完成',
            data: response.data
        };
    }
    /**
     * 学生请假
     */
    async studentLeave(request) {
        const response = await this.apiClient.post('/attendance/leave', request);
        return {
            success: !!response.success,
            message: response.message,
            data: response.data
        };
    }
    /**
     * 学生查询请假申请
     */
    async getStudentLeaveApplications(params) {
        const queryString = params
            ? new URLSearchParams(Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = String(value);
                }
                return acc;
            }, {})).toString()
            : '';
        const url = queryString
            ? `/attendance/leave-applications?${queryString}`
            : '/attendance/leave-applications';
        const response = await this.apiClient.get(url);
        return response;
    }
    /**
     * 教师查询请假申请
     */
    async getTeacherLeaveApplications(params) {
        const queryString = params
            ? new URLSearchParams(Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = String(value);
                }
                return acc;
            }, {})).toString()
            : '';
        const url = queryString
            ? `/attendance/teacher-leave-applications?${queryString}`
            : '/attendance/teacher-leave-applications';
        const response = await this.apiClient.get(url);
        return response;
    }
    /**
     * 教师审批请假申请
     */
    async teacherApproveLeave(request) {
        const response = await this.apiClient.post('/attendance/teacher-approve-leave', request);
        return response;
    }
    /**
     * 查看请假申请附件
     */
    async viewLeaveAttachment(attachmentId) {
        const response = await this.apiClient.get(`/attendance/attachments/${attachmentId}/view`);
        return response.data;
    }
    /**
     * 下载请假申请附件
     */
    async downloadLeaveAttachment(attachmentId) {
        const response = await fetch(`${this.apiClient['baseUrl']}/attendance/attachments/${attachmentId}/download`, {
            headers: {
                Authorization: `Bearer ${await this.getAccessToken()}`
            }
        });
        if (!response.ok) {
            throw new Error(`下载失败: ${response.statusText}`);
        }
        return response.blob();
    }
    /**
     * 获取课程历史考勤数据
     */
    async getCourseAttendanceHistory(kkh, params) {
        try {
            const queryParams = new URLSearchParams();
            if (params?.xnxq)
                queryParams.append('xnxq', params.xnxq);
            if (params?.start_date)
                queryParams.append('start_date', params.start_date);
            if (params?.end_date)
                queryParams.append('end_date', params.end_date);
            const url = `/attendance/course/${encodeURIComponent(kkh)}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await this.apiClient.get(url);
            // 处理API客户端的响应格式
            if (response.success && response.data) {
                return {
                    success: true,
                    data: response.data
                };
            }
            else {
                throw new Error(response.message || '获取课程历史考勤数据失败');
            }
        }
        catch (error) {
            console.error('获取课程历史考勤数据失败:', error);
            throw error;
        }
    }
    /**
     * 获取个人课程统计
     */
    async getPersonalCourseStats(kkh, params) {
        try {
            const queryParams = new URLSearchParams();
            if (params?.xnxq) {
                queryParams.append('xnxq', params.xnxq);
            }
            const queryString = queryParams.toString();
            const url = `/attendance/course/${kkh}/stats${queryString ? `?${queryString}` : ''}`;
            const response = await this.apiClient.get(url);
            return response;
        }
        catch (error) {
            console.error('获取个人课程统计失败:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : '获取个人课程统计失败'
            };
        }
    }
    /**
     * 获取访问令牌（私有方法）
     */
    async getAccessToken() {
        // 这里需要从auth-manager获取token
        const { authManager } = await import('./auth-manager');
        return authManager.getAccessToken();
    }
    /**
     * 学生撤回请假申请
     */
    async studentWithdrawLeave(request) {
        const response = await this.apiClient.post('/attendance/withdraw-leave', request);
        return response;
    }
}
// 创建默认实例
export const attendanceApi = new AttendanceApiService();
//# sourceMappingURL=attendance-api.js.map