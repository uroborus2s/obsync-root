export const createPageUrlFactory = (baseUrl: string) => ({
  isCheckInUrl: (sfdk: string | null | undefined) => !sfdk || sfdk !== '1',

  getuAttendanceUrl: (id: string) => {
    return `${baseUrl}/app/attendance/student?id=${encodeURIComponent(id)}`;
  },
  getTeacherQueueUrl: (id: string) => {
    return `${baseUrl}/app/attendance/teacher?id=${encodeURIComponent(id)}`;
  },
  getCheckInUrl: (id: string) => {
    return `${baseUrl}/checkin/active?id=${encodeURIComponent(id)}`;
  },
  getLeaveUrl: (id: string) => {
    return `${baseUrl}/leaver/active?id=${encodeURIComponent(id)}`;
  }
});
