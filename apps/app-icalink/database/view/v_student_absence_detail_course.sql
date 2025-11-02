-- =====================================================
-- 视图：v_student_absence_detail_by_course
-- =====================================================
-- 用途：获取每个学生每门课的详细缺勤明细
-- 数据源：
--   - icalink_student_absence_rate_detail（主表，学生课程统计）
--   - icalink_absent_student_relations（缺勤记录明细）
--   - icasync_attendance_courses（课程信息）
-- =====================================================

DROP VIEW IF EXISTS v_student_absence_detail_by_course;

CREATE OR REPLACE VIEW v_student_absence_detail_course AS
SELECT
    -- 学生基本信息
    d.student_id,
    d.student_name,
    d.semester,
    d.school_name,
    d.school_id,
    d.class_name,
    d.class_id,
    d.major_name,
    d.major_id,
    d.grade,
    d.gender,
    d.people,

    -- 课程基本信息
    d.course_code,
    d.course_name,
    d.course_unit_id,
    d.course_unit,
    d.teaching_class_code,
    
    -- 课次统计
    d.total_sessions,
    d.completed_sessions,
    
    -- 缺勤统计
    d.absent_count,
    d.leave_count,
    d.truant_count,
    
    -- 缺勤率
    d.absence_rate,
    d.truant_rate,
    d.leave_rate,
    
    -- 缺勤明细（从 icalink_absent_student_relations 聚合）
    -- 缺勤记录数
    COUNT(DISTINCT asr.id) AS absence_record_count,
    
    -- 最近一次缺勤日期
    MAX(asr.stat_date) AS last_absence_date,
    
    -- 最早一次缺勤日期
    MIN(asr.stat_date) AS first_absence_date,
    
    -- 缺勤类型分布（JSON格式）
    JSON_OBJECT(
        'absent', SUM(CASE WHEN asr.absence_type = 'absent' THEN 1 ELSE 0 END),
        'truant', SUM(CASE WHEN asr.absence_type = 'truant' THEN 1 ELSE 0 END),
        'leave', SUM(CASE WHEN asr.absence_type = 'leave' THEN 1 ELSE 0 END),
        'leave_pending', SUM(CASE WHEN asr.absence_type = 'leave_pending' THEN 1 ELSE 0 END)
    ) AS absence_type_distribution,
    
    -- 按教学周统计缺勤次数（JSON数组）
    GROUP_CONCAT(
        DISTINCT CONCAT(asr.teaching_week, ':', COUNT(asr.id))
        ORDER BY asr.teaching_week
        SEPARATOR ','
    ) AS absence_by_week,
    
    -- 课程时间信息（从 icasync_attendance_courses 获取）
    MIN(ac.start_time) AS course_start_time,
    MAX(ac.end_time) AS course_end_time,
    
    -- 统计时间
    d.created_at,
    d.updated_at

FROM icalink_student_absence_rate_detail d

-- 左连接缺勤记录表（获取详细缺勤记录）
LEFT JOIN icalink_absent_student_relations asr
    ON d.student_id = asr.student_id
    AND d.course_code = asr.course_code
    AND d.semester = asr.semester

-- 左连接课程表（获取课程时间信息）
LEFT JOIN icasync_attendance_courses ac
    ON d.course_code = ac.course_code
    AND d.semester = ac.semester
    AND ac.deleted_at IS NULL

GROUP BY
    d.id,
    d.student_id,
    d.student_name,
    d.semester,
    d.school_name,
    d.school_id,
    d.class_name,
    d.class_id,
    d.major_name,
    d.major_id,
    d.grade,
    d.gender,
    d.people,
    d.course_code,
    d.course_name,
    d.course_unit_id,
    d.course_unit,
    d.teaching_class_code,
    d.total_sessions,
    d.completed_sessions,
    d.absent_count,
    d.leave_count,
    d.truant_count,
    d.absence_rate,
    d.truant_rate,
    d.leave_rate,
    d.created_at,
    d.updated_at

-- 按缺勤率降序排序
ORDER BY d.absence_rate DESC;

-- =====================================================
-- 视图说明
-- =====================================================
-- 1. 本视图结合了三张表的数据：
--    - icalink_student_absence_rate_detail: 统计数据
--    - icalink_absent_student_relations: 缺勤明细记录
--    - icasync_attendance_courses: 课程时间信息
-- 
-- 2. 提供的信息包括：
--    - 学生和课程的基本信息
--    - 统计数据（课次、缺勤次数、缺勤率）
--    - 缺勤明细（记录数、日期范围、类型分布）
--    - 课程时间信息
-- 
-- 3. 适用场景：
--    - 查看学生某门课的详细缺勤情况
--    - 分析缺勤趋势（按周统计）
--    - 导出学生课程缺勤报表
--    - 辅导员查看学生出勤详情
-- 
-- 4. 性能优化建议：
--    - 使用 WHERE 条件过滤 student_id 或 course_code
--    - 物化表已有索引，查询性能较好
--    - 如需频繁查询，可考虑物化此视图
-- =====================================================

SELECT '✅ 视图 v_student_absence_detail_by_course 创建成功' AS status;

