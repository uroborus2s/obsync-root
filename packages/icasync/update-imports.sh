#!/bin/bash

# 更新导入语句脚本
# 批量替换所有文件中的导入路径

set -e

echo "开始更新导入语句..."

# 定义替换函数
replace_in_files() {
    local old_pattern="$1"
    local new_pattern="$2"
    echo "替换: $old_pattern -> $new_pattern"
    
    # 在所有 .ts 文件中进行替换
    find src -name "*.ts" -type f -exec sed -i '' "s|$old_pattern|$new_pattern|g" {} +
}

# Repository 导入路径替换
echo "更新 Repository 导入路径..."
replace_in_files "AttendanceCoursesRepository\.ts" "AttendanceCourses.repository.ts"
replace_in_files "AttendanceCoursesRepository\.js" "AttendanceCourses.repository.js"
replace_in_files "CalendarMappingRepository\.ts" "CalendarMapping.repository.ts"
replace_in_files "CalendarMappingRepository\.js" "CalendarMapping.repository.js"
replace_in_files "CourseRawRepository\.ts" "CourseRaw.repository.ts"
replace_in_files "CourseRawRepository\.js" "CourseRaw.repository.js"
replace_in_files "JuheRenwuRepository\.ts" "JuheRenwu.repository.ts"
replace_in_files "JuheRenwuRepository\.js" "JuheRenwu.repository.js"
replace_in_files "PermissionStatusRepository\.ts" "PermissionStatus.repository.ts"
replace_in_files "PermissionStatusRepository\.js" "PermissionStatus.repository.js"
replace_in_files "ScheduleMappingRepository\.ts" "ScheduleMapping.repository.ts"
replace_in_files "ScheduleMappingRepository\.js" "ScheduleMapping.repository.js"
replace_in_files "StudentCourseRepository\.ts" "StudentCourse.repository.ts"
replace_in_files "StudentCourseRepository\.js" "StudentCourse.repository.js"
replace_in_files "StudentRepository\.ts" "Student.repository.ts"
replace_in_files "StudentRepository\.js" "Student.repository.js"
replace_in_files "TeacherCourseRepository\.ts" "TeacherCourse.repository.ts"
replace_in_files "TeacherCourseRepository\.js" "TeacherCourse.repository.js"
replace_in_files "TeacherRepository\.ts" "Teacher.repository.ts"
replace_in_files "TeacherRepository\.js" "Teacher.repository.js"
replace_in_files "UserInfoRepository\.ts" "UserInfo.repository.ts"
replace_in_files "UserInfoRepository\.js" "UserInfo.repository.js"

# Service 导入路径替换
echo "更新 Service 导入路径..."
replace_in_files "CalendarSyncService\.ts" "CalendarSync.service.ts"
replace_in_files "CalendarSyncService\.js" "CalendarSync.service.js"
replace_in_files "ChangeDetectionService\.ts" "ChangeDetection.service.ts"
replace_in_files "ChangeDetectionService\.js" "ChangeDetection.service.js"
replace_in_files "CourseAggregationService\.ts" "CourseAggregation.service.ts"
replace_in_files "CourseAggregationService\.js" "CourseAggregation.service.js"
replace_in_files "StatusManagementService\.ts" "StatusManagement.service.ts"
replace_in_files "StatusManagementService\.js" "StatusManagement.service.js"

# Executor 导入路径替换
echo "更新 Executor 导入路径..."
replace_in_files "AddParticipantsProcessor\.ts" "AddParticipants.executor.ts"
replace_in_files "AddParticipantsProcessor\.js" "AddParticipants.executor.js"
replace_in_files "AddScheduleExecutor\.ts" "AddSchedule.executor.ts"
replace_in_files "AddScheduleExecutor\.js" "AddSchedule.executor.js"
replace_in_files "AddSingleCalendarPermissionProcessor\.ts" "AddSingleCalendarPermission.executor.ts"
replace_in_files "AddSingleCalendarPermissionProcessor\.js" "AddSingleCalendarPermission.executor.js"
replace_in_files "CreateOrUpdateCalendarExecutor\.ts" "CreateOrUpdateCalendar.executor.ts"
replace_in_files "CreateOrUpdateCalendarExecutor\.js" "CreateOrUpdateCalendar.executor.js"
replace_in_files "CreateSingleScheduleProcessor\.ts" "CreateSingleSchedule.executor.ts"
replace_in_files "CreateSingleScheduleProcessor\.js" "CreateSingleSchedule.executor.js"
replace_in_files "DataAggregationProcessor\.ts" "DataAggregation.executor.ts"
replace_in_files "DataAggregationProcessor\.js" "DataAggregation.executor.js"
replace_in_files "DeleteSingleCalendarProcessor\.ts" "DeleteSingleCalendar.executor.ts"
replace_in_files "DeleteSingleCalendarProcessor\.js" "DeleteSingleCalendar.executor.js"
replace_in_files "DeleteSingleScheduleProcessor\.ts" "DeleteSingleSchedule.executor.ts"
replace_in_files "DeleteSingleScheduleProcessor\.js" "DeleteSingleSchedule.executor.js"
replace_in_files "FetchCalendarPermissionsToAddExecutor\.ts" "FetchCalendarPermissionsToAdd.executor.ts"
replace_in_files "FetchCalendarPermissionsToAddExecutor\.js" "FetchCalendarPermissionsToAdd.executor.js"
replace_in_files "FetchCalendarPermissionsToRemoveExecutor\.ts" "FetchCalendarPermissionsToRemove.executor.ts"
replace_in_files "FetchCalendarPermissionsToRemoveExecutor\.js" "FetchCalendarPermissionsToRemove.executor.js"
replace_in_files "FetchCourseDataExecutor\.ts" "FetchCourseData.executor.ts"
replace_in_files "FetchCourseDataExecutor\.js" "FetchCourseData.executor.js"
replace_in_files "FetchMarkedJuheRenwuProcessor\.ts" "FetchMarkedJuheRenwu.executor.ts"
replace_in_files "FetchMarkedJuheRenwuProcessor\.js" "FetchMarkedJuheRenwu.executor.js"
replace_in_files "FetchOldCalendarMappingsProcessor\.ts" "FetchOldCalendarMappings.executor.ts"
replace_in_files "FetchOldCalendarMappingsProcessor\.js" "FetchOldCalendarMappings.executor.js"
replace_in_files "FetchParticipantsExecutor\.ts" "FetchParticipants.executor.ts"
replace_in_files "FetchParticipantsExecutor\.js" "FetchParticipants.executor.js"
replace_in_files "FetchSchedulesExecutor\.ts" "FetchSchedules.executor.ts"
replace_in_files "FetchSchedulesExecutor\.js" "FetchSchedules.executor.js"
replace_in_files "FetchSyncSourcesProcessor\.ts" "FetchSyncSources.executor.ts"
replace_in_files "FetchSyncSourcesProcessor\.js" "FetchSyncSources.executor.js"
replace_in_files "FetchUnprocessedJuheRenwuProcessor\.ts" "FetchUnprocessedJuheRenwu.executor.ts"
replace_in_files "FetchUnprocessedJuheRenwuProcessor\.js" "FetchUnprocessedJuheRenwu.executor.js"
replace_in_files "IncrementalDataAggregationProcessor\.ts" "IncrementalDataAggregation.executor.ts"
replace_in_files "IncrementalDataAggregationProcessor\.js" "IncrementalDataAggregation.executor.js"
replace_in_files "MarkIncrementalDataProcessor\.ts" "MarkIncrementalData.executor.ts"
replace_in_files "MarkIncrementalDataProcessor\.js" "MarkIncrementalData.executor.js"
replace_in_files "RemoveSingleCalendarPermissionProcessor\.ts" "RemoveSingleCalendarPermission.executor.ts"
replace_in_files "RemoveSingleCalendarPermissionProcessor\.js" "RemoveSingleCalendarPermission.executor.js"
replace_in_files "RestoreCalendarPermissionExecutor\.ts" "RestoreCalendarPermission.executor.ts"
replace_in_files "RestoreCalendarPermissionExecutor\.js" "RestoreCalendarPermission.executor.js"

# Adapter 导入路径替换
echo "更新 Adapter 导入路径..."
replace_in_files "full-sync\.adapter\.ts" "FullSync.adapter.ts"
replace_in_files "full-sync\.adapter\.js" "FullSync.adapter.js"

echo "导入语句更新完成！"

