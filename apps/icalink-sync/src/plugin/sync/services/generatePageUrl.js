export const createPageUrlFactory = (baseUrl) => ({
    isCheckInUrl: (sfdk) => !sfdk || sfdk !== '1',
    getuAttendanceUrl: (id) => {
        return `${baseUrl}/app/attendance/student?id=${encodeURIComponent(id)}`;
    },
    getTeacherQueueUrl: (id) => {
        return `${baseUrl}/app/attendance/teacher?id=${encodeURIComponent(id)}`;
    },
    getCheckInUrl: (id) => {
        return `${baseUrl}/checkin/active?id=${encodeURIComponent(id)}`;
    },
    getLeaveUrl: (id) => {
        return `${baseUrl}/leaver/active?id=${encodeURIComponent(id)}`;
    }
});
//# sourceMappingURL=generatePageUrl.js.map