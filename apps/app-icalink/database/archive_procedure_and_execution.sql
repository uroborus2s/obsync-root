-- ====================================================================
-- @wps/app-icalink: 批量数据归档与统计存储过程 (V8 - 移除视图依赖)
-- ====================================================================
--
-- 说明:
--   此版本移除了对 `v_course_attendance_stats_realtime` 视图的依赖，
--   直接在存储过程中通过 `v_attendance_realtime_details` 进行聚合计算，
--   简化了数据迁移逻辑并减少了维护开销。
--
-- ====================================================================

DROP PROCEDURE IF EXISTS ArchiveAndSummarizeRange;

CREATE PROCEDURE `ArchiveAndSummarizeRange`(IN p_start_date DATE, IN p_end_date DATE)
BEGIN
    DECLARE v_current_date DATE;
    SET v_current_date = p_start_date;

    WHILE v_current_date <= p_end_date DO

        START TRANSACTION;

        -- 步骤 1: 写入统计表 (修正: 直接从 v_attendance_realtime_details 计算)
        INSERT IGNORE INTO icasync.icalink_course_checkin_stats (
            stat_date, course_id,external_id, course_code, course_name, start_time, end_time, teacher_name, teacher_codes,
            teaching_week, week_day, periods,time_period,class_location, total_should_attend, present_count, absent_count, truant_count, leave_count, semester
        )
        SELECT
            v_current_date,
            vd.attendance_course_id,
            vd.external_id,
            vd.course_code,
            vd.course_name,
            vd.start_time,
            vd.end_time,
            vd.teacher_names,
            vd.teacher_codes,
            vd.teaching_week,
            vd.week_day,
            vd.periods,
            vd.time_period,
            vd.class_location,
            COUNT(vd.student_id) AS total_should_attend,
            SUM(CASE WHEN vd.final_status IN ('present') THEN 1 ELSE 0 END) AS present_count,
            SUM(CASE WHEN vd.final_status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
            SUM(CASE WHEN vd.final_status = 'truant' THEN 1 ELSE 0 END) AS truant_count,
            SUM(CASE WHEN vd.final_status IN ('leave', 'leave_pending') THEN 1 ELSE 0 END) AS leave_count,
            vd.semester
        FROM
            v_attendance_realtime_details AS vd
        WHERE
            vd.start_time >= v_current_date AND vd.start_time < v_current_date + INTERVAL 1 DAY
        GROUP BY
            vd.attendance_course_id,
            vd.course_code,
            vd.course_name,
            vd.start_time,
            vd.end_time,
            vd.teacher_names,
            vd.teacher_codes,
            vd.teaching_week,
            vd.week_day,
            vd.periods,
            vd.time_period,
            vd.semester;

        -- 步骤 2: 写入缺勤明细表 (修正: 写入/关联 icasync 库)
        INSERT INTO icasync.icalink_absent_student_relations (
            course_stats_id, course_id, external_id,course_code, course_name, student_id, student_name, class_name, major_name, 
            school_name, absence_type, stat_date, teaching_week, week_day, periods, time_period, semester
        )
        SELECT
            stats.id, 
            details.attendance_course_id, 
            details.external_id, 
            details.course_code, 
            details.course_name, 
            details.student_id, 
            details.student_name, 
            details.class_name, 
            details.major_name, 
            details.school_name, 
            details.final_status, 
            v_current_date, 
            details.teaching_week, 
            details.week_day, 
            details.periods, 
            details.time_period,
            details.semester
        FROM v_attendance_realtime_details AS details
        JOIN icasync.icalink_course_checkin_stats AS stats 
            ON details.attendance_course_id = stats.course_id AND stats.stat_date = v_current_date
        WHERE
            details.start_time >= v_current_date AND details.start_time < v_current_date + INTERVAL 1 DAY
            AND details.final_status IN ('absent', 'truant', 'leave', 'leave_pending');

        -- 步骤 3: 归档原始记录 (修正: 写入/读取 icasync 库)
        INSERT IGNORE INTO icasync.icalink_attendance_records_history
        SELECT * FROM icasync.icalink_attendance_records
        WHERE created_at >= v_current_date AND created_at < v_current_date + INTERVAL 1 DAY;

        -- 步骤 4: 清理原始记录 (修正: 从 icasync 库删除)
        -- DELETE FROM icasync.icalink_attendance_records
        -- WHERE created_at >= v_current_date AND created_at < v_current_date + INTERVAL 1 DAY;

        COMMIT;

        SET v_current_date = v_current_date + INTERVAL 1 DAY;

    END WHILE;

END;

-- ********************************************************************
-- * 第二部分: 调用存储过程 (示例)
-- ********************************************************************
-- CALL ArchiveAndSummarizeRange('2025-09-01', CURDATE() - INTERVAL 1 DAY);
