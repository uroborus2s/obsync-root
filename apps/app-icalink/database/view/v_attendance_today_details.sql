CREATE OR REPLACE VIEW v_attendance_today_details AS
SELECT
  STRAIGHT_JOIN
  sessions.id              AS attendance_course_id,
  arh.id AS attendance_record_id,
  sessions.external_id,
  sessions.course_code,
  sessions.course_name,
  sessions.created_at,
  tc.student_id,
  tc.student_name,
  tc.class_name,
  tc.grade,
  tc.gender,
  tc.people,
  tc.class_id,
  tc.school_id,
  tc.major_id,
  tc.major_name,
  tc.school_name,
  tc.course_unit_id,
  tc.course_unit,
  tc.teaching_class_code,
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
  sessions.need_checkin,
  CASE
    WHEN arh.last_checkin_source = 'manual' THEN arh.status
    WHEN arh.status IN ('leave', 'leave_pending') THEN arh.status
    WHEN lw.window_id IS NOT NULL THEN
      CASE
        WHEN arh.window_id = lw.window_id THEN arh.status
        WHEN arh.status IN ('present','pending_approval') AND (arh.window_id <> lw.window_id OR arh.window_id IS NULL) THEN 'truant'
        ELSE 'absent'
      END
    WHEN arh.id IS NOT NULL THEN arh.status
    ELSE 'absent'
  END AS final_status
FROM icasync.icasync_attendance_courses AS sessions
JOIN icalink_teaching_class AS tc
  ON tc.course_code = sessions.course_code
-- Subquery to calculate current schedule info with custom day definition (01:02 AM cutoff)
CROSS JOIN (
  SELECT
    FLOOR(DATEDIFF(
      IF(TIME(NOW()) < '02:05:00', CURDATE() - INTERVAL 1 DAY, CURDATE()),
      DATE_SUB(term_start_date, INTERVAL WEEKDAY(term_start_date) DAY)
    ) / 7) + 1 AS current_teaching_week,
    WEEKDAY(IF(TIME(NOW()) < '02:05:00', CURDATE() - INTERVAL 1 DAY, CURDATE())) + 1 AS current_weekday
  FROM (
    -- Fetches the semester start date from the config table.
    SELECT (SELECT config_value FROM icalink_system_configs WHERE config_key = 'term.start_date' LIMIT 1) AS term_start_date
  ) AS calendar_info
) AS current_schedule
LEFT JOIN icalink_attendance_records AS arh
  ON arh.attendance_course_id = sessions.id
 AND arh.student_id = tc.student_id
 AND arh.id = (
      SELECT arh2.id
      FROM icalink_attendance_records AS arh2
      WHERE arh2.attendance_course_id = sessions.id
        AND arh2.student_id = tc.student_id
      ORDER BY arh2.id DESC
      LIMIT 1
 )
LEFT JOIN (
  SELECT v.course_id, v.window_id
  FROM icalink_verification_windows v
  INNER JOIN (
    SELECT course_id, MAX(verification_round) AS max_round
    FROM icalink_verification_windows
    WHERE status IN ('open', 'expired')
    GROUP BY course_id
  ) mr
    ON v.course_id = mr.course_id AND v.verification_round = mr.max_round
  WHERE v.status IN ('open', 'expired')
) AS lw
  ON lw.course_id = sessions.id
-- Filter sessions to match today's calculated teaching week and weekday
WHERE sessions.deleted_at IS NULL
  AND sessions.teaching_week = current_schedule.current_teaching_week
  AND sessions.need_checkin = 1
  AND sessions.week_day = current_schedule.current_weekday
  AND current_schedule.current_teaching_week <= 18;