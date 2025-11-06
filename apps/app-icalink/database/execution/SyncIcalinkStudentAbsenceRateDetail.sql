-- ==================================================================================================
-- 存储过程：sync_icalink_student_absence_rate_detail (MySQL 5.7 兼容版)
--
-- 功能：
--   每日同步学生缺勤率明细物化表（icalink_student_absence_rate_detail）。
--   该过程会通过 TRUNCATE 清空目标表（同时重置ID），然后从源表中提取、计算最新的统计数据并插入。
--
-- 版本说明：
--   - 兼容 MySQL 5.7，使用派生表（子查询）替代了 CTEs (WITH语句)。
--   - 使用 TRUNCATE TABLE 清空数据，以重置自增ID。
--   - 注意：TRUNCATE 是一个DDL操作，会附带隐式COMMIT，因此本过程不提供整体事务回滚功能。
--
-- 调用方式：
--   CALL sync_icalink_student_absence_rate_detail();
--
-- ==================================================================================================

DROP PROCEDURE IF EXISTS `SyncIcalinkStudentAbsenceRateDetail`;

DELIMITER $$

CREATE PROCEDURE `SyncIcalinkStudentAbsenceRateDetail`()
BEGIN
    -- --------------------------------------------------------------------------
    --  第一步：清空目标物化表
    --  使用 TRUNCATE TABLE 会重置 AUTO_INCREMENT 的值，且性能比 DELETE 好。
    --  注意：此操作会隐式提交，无法回滚。
    -- --------------------------------------------------------------------------
    TRUNCATE TABLE `icalink_student_absence_rate_detail`;

    -- --------------------------------------------------------------------------
    --  第二步和第三步：计算统计数据并插入目标表
    -- --------------------------------------------------------------------------
    INSERT INTO `icalink_student_absence_rate_detail` (
        `student_id`,
        `student_name`,
        `semester`,
        `school_name`,
        `school_id`,
        `class_name`,
        `class_id`,
        `major_name`,
        `major_id`,
        `grade`,
        `gender`,
        `people`,
        `course_code`,
        `course_name`,
        `course_unit_id`,
        `course_unit`,
        `teaching_class_code`,
        `total_sessions`,
        `completed_sessions`,
        `absent_count`,
        `leave_count`,
        `truant_count`,
        `absence_rate`,
        `truant_rate`,
        `leave_rate`
    )
    -- 主查询：整合学生、课程、课时和缺勤数据
    SELECT
        tc.`student_id`,
        tc.`student_name` AS `student_name`,
        css.`semester`,
        MAX(tc.`school_name`) AS `school_name`,
        MAX(tc.`school_id`) AS `school_id`,
        MAX(tc.`class_name`) AS `class_name`,
        MAX(tc.`class_id`) AS `class_id`,
        MAX(tc.`major_name`) AS `major_name`,
        MAX(tc.`major_id`) AS `major_id`,
        MAX(tc.`grade`) AS `grade`,
        MAX(tc.`gender`) AS `gender`,
        MAX(tc.`people`) AS `people`,
        tc.`course_code`,
        MAX(tc.`course_name`) AS `course_name`,
        MAX(tc.`course_unit_id`) AS `course_unit_id`,
        MAX(tc.`course_unit`) AS `course_unit`,
        MAX(tc.`teaching_class_code`) AS `teaching_class_code`,
        
        -- 课时统计
        IFNULL(css.`total_sessions`, 0) AS `total_sessions`,
        IFNULL(css.`completed_sessions`, 0) AS `completed_sessions`,
        
        -- 缺勤统计
        IFNULL(sas.`absent_count`, 0) AS `absent_count`,
        IFNULL(sas.`leave_count`, 0) AS `leave_count`,
        IFNULL(sas.`truant_count`, 0) AS `truant_count`,
        
        -- 比率计算（处理分母为0的情况）
        CASE 
            WHEN IFNULL(css.`completed_sessions`, 0) > 0 
            THEN (IFNULL(sas.`absent_count`, 0) + IFNULL(sas.`truant_count`, 0)) / css.`completed_sessions` 
            ELSE 0 
        END AS `absence_rate`,
        CASE 
            WHEN IFNULL(css.`completed_sessions`, 0) > 0 
            THEN IFNULL(sas.`truant_count`, 0) / css.`completed_sessions` 
            ELSE 0 
        END AS `truant_rate`,
        CASE 
            WHEN IFNULL(css.`completed_sessions`, 0) > 0 
            THEN IFNULL(sas.`leave_count`, 0) / css.`completed_sessions` 
            ELSE 0 
        END AS `leave_rate`

    FROM `v_teaching_class` tc -- 使用包含完整学生-课程关系的视图作为驱动表
    
    -- 派生表1: 聚合计算每门课程的总课时数和已发生课时数 (替代CTE)
    -- 使用 INNER JOIN 过滤掉在 icasync_attendance_courses 中没有任何课时记录的课程
    INNER JOIN (
        SELECT
            `course_code`,
            `semester`,
            COUNT(*) AS `total_sessions`,
            -- 修改：只计算今天之前的课程作为“已完成”
            SUM(CASE WHEN DATE(`start_time`) < CURDATE() THEN 1 ELSE 0 END) AS `completed_sessions`
        FROM `icasync_attendance_courses`
        WHERE `deleted_at` IS NULL -- 仅统计未被删除的课程
        GROUP BY `course_code`
    ) AS css ON tc.`course_code` = css.`course_code`

    -- 派生表2: 聚合计算每个学生每门课程的缺勤、请假、旷课次数 (替代CTE)
    LEFT JOIN (
        SELECT
            asr.`student_id`,
            asr.`course_code`,
            -- 修改：缺勤次数 = 旷课 + 请假
            SUM(CASE WHEN asr.`absence_type` in ('absent','pending_approval') THEN 1 ELSE 0 END) AS `absent_count`,
            -- 修改：请假次数包括 'leave' 和 'leave_pending'
            SUM(CASE WHEN asr.`absence_type` IN ('leave', 'leave_pending') THEN 1 ELSE 0 END) AS `leave_count`,
            SUM(CASE WHEN asr.`absence_type` = 'truant' THEN 1 ELSE 0 END) AS `truant_count` -- 旷课次数
        FROM `icalink_absent_student_relations` asr
        -- 新增：JOIN考勤课程表，以过滤掉已删除课节的缺勤记录
        INNER JOIN `icasync_attendance_courses` ac ON asr.course_id = ac.id
        WHERE ac.deleted_at IS NULL -- 只统计未被软删除的课节所对应的缺勤
        GROUP BY asr.`student_id`, asr.`course_code`
    ) AS sas ON tc.`student_id` = sas.`student_id` AND tc.`course_code` = sas.`course_code`
    
    GROUP BY tc.`student_id`, tc.`course_code`;

END$$

DELIMITER ;