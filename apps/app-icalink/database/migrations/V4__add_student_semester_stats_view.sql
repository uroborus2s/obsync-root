-- Stratix Migration Script (Views)
-- Target: @wps/app-icalink
-- Version: 4 (Views)
-- Description: Creates the student semester attendance statistics view.

--
-- View structure for v_student_semester_attendance_stats
--
-- This view provides semester-level attendance statistics for each student.
-- It calculates:
-- 1. Total courses in the semester
-- 2. Completed courses (up to current date 00:00:00)
-- 3. Absence count, leave count, attendance count
-- 4. Attendance rate
--
-- Data sources:
-- - out_jw_kcb_xs: Student course enrollment
-- - out_xsxx: Student basic information
-- - icasync_attendance_courses: Course schedule
-- - icalink_absent_student_relations: Attendance records (for historical courses)
-- - v_attendance_realtime_details: Real-time attendance status (for current/future courses)
--

CREATE OR REPLACE VIEW v_student_semester_attendance_stats AS
SELECT
    s.xh AS student_id,
    s.xm AS student_name,
    s.xymc AS school_name,
    s.bjmc AS class_name,
    s.zymc AS major_name,
    ac.semester,
    
    -- 本学期总课程数（总课时数）
    COUNT(DISTINCT ac.id) AS total_courses,
    
    -- 截止到当前日期零点已经发生的课程数（已上课时数）
    COUNT(DISTINCT CASE 
        WHEN DATE(ac.start_time) < CURDATE() THEN ac.id 
        ELSE NULL 
    END) AS completed_courses,
    
    -- 缺勤数（从历史记录表统计）
    COALESCE(SUM(CASE 
        WHEN DATE(ac.start_time) < CURDATE() 
             AND asr.absence_type IN ('absent', 'truant') 
        THEN 1 
        ELSE 0 
    END), 0) AS absence_count,
    
    -- 请假数（从历史记录表统计）
    COALESCE(SUM(CASE 
        WHEN DATE(ac.start_time) < CURDATE() 
             AND asr.absence_type IN ('leave', 'leave_pending') 
        THEN 1 
        ELSE 0 
    END), 0) AS leave_count,
    
    -- 出勤数（已上课时数 - 缺勤数 - 请假数）
    -- 对于历史课程：没有缺勤记录的视为出勤
    COUNT(DISTINCT CASE 
        WHEN DATE(ac.start_time) < CURDATE() THEN ac.id 
        ELSE NULL 
    END) - COALESCE(SUM(CASE 
        WHEN DATE(ac.start_time) < CURDATE() 
             AND asr.absence_type IS NOT NULL 
        THEN 1 
        ELSE 0 
    END), 0) AS attendance_count,
    
    -- 出勤率（出勤数 / 已上课时数）* 100，保留2位小数
    CASE 
        WHEN COUNT(DISTINCT CASE 
            WHEN DATE(ac.start_time) < CURDATE() THEN ac.id 
            ELSE NULL 
        END) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE 
                WHEN DATE(ac.start_time) < CURDATE() THEN ac.id 
                ELSE NULL 
            END) - COALESCE(SUM(CASE 
                WHEN DATE(ac.start_time) < CURDATE() 
                     AND asr.absence_type IS NOT NULL 
                THEN 1 
                ELSE 0 
            END), 0)) * 100.0 / 
            COUNT(DISTINCT CASE 
                WHEN DATE(ac.start_time) < CURDATE() THEN ac.id 
                ELSE NULL 
            END), 
            2
        )
        ELSE 0 
    END AS attendance_rate

FROM 
    syncdb.out_jw_kcb_xs AS cs
    INNER JOIN syncdb.out_xsxx AS s ON cs.xh = s.xh
    INNER JOIN icasync.icasync_attendance_courses AS ac 
        ON cs.kkh = ac.course_code 
        AND cs.xnxq = ac.semester
        AND ac.deleted_at IS NULL
    LEFT JOIN icasync.icalink_absent_student_relations AS asr 
        ON asr.student_id = cs.xh 
        AND asr.course_id = ac.id
        AND DATE(ac.start_time) < CURDATE()

WHERE
    s.zt IN ('add', 'update')  -- 只统计有效学生
    AND ac.deleted_at IS NULL
    AND cs.zt IN ('add', 'update')

GROUP BY
    s.xh,
    s.xm,
    s.xymc,
    s.bjmc,
    s.zymc,
    ac.semester;

