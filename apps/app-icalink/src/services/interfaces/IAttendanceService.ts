import type { ServiceError } from '@stratix/core';
import type { Either } from '@stratix/utils/functional';
import type {
  CheckinDTO,
  CheckinResponse,
  GetCourseCompleteDataDTO,
  StudentCourseDataVO,
  TeacherCourseCompleteDataVO
} from '../../types/api.js';

export interface IAttendanceService {
  getCourseCompleteData(
    dto: GetCourseCompleteDataDTO
  ): Promise<
    Either<ServiceError, StudentCourseDataVO | TeacherCourseCompleteDataVO>
  >;

  checkin(dto: CheckinDTO): Promise<Either<ServiceError, CheckinResponse>>;

  getFailedCheckinJobs(
    page: number,
    pageSize: number
  ): Promise<Either<ServiceError, any>>;

  // getCourseAttendanceHistoryById(
  //   courseId: string,
  //   userInfo: UserInfo,
  //   params: { xnxq?: string; start_date?: string; end_date?: string }


  // getPersonalCourseStatsById(
  //   courseId: string,
  //   userInfo: UserInfo,
  //   params: { xnxq?: string }
  // ): Promise<Either<ServiceError, any>>;
}
