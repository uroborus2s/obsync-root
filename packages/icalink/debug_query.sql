-- 调试查询：检查学生请假申请数据重复问题

-- 1. 查看学生考勤记录表中的请假申请数据
SELECT 
    id,
    attendance_record_id,
    xh,
    xm,
    status,
    leave_reason,
    leave_time,
    created_at
FROM icalink_student_attendance 
WHERE leave_reason IS NOT NULL 
  AND leave_reason != ''
ORDER BY created_at DESC;

-- 2. 查看考勤记录表
SELECT 
    id,
    kkh,
    kcmc,
    rq,
    sj_f,
    sj_t
FROM icalink_attendance_records
ORDER BY created_at DESC;

-- 3. 查看课表数据（可能导致重复的表）
SELECT 
    kkh,
    rq,
    room,
    COUNT(*) as count
FROM u_jw_kcb_cur 
GROUP BY kkh, rq, room
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. 模拟原来的查询（可能产生重复记录）
SELECT 
    sa.id,
    ar.kcmc as course_name,
    ar.rq as class_date,
    ar.sj_f as start_time,
    ar.sj_t as end_time,
    kcb.room as class_location,
    sa.leave_reason,
    sa.status,
    sa.created_at
FROM icalink_student_attendance sa
INNER JOIN icalink_attendance_records ar ON sa.attendance_record_id = ar.id
LEFT JOIN u_jw_kcb_cur kcb ON kcb.kkh = ar.kkh AND kcb.rq = ar.rq
WHERE sa.leave_reason IS NOT NULL 
  AND sa.leave_reason != ''
ORDER BY sa.created_at DESC;

-- 5. 修复后的查询（应该不会重复）
SELECT 
    sa.id,
    ar.kcmc as course_name,
    ar.rq as class_date,
    ar.sj_f as start_time,
    ar.sj_t as end_time,
    ar.kkh,
    sa.leave_reason,
    sa.status,
    sa.created_at
FROM icalink_student_attendance sa
INNER JOIN icalink_attendance_records ar ON sa.attendance_record_id = ar.id
WHERE sa.leave_reason IS NOT NULL 
  AND sa.leave_reason != ''
ORDER BY sa.created_at DESC;

-- 6. 获取教室信息的单独查询
SELECT DISTINCT
    kkh,
    room
FROM u_jw_kcb_cur 
WHERE kkh IN (
    SELECT DISTINCT ar.kkh 
    FROM icalink_student_attendance sa
    INNER JOIN icalink_attendance_records ar ON sa.attendance_record_id = ar.id
    WHERE sa.leave_reason IS NOT NULL 
      AND sa.leave_reason != ''
)
GROUP BY kkh, room; 