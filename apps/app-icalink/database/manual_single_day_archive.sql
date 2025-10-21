-- ====================================================================
-- @wps/app-icalink: 每日数据归档与统计手动执行脚本 (单个日期)
-- ====================================================================
--
-- 说明:
-- 本脚本用于对特定日期的数据进行统计和归档。
--
-- 使用方法:
-- 1. 设置下面的 @target_date 变量为您想要处理的日期。
-- 2. 按顺序执行下面的所有 SQL 语句。
-- 3. (可选) 执行最后被注释掉的 DELETE 语句来清理已归档的原始数据。
--
-- ====================================================================

-- ********************************************************************
-- * 步骤 0: 设置目标日期
-- ********************************************************************
SET @target_date = '2025-10-16';


-- ********************************************************************
-- * 步骤 1: 将日期的统计数据写入 `icalink_course_checkin_stats`
-- ********************************************************************
INSERT IGNORE INTO icalink_course_checkin_stats (
    stat_date,
    course_id,
    course_code,
    course_name,
    start_time,
    end_time,
    teacher_names,
    teacher_codes,
    teaching_week,
    week_day,
    periods,
    total_should_attend,
    present_count,
    absent_count,
    truant_count,
    leave_count
)
SELECT
    @target_date,
    attendance_course_id,
    course_code,
    course_name,
    start_time,
    end_time,
    teacher_names,
    teacher_codes,
    teaching_week,
    week_day,
    periods,
    total_should_attend,
    present_count,
    absent_count,
    truant_count,
    leave_count
FROM
    v_course_attendance_stats_realtime
WHERE
    start_time >= @target_date AND start_time < @target_date + INTERVAL 1 DAY;


-- ********************************************************************
-- * 步骤 2: 将日期缺勤明细写入 `icalink_absent_student_relations`
-- ********************************************************************
INSERT INTO icalink_absent_student_relations (
    course_stats_id,
    course_id,
    course_code,
    course_name,
    student_id,
    student_name,
    class_name,
    major_name,
    school_name,
    absence_type,
    stat_date,
    semester,
    teaching_week,
    week_day,
    periods,
    time_period
)
SELECT
    stats.id, -- 关键外键: 从刚刚插入的统计表中获取
    details.attendance_course_id,
    details.course_code,
    details.course_name,
    details.student_id,
    details.student_name,
    details.class_name,
    details.major_name,
    details.school_name,
    details.final_status, -- 缺勤类型
    @target_date,
    details.semester,
    details.teaching_week,
    details.week_day,
    details.periods,
    details.time_period
FROM
    v_attendance_realtime_details AS details
JOIN
    icalink_course_checkin_stats AS stats
    ON details.attendance_course_id = stats.course_id AND stats.stat_date = @target_date
WHERE
    details.start_time >= @target_date AND details.start_time < @target_date + INTERVAL 1 DAY
    AND details.final_status IN ('absent', 'truant', 'leave', 'leave_pending');


-- ********************************************************************
-- * 步骤 3: 将原始签到数据归档到 `icalink_attendance_records_history`
-- ********************************************************************
INSERT INTO icalink_attendance_records_history
SELECT *
FROM icalink_attendance_records
WHERE
    created_at >= @target_date AND created_at < @target_date + INTERVAL 1 DAY;


-- ********************************************************************
-- * (可选) 步骤 4: 清理已归档的原始数据
-- ********************************************************************
-- 警告: 执行此操作将从主业务表 `icalink_attendance_records` 中永久删除指定日期的数据。
-- DELETE FROM icalink_attendance_records
-- WHERE created_at >= @target_date AND created_at < @target_date + INTERVAL 1 DAY;
