-- ====================================================================
-- v_attendance_realtime_details VIEW (v4 - Performance Optimization)
-- ====================================================================
-- Description:
-- 优化多条签到记录的查询性能
-- 使用相关子查询 + 索引优化，避免全表扫描
--
-- 性能优化策略：
-- 1. 使用相关子查询代替 INNER JOIN + GROUP BY
-- 2. 利用 (attendance_course_id, student_id, id) 复合索引
-- 3. 避免对大表进行全表 GROUP BY
--
-- 注意：唯一约束已被删除，学生可以有多条签到记录（正常签到 + 补签）
-- ====================================================================

DROP VIEW IF EXISTS v_attendance_realtime_details;

CREATE VIEW v_attendance_realtime_details AS
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
      ON sessions.id = ar.attendance_course_id
      AND ar.student_id = roster_u.student_id
      -- 关键优化：使用相关子查询获取最新记录的 id
      AND ar.id = (
          SELECT id
          FROM icalink_attendance_records ar_inner
          WHERE ar_inner.attendance_course_id = sessions.id
            AND ar_inner.student_id = roster_u.student_id
          ORDER BY ar_inner.id DESC
          LIMIT 1
      )
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

