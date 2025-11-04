#!/bin/bash

# 文件重命名脚本 - 符合 Stratix 代码规范
# 使用 git mv 保留 git 历史

set -e

echo "开始重命名文件以符合 Stratix 代码规范..."

# Repository 文件重命名
echo "重命名 Repository 文件..."
git mv src/repositories/AttendanceCoursesRepository.ts src/repositories/AttendanceCourses.repository.ts
git mv src/repositories/CalendarMappingRepository.ts src/repositories/CalendarMapping.repository.ts
git mv src/repositories/CourseRawRepository.ts src/repositories/CourseRaw.repository.ts
git mv src/repositories/JuheRenwuRepository.ts src/repositories/JuheRenwu.repository.ts
git mv src/repositories/PermissionStatusRepository.ts src/repositories/PermissionStatus.repository.ts
git mv src/repositories/ScheduleMappingRepository.ts src/repositories/ScheduleMapping.repository.ts
git mv src/repositories/StudentCourseRepository.ts src/repositories/StudentCourse.repository.ts
git mv src/repositories/StudentRepository.ts src/repositories/Student.repository.ts
git mv src/repositories/TeacherCourseRepository.ts src/repositories/TeacherCourse.repository.ts
git mv src/repositories/TeacherRepository.ts src/repositories/Teacher.repository.ts
git mv src/repositories/UserInfoRepository.ts src/repositories/UserInfo.repository.ts

# Service 文件重命名
echo "重命名 Service 文件..."
git mv src/services/CalendarSyncService.ts src/services/CalendarSync.service.ts
git mv src/services/ChangeDetectionService.ts src/services/ChangeDetection.service.ts
git mv src/services/CourseAggregationService.ts src/services/CourseAggregation.service.ts
git mv src/services/StatusManagementService.ts src/services/StatusManagement.service.ts

# Executor 文件重命名
echo "重命名 Executor 文件..."
git mv src/executors/AddParticipantsProcessor.ts src/executors/AddParticipants.executor.ts
git mv src/executors/AddScheduleExecutor.ts src/executors/AddSchedule.executor.ts
git mv src/executors/AddSingleCalendarPermissionProcessor.ts src/executors/AddSingleCalendarPermission.executor.ts
git mv src/executors/CreateOrUpdateCalendarExecutor.ts src/executors/CreateOrUpdateCalendar.executor.ts
git mv src/executors/CreateSingleScheduleProcessor.ts src/executors/CreateSingleSchedule.executor.ts
git mv src/executors/DataAggregationProcessor.ts src/executors/DataAggregation.executor.ts
git mv src/executors/DeleteSingleCalendarProcessor.ts src/executors/DeleteSingleCalendar.executor.ts
git mv src/executors/DeleteSingleScheduleProcessor.ts src/executors/DeleteSingleSchedule.executor.ts
git mv src/executors/FetchCalendarPermissionsToAddExecutor.ts src/executors/FetchCalendarPermissionsToAdd.executor.ts
git mv src/executors/FetchCalendarPermissionsToRemoveExecutor.ts src/executors/FetchCalendarPermissionsToRemove.executor.ts
git mv src/executors/FetchCourseDataExecutor.ts src/executors/FetchCourseData.executor.ts
git mv src/executors/FetchMarkedJuheRenwuProcessor.ts src/executors/FetchMarkedJuheRenwu.executor.ts
git mv src/executors/FetchOldCalendarMappingsProcessor.ts src/executors/FetchOldCalendarMappings.executor.ts
git mv src/executors/FetchParticipantsExecutor.ts src/executors/FetchParticipants.executor.ts
git mv src/executors/FetchSchedulesExecutor.ts src/executors/FetchSchedules.executor.ts
git mv src/executors/FetchSyncSourcesProcessor.ts src/executors/FetchSyncSources.executor.ts
git mv src/executors/FetchUnprocessedJuheRenwuProcessor.ts src/executors/FetchUnprocessedJuheRenwu.executor.ts
git mv src/executors/IncrementalDataAggregationProcessor.ts src/executors/IncrementalDataAggregation.executor.ts
git mv src/executors/MarkIncrementalDataProcessor.ts src/executors/MarkIncrementalData.executor.ts
git mv src/executors/RemoveSingleCalendarPermissionProcessor.ts src/executors/RemoveSingleCalendarPermission.executor.ts
git mv src/executors/RestoreCalendarPermissionExecutor.ts src/executors/RestoreCalendarPermission.executor.ts

# Adapter 文件重命名
echo "重命名 Adapter 文件..."
git mv src/adapters/full-sync.adapter.ts src/adapters/FullSync.adapter.ts

echo "文件重命名完成！"
echo "接下来需要更新所有导入语句..."

