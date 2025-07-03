import { UserCalendarRepository } from '../../repositories/user-calendar-repository.js';

/**
 * 日程创建执行器
 * 为参与者创建课程日程
 */
export const scheduleCreationExecutor = (
  userCalendarRepo: UserCalendarRepository
) => {
  return {
    onRun: async (params?: {
      courseId?: string;
      kkh?: string;
      xnxq?: string;
      participant?: {
        id: string;
        type: 'teacher' | 'student';
        [key: string]: any;
      };
      courseData?: any;
    }) => {
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
