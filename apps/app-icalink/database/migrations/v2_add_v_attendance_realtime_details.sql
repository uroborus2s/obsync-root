-- ====================================================================
-- v_attendance_realtime_details VIEW (v3 - Performance Fix)
-- ====================================================================
-- Description:
-- This final version uses STRAIGHT_JOIN to force the execution order and
-- CONVERT() function to handle charset mismatches in JOINs, 
-- allowing indexes on large tables to be used effectively.
-- This resolves the critical performance bottleneck identified by EXPLAIN.
-- ====================================================================

CREATE OR REPLACE VIEW v_attendance_realtime_details AS
SELECT
    STRAIGHT_JOIN
    sessions.id AS attendance_course_id,
    sessions.external_id,
    sessions.course_code,
    sessions.course_name,
    sessions.created_at,
    roster_u.student_id,
    roster_u.student_name,
    roster_u.class_name,
    roster_u.major_name,
    roster_u.school_name,
    sessions.teaching_week,
    sessions.week_day,
    sessions.periods,
    sessions.time_period,
    sessions.start_time,
    sessions.end_time,
    sessions.teacher_names,
    sessions.teacher_codes,
    sessions.semester,
    sessions.class_location,
    CASE
        WHEN ar.manual_override_by IS NOT NULL THEN ar.status
        WHEN ar.status IN ('leave', 'leave_pending') THEN ar.status
        WHEN lw.window_id IS NOT NULL THEN
            CASE
                WHEN ar.window_id = lw.window_id THEN 'present'
                WHEN ar.status IN ('present', 'late') AND (ar.window_id != lw.window_id OR ar.window_id IS NULL) THEN 'truant'
                ELSE 'absent'
            END
        WHEN ar.id IS NOT NULL THEN ar.status
        ELSE 'absent'
    END AS final_status
FROM
    icasync.icasync_attendance_courses AS sessions
JOIN
    syncdb.out_jw_kcb_xs AS roster_oxs
      -- Performance Fix #1: Use CONVERT on the small result set's column
      ON roster_oxs.kkh = sessions.course_code
      AND roster_oxs.zt IN ('add', 'update')
JOIN
    (
        SELECT xh AS student_id, xm AS student_name, bjmc AS class_name, zymc AS major_name, xymc AS school_name, zt
        FROM syncdb.out_xsxx
        WHERE zt IN ('add', 'update')
    ) AS roster_u ON roster_oxs.xh = roster_u.student_id
LEFT JOIN
    icalink_attendance_records ar
      -- Performance Fix #2: Use CONVERT on the non-indexed side
      ON sessions.id = ar.attendance_course_id
      AND ar.student_id = roster_u.student_id
LEFT JOIN
    (
        SELECT v.course_id, v.window_id
        FROM icalink_verification_windows v
        INNER JOIN (
            SELECT course_id, MAX(verification_round) AS max_round
            FROM icalink_verification_windows WHERE status IN ('open', 'expired') GROUP BY course_id
        ) AS max_rounds ON v.course_id = max_rounds.course_id AND v.verification_round = max_rounds.max_round
        WHERE v.status IN ('open', 'expired')
    ) AS lw ON sessions.id = lw.course_id
WHERE
    sessions.deleted_at IS NULL;
