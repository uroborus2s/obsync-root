import { ApiResponse, AttendanceDataQueryParams, AttendanceDetailRecord, AttendanceQueryParams, AttendanceRecord, AttendanceStats, CourseAttendanceDetail, DataQueryParams, DataQueryRecord, HistoricalAttendanceRecord, PaginatedResponse, StudentAttendanceRecord, StudentPersonalStats, TaskDetail, TaskListQueryParams } from '@/types/attendance.types';
/**
 * 考勤API服务类
 * 提供所有考勤相关的API调用方法，对接icalink-sync服务
 */
export declare class AttendanceApiService {
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * 根据当前环境获取API基础URL
     */
    private getApiBaseUrl;
    /**
     * 创建请求配置，包含401错误处理和自动重定向
     */
    private makeRequest;
    /**
     * 处理401未授权响应 - 直接重定向到WPS授权页面
     */
    private handleUnauthorized;
    /**
     * 构造WPS授权URL
     */
    private buildWpsAuthUrl;
    /**
     * 按条件查询出勤数据
     */
    queryAttendanceData(params: AttendanceDataQueryParams): Promise<ApiResponse<PaginatedResponse<DataQueryRecord>>>;
    queryData(params: DataQueryParams): Promise<{
        records: DataQueryRecord[];
        total: number;
    }>;
    /**
     * 获取任务列表（课程安排）
     * 对应后端 /apiv2/tasks 接口
     */
    getTaskList(params?: TaskListQueryParams): Promise<ApiResponse<PaginatedResponse<TaskDetail>>>;
    /**
     * 获取任务详情
     * 对应后端 /apiv2/tasks/:task_id 接口
     */
    getTaskDetail(taskId: string): Promise<ApiResponse<TaskDetail>>;
    /**
     * 获取打卡记录列表
     * 对应后端 /apiv2/attendance-data 接口
     */
    getAttendanceData(params?: AttendanceDataQueryParams): Promise<ApiResponse<PaginatedResponse<AttendanceDetailRecord>>>;
    /**
     * 获取考勤统计信息
     * 对应后端 /apiv2/attendance-stats 接口
     */
    getAttendanceStats(params?: {
        xnxq?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<ApiResponse<AttendanceStats>>;
    /**
     * 获取课程考勤记录列表（兼容现有代码）
     */
    getCourseAttendanceRecords(_params: AttendanceQueryParams): Promise<ApiResponse<PaginatedResponse<AttendanceRecord>>>;
    /**
     * 获取课程考勤详情（兼容现有代码）
     */
    getCourseAttendanceDetail(_recordId: string): Promise<ApiResponse<CourseAttendanceDetail>>;
    /**
     * 获取课程历史考勤统计（兼容现有代码）
     */
    getCourseHistoricalStats(_kkh: string, _xnxq: string): Promise<ApiResponse<HistoricalAttendanceRecord[]>>;
    /**
     * 获取学生个人考勤统计（兼容现有代码）
     */
    getStudentPersonalStats(_studentId: string, _params?: Partial<AttendanceQueryParams>): Promise<ApiResponse<StudentPersonalStats>>;
    /**
     * 获取学生考勤记录列表（兼容现有代码）
     */
    getStudentAttendanceRecords(_studentId: string, _params?: AttendanceQueryParams): Promise<ApiResponse<PaginatedResponse<StudentAttendanceRecord>>>;
    /**
     * 获取整体考勤统计（兼容现有代码）
     */
    getOverallStats(params?: Partial<AttendanceQueryParams>): Promise<ApiResponse<AttendanceStats>>;
    /**
     * 获取班级考勤排名（兼容现有代码）
     */
    getClassAttendanceRanking(_params: {
        xnxq?: string;
        kkh?: string;
        bjmc?: string;
        limit?: number;
    }): Promise<ApiResponse<StudentPersonalStats[]>>;
    /**
     * 导出考勤数据（兼容现有代码）
     */
    exportAttendanceData(_params: AttendanceQueryParams & {
        format?: 'xlsx' | 'csv';
    }): Promise<Blob>;
    /**
     * 搜索学生（兼容现有代码）
     */
    searchStudents(_query: string): Promise<ApiResponse<StudentPersonalStats[]>>;
    /**
     * 搜索课程（兼容现有代码）
     */
    searchCourses(_query: string): Promise<ApiResponse<AttendanceRecord[]>>;
}
export declare const attendanceApi: AttendanceApiService;
//# sourceMappingURL=attendance-api.d.ts.map