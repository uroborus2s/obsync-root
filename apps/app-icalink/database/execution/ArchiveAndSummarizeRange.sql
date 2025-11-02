DROP PROCEDURE IF EXISTS ArchiveAndSummarizeRange;

CREATE PROCEDURE `ArchiveAndSummarizeRange`()
ArchiveAndSummarizeRange: BEGIN
    DECLARE term_start_date DATE;
    DECLARE current_teaching_week INT;
    DECLARE current_week_day INT;

    -- Get term start date from config
    SELECT config_value INTO term_start_date FROM icalink_system_configs WHERE config_key = 'term.start_date' LIMIT 1;

    -- If term_start_date is not configured, exit
    IF term_start_date IS NULL THEN
        LEAVE ArchiveAndSummarizeRange;
    END IF;

    -- Get teaching_week from the view for the early exit check
    -- The view itself already filters for current_teaching_week <= 18. If the view returns no rows, current_teaching_week will be NULL.
    SELECT teaching_week,week_day INTO current_teaching_week,current_week_day
    FROM v_attendance_today_details
    LIMIT 1;

    -- If the view returns no records (meaning teaching_week > 18 or no data for today)
    -- or if the retrieved teaching_week is explicitly > 18, then exit.
    IF current_teaching_week IS NULL OR current_teaching_week > 18 THEN
        LEAVE ArchiveAndSummarizeRange;
    END IF;

    START TRANSACTION;

    -- 步骤 1: 写入统计表 (从 v_attendance_today_details 计算)
    INSERT IGNORE INTO icasync.icalink_course_checkin_stats (
	    stat_date,
	    course_id,
	    external_id,
	    course_code,
	    course_name,
	    start_time,
	    end_time,
	    teacher_name,
	    teacher_codes,
	    teaching_week,
	    week_day,
	    periods,
	    time_period,
	    class_location,
	    total_should_attend,
	    present_count,
	    absent_count,
	    truant_count,
	    leave_count,
        course_unit_id,
        course_unit,
        teaching_class_code,
        need_checkin,
        semester
    ) SELECT
        CURDATE(),-- Use CURDATE() directly for stat_date
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
            SUM(
	            CASE
			
			    WHEN vd.final_status IN ('present') THEN
			    1 ELSE 0 
		        END) AS present_count,
            SUM(
	            CASE
			
			    WHEN vd.final_status = 'absent' THEN
			    1 ELSE 0 
		        END) AS absent_count,
            SUM(
	            CASE
			
			    WHEN vd.final_status = 'truant' THEN
			    1 ELSE 0 
		        END) AS truant_count,
            SUM(
	            CASE
			
			    WHEN vd.final_status IN ('leave', 'leave_pending') THEN
			    1 ELSE 0 
		        END) AS leave_count,
        vd.course_unit_id,
        vd.course_unit,
        vd.teaching_class_code,
        vd.need_checkin,
        vd.semester 
    FROM
	    v_attendance_today_details AS vd -- Use the new view
    GROUP BY
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
        vd.course_unit_id,
        vd.course_unit,
        vd.teaching_class_code,
        vd.need_checkin,
        vd.semester;

    -- 步骤 2: 写入缺勤明细表 (从 v_attendance_today_details 计算)
    INSERT INTO icasync.icalink_absent_student_relations (
        course_stats_id,
        course_id,
        external_id,
        course_code,
        course_name,
        student_id,
        student_name,
        class_name,
        major_name,
        school_name,
        absence_type,
        stat_date,
        teaching_week,
        week_day,
        periods,
        time_period,
        school_id,
        major_id,
        class_id,
        grade,
        gender,
        people,
        semester
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
        CURDATE(), -- Use CURDATE() directly for stat_date
        details.teaching_week,
        details.week_day,
        details.periods,
        details.time_period,
        details.school_id,
        details.major_id,
        details.class_id,
        details.grade,
        details.gender,
        details.people,
        details.semester
    FROM v_attendance_today_details AS details -- Use the new view
    JOIN icasync.icalink_course_checkin_stats AS stats
        ON details.attendance_course_id = stats.course_id AND stats.stat_date = CURDATE() -- Join on CURDATE()
    WHERE
        details.final_status IN ('absent', 'truant', 'leave', 'leave_pending'); -- No date filtering needed, view handles it

    -- 步骤 3: 归档原始记录 (使用 v_attendance_today_details.attendance_record_id)
    INSERT IGNORE INTO icasync.icalink_attendance_records_history
    SELECT iar.*
    FROM icasync.icalink_attendance_records iar
    JOIN v_attendance_today_details vd ON iar.id = vd.attendance_record_id;

    -- 步骤 4: 清理原始记录 (使用 v_attendance_today_details.attendance_record_id)
    DELETE iar
    FROM icasync.icalink_attendance_records iar
    WHERE EXISTS (
    SELECT 1
    FROM icasync.icasync_attendance_courses AS sessions
    WHERE sessions.id = iar.attendance_course_id
      AND sessions.teaching_week = current_teaching_week  -- 用存储过程中的变量
      AND sessions.week_day = current_week_day            -- 用存储过程中的变量
      AND sessions.deleted_at IS NULL
);

    COMMIT;

END;
