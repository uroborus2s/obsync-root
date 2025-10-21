-- Stratix Migration Script (Views)
-- Target: @wps/app-icalink
-- Version: 2 (Views)
-- Description: Creates the real-time course attendance statistics view.

--
-- View structure for v_course_attendance_stats_realtime
--
-- This view depends on 'v_attendance_realtime_details'.
-- Make sure 'v_attendance_realtime_details' is created before creating this view.

CREATE OR REPLACE VIEW v_course_attendance_stats_realtime AS
SELECT
    -- Group by “per session” dimensional information
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
    vd.semester,

    -- Core statistical metrics
    -- 1. Expected attendance: Simply count the total number of rows in each group
    COUNT(vd.student_id) AS total_should_attend,

    -- 2. Actual attendance: Only count students whose final_status is 'present' or 'late'
    SUM(CASE WHEN vd.final_status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count,

    -- 3. Absent count
    SUM(CASE WHEN vd.final_status = 'absent' THEN 1 ELSE 0 END) AS absent_count,

    -- 4. Truant count
    SUM(CASE WHEN vd.final_status = 'truant' THEN 1 ELSE 0 END) AS truant_count,

    -- 5. Total leave count (including pending)
    SUM(CASE WHEN vd.final_status IN ('leave', 'leave_pending') THEN 1 ELSE 0 END) AS leave_count
FROM
    -- Read data from the detailed view we have already created
    v_attendance_realtime_details AS vd
GROUP BY
    -- The GROUP BY clause must include all non-aggregated dimensional fields
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
    vd.semester;
