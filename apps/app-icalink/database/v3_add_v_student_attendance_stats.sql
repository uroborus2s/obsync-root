-- Stratix Migration Script (Views)
-- Target: @wps/app-icalink
-- Version: 3 (Views)
-- Description: Creates the student-centric real-time attendance statistics view.

--
-- View structure for v_student_attendance_stats
--
-- This view provides a real-time summary of attendance statistics for each student.
-- It calculates total classes, counts for various statuses (present, absent, etc.),
-- and an overall attendance rate.
-- It is based on the v_attendance_realtime_details view.
--

CREATE OR REPLACE VIEW v_student_attendance_stats AS
SELECT
    student_id,
    student_name,
    school_name,
    major_name,
    class_name,
    -- Total scheduled classes for the student
    COUNT(attendance_course_id) AS total_classes,
    -- Total classes they were marked 'present' or 'late'
    SUM(CASE WHEN final_status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count,
    -- Total classes they were marked 'absent'
    SUM(CASE WHEN final_status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
    -- Total classes they were marked 'truant'
    SUM(CASE WHEN final_status = 'truant' THEN 1 ELSE 0 END) AS truant_count,
    -- Total classes they were marked 'leave' or 'leave_pending'
    SUM(CASE WHEN final_status IN ('leave', 'leave_pending') THEN 1 ELSE 0 END) AS leave_count,
    -- Overall attendance rate (present / total)
    (SUM(CASE WHEN final_status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / COUNT(attendance_course_id)) AS attendance_rate
FROM
    v_attendance_realtime_details
GROUP BY
    student_id,
    student_name,
    school_name,
    major_name,
    class_name;