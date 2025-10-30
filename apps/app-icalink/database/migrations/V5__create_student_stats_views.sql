-- =====================================================
-- @wps/app-icalink 学生历史统计视图
-- =====================================================
-- 文件名: V5__create_student_stats_views.sql
-- 创建时间: 2025-10-26
-- 描述: 创建学生历史统计视图和学生历史统计详情视图
-- 版本: 5.0.0
-- 依赖: MySQL 5.7+
-- =====================================================

SET NAMES utf8mb4;

-- =====================================================
-- 视图 1: 学生历史统计表
-- v_student_overall_attendance_stats
-- =====================================================
-- 功能说明:
-- 1. 按学生汇总历史出勤统计数据（基于历史记录表）
-- 2. 统计每个学生的课节总数、已上课节数、缺勤节数、请假节数、旷课次数、缺勤率
-- 3. 数据来源: v_teaching_class (教学班视图)、icasync_attendance_courses (课程表)、icalink_attendance_records_history (历史记录表)
-- 4. 字段定义参考: STUDENT_STATISTICS_FIELDS (11个字段)
-- =====================================================

DROP VIEW IF EXISTS `v_student_overall_attendance_stats`;

CREATE OR REPLACE VIEW `v_student_overall_attendance_stats` AS
SELECT
    -- 学生基本信息
    tc.student_id,
    tc.name,
    tc.school_name,
    tc.major_name,
    tc.class_name,
    
    -- 课节总数：通过显式关联计算（替代子查询）
    COUNT(DISTINCT ac2.id) AS total_sessions,
    
    -- 已经上课节数：与总课节数一致（同 total_sessions）
    COUNT(DISTINCT ac2.id) AS completed_sessions,
    
    -- 缺勤节数
    COALESCE(SUM(CASE 
        WHEN arh.status IN ('absent', 'truant', 'leave', 'leave_pending') 
        THEN 1 
        ELSE 0 
    END), 0) AS absent_count,
    
    -- 请假节数
    COALESCE(SUM(CASE 
        WHEN arh.status IN ('leave', 'leave_pending') 
        THEN 1 
        ELSE 0 
    END), 0) AS leave_count,
    
    -- 旷课次数
    COALESCE(SUM(CASE 
        WHEN arh.status = 'truant' 
        THEN 1 
        ELSE 0 
    END), 0) AS truant_count,
    
    -- 缺勤率%
    ROUND(
        COALESCE(SUM(CASE 
            WHEN arh.status IN ('absent', 'truant', 'leave', 'leave_pending') 
            THEN 1 
            ELSE 0 
        END), 0) * 100.0 / NULLIF(COUNT(DISTINCT ac2.id), 0),
        2
    ) AS absence_rate

FROM
    v_teaching_class tc
-- 关联课程表，计算总课节数（替代子查询）
LEFT JOIN icasync.icasync_attendance_courses ac2
    ON EXISTS (
        SELECT 1 FROM syncdb.out_jw_kcb_xs xs
        WHERE xs.kkh = ac2.course_code
          AND xs.xh = tc.student_id  -- 直接关联 tc.student_id
          AND xs.zt IN ('add', 'update')
    )
    AND ac2.start_time < CURDATE()
    AND ac2.deleted_at IS NULL
-- 关联历史记录表，统计出勤状态
LEFT JOIN icalink_attendance_records_history arh
    ON arh.attendance_course_id = ac2.id  -- 关联课程ID
    AND arh.student_id = tc.student_id    -- 关联学生ID
GROUP BY
    tc.student_id,
    tc.name,
    tc.school_name,
    tc.major_name,
    tc.class_name;

-- =====================================================
-- 视图 2: 学生历史统计详情表
-- v_student_overall_attendance_stats_details
-- =====================================================
-- 功能说明:
-- 1. 按学生 + 课程汇总历史出勤统计数据（包含课程详细信息）
-- 2. 统计每个学生在每门课程的详细信息和统计数据
-- 3. 数据来源: v_teaching_class (教学班视图)、icasync_attendance_courses (课程表)、icalink_attendance_records_history (历史记录表)
-- 4. 字段定义参考: STUDENT_STATISTICS_DETAILS_FIELDS (23个字段)
-- =====================================================

DROP VIEW IF EXISTS `v_student_overall_attendance_stats_details`;

CREATE OR REPLACE VIEW `v_student_overall_attendance_stats_details` AS
SELECT
    -- 学生基本信息
    tc.student_id,
    tc.course_code,
    tc.course_name,
    tc.name,
    tc.school_name,
    tc.major_name,
    tc.class_name,
    
    -- 课程详细信息
    ac.class_location,
    ac.teacher_names AS teacher_name,
    ac.teacher_codes,
    ac.semester,
    ac.teaching_week,
    ac.week_day,
    ac.time_period,
    ac.periods,
    ac.start_time,
    ac.end_time,
    
    -- 课节总数：该课程的总课节数（截止到昨天）
    COUNT(DISTINCT ac.id) AS total_sessions,
    
    -- 已经上课节数：截止到昨天的课节数（与total_sessions相同）
    COUNT(DISTINCT ac.id) AS completed_sessions,
    
    -- 缺勤节数：从历史记录表统计 status IN ('absent', 'truant', 'leave', 'leave_pending')
    COALESCE(SUM(CASE 
        WHEN arh.status IN ('absent', 'truant', 'leave', 'leave_pending') 
        THEN 1 
        ELSE 0 
    END), 0) AS absent_count,
    
    -- 请假节数：从历史记录表统计 status IN ('leave', 'leave_pending')
    COALESCE(SUM(CASE 
        WHEN arh.status IN ('leave', 'leave_pending') 
        THEN 1 
        ELSE 0 
    END), 0) AS leave_count,
    
    -- 旷课次数：从历史记录表统计 status = 'truant'
    COALESCE(SUM(CASE 
        WHEN arh.status = 'truant' 
        THEN 1 
        ELSE 0 
    END), 0) AS truant_count,
    
    -- 缺勤率%：缺勤节数 / 总课节数 * 100
    ROUND(
        COALESCE(SUM(CASE 
            WHEN arh.status IN ('absent', 'truant', 'leave', 'leave_pending') 
            THEN 1 
            ELSE 0 
        END), 0) * 100.0 / NULLIF(COUNT(DISTINCT ac.id), 0),
        2
    ) AS absence_rate

FROM
    v_teaching_class tc
JOIN
    icasync.icasync_attendance_courses ac
    ON ac.course_code = tc.course_code
    AND ac.start_time < CURDATE()
    AND ac.deleted_at IS NULL
LEFT JOIN
    icalink_attendance_records_history arh
    ON arh.attendance_course_id = ac.id
    AND arh.student_id = tc.student_id
GROUP BY
    tc.student_id,
    tc.course_code,
    tc.course_name,
    tc.name,
    tc.school_name,
    tc.major_name,
    tc.class_name,
    ac.class_location,
    ac.teacher_names,
    ac.teacher_codes,
    ac.semester,
    ac.teaching_week,
    ac.week_day,
    ac.time_period,
    ac.periods,
    ac.start_time,
    ac.end_time;

-- =====================================================
-- 验证视图创建结果
-- =====================================================

-- 验证视图 1 是否创建成功
SELECT 
    TABLE_NAME as '视图名称',
    TABLE_COMMENT as '视图说明'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'v_student_overall_attendance_stats'
  AND TABLE_TYPE = 'VIEW';

-- 验证视图 2 是否创建成功
SELECT 
    TABLE_NAME as '视图名称',
    TABLE_COMMENT as '视图说明'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'v_student_overall_attendance_stats_details'
  AND TABLE_TYPE = 'VIEW';

-- =====================================================
-- 使用示例
-- =====================================================

-- 示例 1: 查询某个学生的整体统计
-- SELECT * FROM v_student_overall_attendance_stats 
-- WHERE student_id = '2021001';

-- 示例 2: 查询所有学生的整体统计，按缺勤率降序
-- SELECT * FROM v_student_overall_attendance_stats 
-- ORDER BY absence_rate DESC
-- LIMIT 20;

-- 示例 3: 查询某个学生的所有课程详细统计
-- SELECT * FROM v_student_overall_attendance_stats_details 
-- WHERE student_id = '2021001'
-- ORDER BY absence_rate DESC;

-- 示例 4: 查询某门课程所有学生的详细统计
-- SELECT * FROM v_student_overall_attendance_stats_details 
-- WHERE course_code = '202420252003013016705'
-- ORDER BY absence_rate DESC;

-- =====================================================
-- 执行完成
-- =====================================================

