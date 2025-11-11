CREATE OR REPLACE VIEW v_attendance_future_details AS
SELECT
  STRAIGHT_JOIN
  sessions.id              AS attendance_course_id,
  sessions.external_id,
  sessions.course_code,
  sessions.course_name,
  sessions.created_at,
  tc.student_id,
  tc.student_name,
  tc.class_name,
  tc.major_name,
  tc.school_name,
  tc.grade,
  tc.gender,
  tc.people,
  tc.class_id,
  tc.school_id,
  tc.major_id,
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
WHERE sessions.deleted_at IS NULL
      and sessions.need_checkin =1;