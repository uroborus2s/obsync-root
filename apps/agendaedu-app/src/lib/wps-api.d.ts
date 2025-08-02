interface WPSConfig {
    appId: string;
    fileId: string;
    officeType: 'Writer' | 'Spreadsheet' | 'Presentation';
}
interface LeaveApplicationData {
    studentName: string;
    studentId: string;
    type: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    reason: string;
    submitTime: string;
}
interface AttendanceData {
    courseName: string;
    date: string;
    time: string;
    location: string;
    students: Array<{
        name: string;
        id: string;
        checkInTime?: string;
        status: 'present' | 'absent' | 'late';
    }>;
}
declare class WPSAPIService {
    private instance;
    private isInitialized;
    initialize(config: WPSConfig): Promise<void>;
    isReady(): boolean;
    createLeaveApplication(data: LeaveApplicationData): Promise<void>;
    createAttendanceSheet(data: AttendanceData): Promise<void>;
    private getStatusText;
}
export declare const wpsAPI: WPSAPIService;
export type { AttendanceData, LeaveApplicationData, WPSConfig };
//# sourceMappingURL=wps-api.d.ts.map