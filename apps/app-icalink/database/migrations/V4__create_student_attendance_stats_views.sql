-- =====================================================
-- @wps/app-icalink 学生缺勤统计视图
-- =====================================================
-- 文件名: V4__create_student_attendance_stats_views.sql
-- 创建时间: 2025-10-25
-- 描述: 创建学生缺勤统计视图，用于统计学生的整体缺勤情况和每门课程的缺勤情况
-- 版本: 4.0.0
-- 依赖: MySQL 5.6+
-- =====================================================

SET NAMES utf8mb4;

-- =====================================================
-- 视图 1: 学生整体出勤统计视图
-- view_student_overall_attendance_stats
-- =====================================================
-- 功能说明:
-- 1. 按学生汇总截止到当日（不包括当日）的出勤统计数据
-- 2. 统计每个学生选修的课程总数、课节总数、出勤次数、迟到次数、请假次数、缺勤次数
-- 3. 数据来源: icalink_attendance_records_history (历史出勤记录表)
-- 4. 关联表: icasync.icasync_attendance_courses (课程表)、syncdb.out_jw_kcb_xs (学生选课表)、syncdb.out_xsxx (学生信息表)
-- =====================================================

DROP VIEW IF EXISTS `view_student_overall_attendance_stats`;

CREATE OR REPLACE VIEW `view_student_overall_attendance_stats` AS
SELECT
    -- 学生基本信息
    tc.student_id,
    tc.name AS student_name,
    tc.class_name,
    tc.major_name,
    tc.school_name,
    ac.semester,

    -- 课程统计：该学生选修的课程总数
    COUNT(DISTINCT tc.course_code) AS total_courses,

    -- 课节统计：截止到昨天该学生所有课程的总课节数
    (
        SELECT COUNT(DISTINCT ac2.id)
        FROM icasync.icasync_attendance_courses ac2
        JOIN syncdb.out_jw_kcb_xs xs
            ON xs.kkh = ac2.course_code
            AND xs.xh = tc.student_id
            AND xs.zt IN ('add', 'update')
        WHERE ac2.start_time < CURDATE()
          AND ac2.deleted_at IS NULL
          AND ac2.semester = ac.semester
    ) AS total_sessions,

    -- 出勤统计：status = 'present'
    SUM(CASE
        WHEN arh.status = 'present' THEN 1
        ELSE 0
    END) AS present_count,

    -- 迟到统计：status = 'late'
    SUM(CASE
        WHEN arh.status = 'late' THEN 1
        ELSE 0
    END) AS late_count,

    -- 请假统计：status IN ('leave', 'leave_pending', 'pending_approval')
    SUM(CASE
        WHEN arh.status IN ('leave', 'leave_pending', 'pending_approval') THEN 1
        ELSE 0
    END) AS leave_count,

    -- 缺勤统计：status IN ('absent', 'truant')
    SUM(CASE
        WHEN arh.status IN ('absent', 'truant') THEN 1
        ELSE 0
    END) AS absent_count,

    -- 统计截止日期（当前日期）
    CURDATE() AS stat_date

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
    tc.name,
    tc.class_name,
    tc.major_name,
    tc.school_name,
    ac.semester;

-- =====================================================
-- 视图 2: 学生每门课出勤统计视图
-- view_student_course_attendance_stats
-- =====================================================
-- 功能说明:
-- 1. 按学生 + 课程汇总截止到当日（不包括当日）的出勤统计数据
-- 2. 统计每个学生在每门课程的课节总数、出勤次数、迟到次数、请假次数、缺勤次数、出勤率
-- 3. 数据来源: icalink_attendance_records_history (历史出勤记录表)
-- 4. 关联表: icasync.icasync_attendance_courses (课程表)、v_teaching_class (学生选课视图)
-- =====================================================

DROP VIEW IF EXISTS `view_student_course_attendance_stats`;

CREATE OR REPLACE VIEW `view_student_course_attendance_stats` AS
SELECT
    -- 学生基本信息
    tc.student_id,
    tc.name AS student_name,
    tc.class_name,
    tc.major_name,
    tc.school_name,

    -- 课程信息
    tc.course_code,
    tc.course_name,
    ac.semester,

    -- 课节总数（该课程截止到昨天的所有课节）
    COUNT(DISTINCT ac.id) AS total_sessions,

    -- 出勤统计：status = 'present'
    SUM(CASE
        WHEN arh.status = 'present' THEN 1
        ELSE 0
    END) AS present_count,

    -- 迟到统计：status = 'late'
    SUM(CASE
        WHEN arh.status = 'late' THEN 1
        ELSE 0
    END) AS late_count,

    -- 请假统计：status IN ('leave', 'leave_pending', 'pending_approval')
    SUM(CASE
        WHEN arh.status IN ('leave', 'leave_pending', 'pending_approval') THEN 1
        ELSE 0
    END) AS leave_count,

    -- 缺勤统计：status IN ('absent', 'truant')
    SUM(CASE
        WHEN arh.status IN ('absent', 'truant') THEN 1
        ELSE 0
    END) AS absent_count,

    -- 出勤率计算
    -- 出勤率 = (出勤次数 + 迟到次数) / 总课节数 * 100
    -- 注意：请假不计入出勤率，缺勤降低出勤率
    ROUND(
        (
            SUM(CASE
                WHEN arh.status IN ('present', 'late') THEN 1
                ELSE 0
            END) * 100.0
        ) / NULLIF(COUNT(DISTINCT ac.id), 0),
        2
    ) AS attendance_rate

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
    tc.name,
    tc.class_name,
    tc.major_name,
    tc.school_name,
    tc.course_code,
    tc.course_name,
    ac.semester;

-- =====================================================
-- 验证视图创建结果
-- =====================================================

-- 验证视图 1 是否创建成功
SELECT 
    TABLE_NAME as '视图名称',
    TABLE_COMMENT as '视图说明'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'view_student_overall_attendance_stats'
  AND TABLE_TYPE = 'VIEW';

-- 验证视图 2 是否创建成功
SELECT 
    TABLE_NAME as '视图名称',
    TABLE_COMMENT as '视图说明'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'view_student_course_attendance_stats'
  AND TABLE_TYPE = 'VIEW';

-- =====================================================
-- 使用示例
-- =====================================================

-- 示例 1: 查询某个学生的整体缺勤统计
-- SELECT * FROM view_student_overall_attendance_stats 
-- WHERE student_id = '2021001';

-- 示例 2: 查询某个学期所有学生的整体缺勤统计，按缺勤次数降序
-- SELECT * FROM view_student_overall_attendance_stats 
-- WHERE semester = '2024-2025-1'
-- ORDER BY absent_count DESC;

-- 示例 3: 查询某个学生在某门课程的缺勤统计
-- SELECT * FROM view_student_course_attendance_stats 
-- WHERE student_id = '2021001' AND course_code = '202420252003013016705';

-- 示例 4: 查询某门课程所有学生的缺勤统计，按出勤率升序
-- SELECT * FROM view_student_course_attendance_stats 
-- WHERE course_code = '202420252003013016705'
-- ORDER BY attendance_rate ASC;

-- 示例 5: 查询出勤率低于60%的学生课程记录
-- SELECT * FROM view_student_course_attendance_stats 
-- WHERE attendance_rate < 60
-- ORDER BY attendance_rate ASC;

-- =====================================================
-- 执行完成
-- =====================================================
-- 
-- 创建的视图:
-- 1. view_student_overall_attendance_stats - 学生整体缺勤统计视图
-- 2. view_student_course_attendance_stats - 学生每门课缺勤统计视图
-- 
-- 执行时间: 预计 < 5 秒
-- 适用版本: MySQL 5.6+
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- =====================================================

