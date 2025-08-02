interface WPSCollaborationConfig {
    appId: string;
    scope: string[];
}
interface LocationInfo {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
}
interface ImageInfo {
    localId: string;
    serverId?: string;
    base64?: string;
}
interface ShareData {
    title: string;
    desc: string;
    link: string;
    imgUrl?: string;
}
interface CheckInRecord {
    studentId: string;
    studentName: string;
    checkInTime: string;
    location: LocationInfo;
    photos?: string[];
    status: 'present' | 'late' | 'absent';
}
interface CourseInfo {
    courseId: string;
    courseName: string;
    date: string;
    time: string;
    classroom: string;
    teacher: string;
}
interface StudentInfo {
    studentId: string;
    name: string;
    class: string;
    major: string;
}
interface AttendanceData {
    courseId: string;
    courseName: string;
    date: string;
    time: string;
    classroom: string;
    teacher: string;
    records: CheckInRecord[];
    totalStudents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
}
interface PersonalAttendanceStats {
    studentId: string;
    studentName: string;
    totalClasses: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    leaveCount: number;
    attendanceRate: number;
    recentRecords: Array<{
        date: string;
        status: 'present' | 'late' | 'absent' | 'leave';
        courseName: string;
    }>;
}
interface PersonalAttendanceDetail {
    date: string;
    time: string;
    status: 'present' | 'late' | 'absent' | 'leave';
    checkInTime?: string;
    leaveReason?: string;
    location?: LocationInfo;
}
interface CourseAttendanceStats {
    courseId: string;
    courseName: string;
    teacher: string;
    totalClasses: number;
    totalStudents: number;
    overallAttendanceRate: number;
    classStats: ClassAttendanceStats[];
    studentStats: PersonalAttendanceStats[];
}
interface ClassAttendanceStats {
    date: string;
    time: string;
    classroom: string;
    totalStudents: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    leaveCount: number;
    attendanceRate: number;
}
declare global {
    interface Window {
        ksoxz_sdk: {
            getLocationInfo: (params: {
                type?: 'wgs84' | 'gcj02';
                onSuccess: (result: LocationInfo) => void;
                onError: (error: any) => void;
            }) => void;
            chooseImage: (params: {
                params?: {
                    count?: number;
                    sizeType?: string[];
                    sourceType?: string[];
                };
                onSuccess: (result: {
                    localIds: string[];
                }) => void;
                onError: (error: any) => void;
            }) => void;
            uploadFile: (params: {
                params: {
                    url: string;
                    filePath: string;
                    name: string;
                    formData?: Record<string, any>;
                };
                onSuccess: (result: any) => void;
                onError: (error: any) => void;
            }) => void;
            shareMessage: (params: {
                params: {
                    title: string;
                    desc: string;
                    link: string;
                    imgUrl?: string;
                };
                onSuccess: (result: any) => void;
                onError: (error: any) => void;
            }) => void;
            showAlert: (params: {
                params: {
                    title: string;
                    content: string;
                    buttonText?: string;
                };
                onSuccess: (result: any) => void;
                onError: (error: any) => void;
            }) => void;
            showConfirm: (params: {
                params: {
                    title: string;
                    content: string;
                    confirmText?: string;
                    cancelText?: string;
                };
                onSuccess: (result: {
                    confirm: boolean;
                }) => void;
                onError: (error: any) => void;
            }) => void;
            showToast: (params: {
                params: {
                    title: string;
                    icon?: 'success' | 'error' | 'loading' | 'none';
                    duration?: number;
                };
                onSuccess?: (result: any) => void;
                onError?: (error: any) => void;
            }) => void;
            authorize: (params: {
                params: {
                    scope: string;
                };
                onSuccess: (result: {
                    auth: boolean;
                }) => void;
                onError: (error: any) => void;
            }) => void;
            getDeviceInfo: (params: {
                onSuccess: (result: any) => void;
                onError: (error: any) => void;
            }) => void;
        };
    }
}
declare class WPSCollaborationService {
    private isInitialized;
    /**
     * 初始化WPS协作JSAPI
     */
    initialize(config: WPSCollaborationConfig): Promise<void>;
    /**
     * 检查是否已初始化
     */
    isReady(): boolean;
    /**
     * 获取地理位置信息
     */
    getLocation(): Promise<LocationInfo>;
    /**
     * 选择图片
     */
    chooseImage(count?: number): Promise<string[]>;
    /**
     * 上传文件
     */
    uploadFile(filePath: string, uploadUrl?: string): Promise<string>;
    /**
     * 分享内容
     */
    share(data: ShareData): Promise<void>;
    /**
     * 显示提示框
     */
    showAlert(title: string, content: string): Promise<void>;
    /**
     * 显示确认框
     */
    showConfirm(title: string, content: string): Promise<boolean>;
    /**
     * 显示Toast提示
     */
    showToast(title: string, icon?: 'success' | 'error' | 'loading' | 'none'): Promise<void>;
    /**
     * 签到功能 - 结合位置和图片
     */
    checkInWithLocation(): Promise<{
        location: LocationInfo;
        photos?: string[];
    }>;
    /**
     * 分享签到结果
     */
    shareCheckInResult(courseName: string, location: string): Promise<void>;
    /**
     * 获取模拟签到数据（用于演示）
     */
    getMockAttendanceData(): AttendanceData;
    /**
     * 获取历史签到统计数据
     */
    getMockHistoryData(): AttendanceData[];
    /**
     * 获取个人签到统计数据
     */
    getMockPersonalStats(): PersonalAttendanceStats[];
    /**
     * 获取模拟课程信息
     */
    getMockCourseInfo(): CourseInfo;
    /**
     * 获取模拟学生信息
     */
    getMockStudentInfo(): StudentInfo;
    /**
     * 获取学生签到记录
     */
    getStudentCheckInRecord(_studentId: string): CheckInRecord | null;
    /**
     * 获取当前位置（别名方法）
     */
    getCurrentLocation(): Promise<LocationInfo>;
    /**
     * 提交签到记录
     */
    submitCheckIn(checkInData: CheckInRecord): Promise<void>;
    /**
     * 获取课程整体统计数据
     */
    getMockCourseStats(): CourseAttendanceStats;
}
export declare const wpsCollaboration: WPSCollaborationService;
export type { AttendanceData, CheckInRecord, ClassAttendanceStats, CourseAttendanceStats, CourseInfo, ImageInfo, LocationInfo, PersonalAttendanceDetail, PersonalAttendanceStats, ShareData, StudentInfo, WPSCollaborationConfig };
//# sourceMappingURL=wps-collaboration-api.d.ts.map