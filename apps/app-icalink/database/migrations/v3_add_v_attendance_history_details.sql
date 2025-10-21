-- ====================================================================
-- v_attendance_history_details VIEW
-- ====================================================================
-- Description:
-- This view provides the final attendance status for historical (archived) courses.
-- It is designed for querying data from T-1 and earlier.
-- It joins the student roster with archived absent records.
-- If a student is not found in the absent records for a course, they are considered 'present'.
-- This version adds the 'course_date' for filtering.
-- ====================================================================

CREATE OR REPLACE VIEW v_attendance_history_details AS
SELECT
    cal.id AS course_id,              -- The specific ID of the course session
    cal.course_code,                 -- The course code for grouping
    u.user_id AS student_id,         -- Student's ID
    u.user_name AS student_name,     -- Student's name
    u.class_name AS student_class_name, -- The student's administrative class
    COALESCE(asr.absence_type, 'present') AS final_status, -- Defaults to 'present' if no absent record is found
    DATE(cal.start_time) AS course_date, -- The date of the course, for filtering
    asr.semester,
    asr.teaching_week,
    asr.week_day,
    asr.periods
FROM
    icasync.icasync_attendance_courses cal
JOIN
    icalink_enrollments e ON cal.course_code = e.course_code
JOIN
    icalink_users u ON e.user_id = u.user_id
LEFT JOIN
    icalink_absent_student_relations asr ON cal.id = asr.course_id AND u.user_id = asr.student_id
WHERE
    e.user_type = 'student' AND e.is_active = 1 AND u.is_active = 1;
