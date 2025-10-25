-- 测试学生学期考勤统计视图
-- 用于验证 v_student_semester_attendance_stats 视图是否正常工作

-- 1. 查询特定学生的统计数据（替换为实际的学生ID）
SELECT * 
FROM v_student_semester_attendance_stats 
WHERE student_id = '你的学生ID'
LIMIT 10;

-- 2. 查询特定学期的所有学生统计（替换为实际的学期）
SELECT * 
FROM v_student_semester_attendance_stats 
WHERE semester = '2024-2025-1'
ORDER BY attendance_rate DESC
LIMIT 20;

-- 3. 查询特定班级的统计数据
SELECT * 
FROM v_student_semester_attendance_stats 
WHERE class_name = '你的班级名称'
  AND semester = '2024-2025-1'
ORDER BY attendance_rate DESC;

-- 4. 统计概览 - 查看整体数据分布
SELECT 
    semester,
    COUNT(*) AS student_count,
    AVG(total_courses) AS avg_total_courses,
    AVG(completed_courses) AS avg_completed_courses,
    AVG(attendance_rate) AS avg_attendance_rate,
    MIN(attendance_rate) AS min_attendance_rate,
    MAX(attendance_rate) AS max_attendance_rate
FROM v_student_semester_attendance_stats
GROUP BY semester
ORDER BY semester DESC;

-- 5. 查找出勤率低于60%的学生
SELECT 
    student_id,
    student_name,
    class_name,
    semester,
    total_courses,
    completed_courses,
    absence_count,
    leave_count,
    attendance_count,
    attendance_rate
FROM v_student_semester_attendance_stats
WHERE attendance_rate < 60
  AND completed_courses > 0  -- 只统计已有课程的学生
ORDER BY attendance_rate ASC;

-- 6. 查看视图结构
DESCRIBE v_student_semester_attendance_stats;

-- 7. 查看视图定义
SHOW CREATE VIEW v_student_semester_attendance_stats;

