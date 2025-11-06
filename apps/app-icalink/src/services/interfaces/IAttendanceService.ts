import type { ServiceError } from '@stratix/core';
import type { Either } from '@stratix/utils/functional';
import type {
  ApprovePhotoCheckinDTO,
  ApprovePhotoCheckinResponse,
  CheckinDTO,
  CheckinResponse,
  GetCourseCompleteDataDTO,
  StudentCourseDataVO,
  TeacherCourseCompleteDataVO,
  UpdateCourseCheckinSettingDTO,
  UpdateCourseCheckinSettingResponse
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

  updateCourseCheckinSetting(
    dto: UpdateCourseCheckinSettingDTO
  ): Promise<Either<ServiceError, UpdateCourseCheckinSettingResponse>>;

  approvePhotoCheckin(
    dto: ApprovePhotoCheckinDTO
  ): Promise<Either<ServiceError, ApprovePhotoCheckinResponse>>;

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
