/**
 * 日程创建执行器
 * 为参与者创建课程日程
 */
export const scheduleCreationExecutor = (userCalendarRepo) => {
    return {
        onRun: async (params) => {
            const { courseId, kkh, xnxq, participant, courseData } = params || {};
            if (!participant?.id) {
                return { success: false, error: 'participant.id is required' };
            }
            // 简单的日程创建逻辑
            return {
                success: true,
                participantId: participant.id,
                courseId,
                kkh,
                participantType: participant.type,
                scheduled: true
            };
        }
    };
};
//# sourceMappingURL=schedule-creation.executor.js.map