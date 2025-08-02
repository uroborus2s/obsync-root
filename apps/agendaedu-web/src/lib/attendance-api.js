/**
 * 考勤API服务类
 * 提供所有考勤相关的API调用方法，对接icalink-sync服务
 */
export class AttendanceApiService {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl =
            baseUrl ||
                (typeof window !== 'undefined'
                    ? this.getApiBaseUrl()
                    : 'http://localhost:8090');
    }
    /**
     * 根据当前环境获取API基础URL
     */
    getApiBaseUrl() {
        const origin = window.location.origin;
        const hostname = window.location.hostname;
        // 生产环境：如果在chat.whzhsc.cn域名下
        if (hostname.includes('whzhsc.cn')) {
            // 尝试多种可能的API地址
            // 1. 同域名同端口的api路径
            // 2. 同域名8090端口
            // 优先尝试同域名的api路径
            return origin;
        }
        // 开发环境：本地开发时的端口转换
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return origin.replace(':5173', ':8090');
        }
        // 默认情况
        return 'http://localhost:8090';
    }
    /**
     * 创建请求配置，包含401错误处理和自动重定向
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });
            // 处理401未授权错误
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('需要重新授权');
            }
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} ${errorText}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络连接');
            }
            throw error;
        }
    }
    /**
     * 处理401未授权响应 - 直接重定向到WPS授权页面
     */
    handleUnauthorized() {
        const currentUrl = window.location.href;
        sessionStorage.setItem('auth_redirect_url', currentUrl);
        const authUrl = this.buildWpsAuthUrl();
        window.location.href = authUrl;
    }
    /**
     * 构造WPS授权URL
     */
    buildWpsAuthUrl() {
        const clientId = 'AK20250614WBSGPX'; // 使用配置的应用ID
        const redirectUri = encodeURIComponent(`${window.location.origin}/web/auth/callback`);
        const scope = 'kso.user_base.read';
        const state = encodeURIComponent(JSON.stringify({
            type: 'web',
            timestamp: Date.now(),
            returnUrl: window.location.href,
        }));
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: scope,
            state: state,
        });
        return `https://openapi.wps.cn/oauth2/auth?${params.toString()}`;
    }
    // ========== 新的数据查询接口 ==========
    /**
     * 按条件查询出勤数据
     */
    async queryAttendanceData(params) {
        const query = new URLSearchParams();
        if (params.student_id)
            query.append('student_id', params.student_id);
        if (params.teacher_id)
            query.append('teacher_id', params.teacher_id);
        if (params.kkh)
            query.append('kkh', params.kkh);
        if (params.xnxq)
            query.append('xnxq', params.xnxq);
        if (params.status && params.status !== 'all')
            query.append('status', params.status);
        if (params.page)
            query.append('page', params.page.toString());
        if (params.page_size)
            query.append('page_size', params.page_size.toString());
        if (params.start_date)
            query.append('start_date', params.start_date);
        if (params.end_date)
            query.append('end_date', params.end_date);
        const response = await fetch(`${this.baseUrl}/api/v1/attendance/data?${query}`);
        if (!response.ok) {
            throw new Error('网络响应错误');
        }
        return response.json();
    }
    async queryData(params) {
        const response = await fetch(`${this.baseUrl}/apiv2/attendance/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '获取数据失败');
        }
        const result = await response.json();
        // Assuming the API returns { success: boolean, data: { records: [], total: number } }
        return result.data;
    }
    // ========== 任务列表相关接口 ==========
    /**
     * 获取任务列表（课程安排）
     * 对应后端 /apiv2/tasks 接口
     */
    async getTaskList(params) {
        const queryString = new URLSearchParams();
        if (params) {
            if (params.teacher_id)
                queryString.append('teacher_id', params.teacher_id);
            if (params.student_id)
                queryString.append('student_id', params.student_id);
            if (params.xnxq)
                queryString.append('xnxq', params.xnxq);
            if (params.start_date)
                queryString.append('start_date', params.start_date);
            if (params.end_date)
                queryString.append('end_date', params.end_date);
            if (params.status)
                queryString.append('status', params.status);
            if (params.page)
                queryString.append('page', params.page.toString());
            if (params.page_size)
                queryString.append('page_size', params.page_size.toString());
        }
        const endpoint = `/apiv2/tasks${queryString.toString() ? `?${queryString.toString()}` : ''}`;
        return this.makeRequest(endpoint);
    }
    /**
     * 获取任务详情
     * 对应后端 /apiv2/tasks/:task_id 接口
     */
    async getTaskDetail(taskId) {
        return this.makeRequest(`/apiv2/tasks/${taskId}`);
    }
    // ========== 打卡数据相关接口 ==========
    /**
     * 获取打卡记录列表
     * 对应后端 /apiv2/attendance-data 接口
     */
    async getAttendanceData(params) {
        const queryString = new URLSearchParams();
        if (params) {
            if (params.attendance_record_id)
                queryString.append('attendance_record_id', params.attendance_record_id);
            if (params.kkh)
                queryString.append('kkh', params.kkh);
            if (params.xnxq)
                queryString.append('xnxq', params.xnxq);
            if (params.start_date)
                queryString.append('start_date', params.start_date);
            if (params.end_date)
                queryString.append('end_date', params.end_date);
            if (params.student_id)
                queryString.append('student_id', params.student_id);
            if (params.teacher_id)
                queryString.append('teacher_id', params.teacher_id);
            if (params.status)
                queryString.append('status', params.status);
            if (params.page)
                queryString.append('page', params.page.toString());
            if (params.page_size)
                queryString.append('page_size', params.page_size.toString());
        }
        const endpoint = `/apiv2/attendance-data${queryString.toString() ? `?${queryString.toString()}` : ''}`;
        return this.makeRequest(endpoint);
    }
    /**
     * 获取考勤统计信息
     * 对应后端 /apiv2/attendance-stats 接口
     */
    async getAttendanceStats(params) {
        const queryString = new URLSearchParams();
        if (params) {
            if (params.xnxq)
                queryString.append('xnxq', params.xnxq);
            if (params.start_date)
                queryString.append('start_date', params.start_date);
            if (params.end_date)
                queryString.append('end_date', params.end_date);
        }
        const endpoint = `/apiv2/attendance-stats${queryString.toString() ? `?${queryString.toString()}` : ''}`;
        return this.makeRequest(endpoint);
    }
    // ========== 兼容性接口（返回模拟数据） ==========
    /**
     * 获取课程考勤记录列表（兼容现有代码）
     */
    async getCourseAttendanceRecords(_params) {
        // 返回模拟数据结构，实际使用时建议直接调用 getTaskList
        return {
            success: true,
            message: '请使用 getTaskList 方法获取任务列表',
            data: {
                items: [],
                total: 0,
                page: 1,
                page_size: 20,
                total_pages: 0,
                has_next: false,
                has_prev: false,
            },
        };
    }
    /**
     * 获取课程考勤详情（兼容现有代码）
     */
    async getCourseAttendanceDetail(_recordId) {
        // 返回模拟数据结构，实际使用时建议直接调用 getTaskDetail
        throw new Error('请使用 getTaskDetail 和 getAttendanceData 方法获取详细信息');
    }
    /**
     * 获取课程历史考勤统计（兼容现有代码）
     */
    async getCourseHistoricalStats(_kkh, _xnxq) {
        // 返回模拟数据结构，实际使用时建议直接调用 getTaskList
        throw new Error('请使用 getTaskList 方法获取历史数据');
    }
    // ========== 学生维度查询 ==========
    /**
     * 获取学生个人考勤统计（兼容现有代码）
     */
    async getStudentPersonalStats(_studentId, _params) {
        // 返回模拟数据结构，实际使用时建议直接调用 getAttendanceData
        throw new Error('请使用 getAttendanceData 方法获取学生考勤数据');
    }
    /**
     * 获取学生考勤记录列表（兼容现有代码）
     */
    async getStudentAttendanceRecords(_studentId, _params) {
        // 返回模拟数据结构，实际使用时建议直接调用 getAttendanceData
        throw new Error('请使用 getAttendanceData 方法获取学生考勤记录');
    }
    // ========== 统计维度查询 ==========
    /**
     * 获取整体考勤统计（兼容现有代码）
     */
    async getOverallStats(params) {
        return this.getAttendanceStats({
            xnxq: params?.xnxq,
            start_date: params?.start_date,
            end_date: params?.end_date,
        });
    }
    /**
     * 获取班级考勤排名（兼容现有代码）
     */
    async getClassAttendanceRanking(_params) {
        throw new Error('班级考勤排名功能需要后端实现专门接口');
    }
    /**
     * 导出考勤数据（兼容现有代码）
     */
    async exportAttendanceData(_params) {
        throw new Error('考勤数据导出功能需要后端实现专门接口');
    }
    /**
     * 搜索学生（兼容现有代码）
     */
    async searchStudents(_query) {
        throw new Error('学生搜索功能需要后端实现专门接口');
    }
    /**
     * 搜索课程（兼容现有代码）
     */
    async searchCourses(_query) {
        throw new Error('课程搜索功能需要后端实现专门接口');
    }
}
// 导出单例实例
export const attendanceApi = new AttendanceApiService();
//# sourceMappingURL=attendance-api.js.map