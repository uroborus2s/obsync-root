-- ==================================================================================================
-- MySQL Event: evt_daily_sync_student_absence_rate
--
-- 功能：
--   创建一个每日定时任务，在每天凌晨 2:10 AM 自动调用存储过程
--   `SyncIcalinkStudentAbsenceRateDetail`，以更新学生缺勤率物化表。
--
-- 前提条件：
--   - 存储过程 `SyncIcalinkStudentAbsenceRateDetail` 必须已存在于数据库中。
--   - MySQL的事件调度器（Event Scheduler）必须已开启。
--
-- 如何启用Event Scheduler:
--   SET GLOBAL event_scheduler = ON;
--
-- 如何查看Event Scheduler状态:
--   SHOW VARIABLES LIKE 'event_scheduler';
--
-- ==================================================================================================

-- 如果存在同名事件，则先删除
DROP EVENT IF EXISTS `evt_daily_sync_student_absence_rate`;

DELIMITER $$

CREATE EVENT `evt_daily_sync_student_absence_rate`
ON SCHEDULE
    -- 调度计划：每天执行一次
    EVERY 1 DAY
    -- 首次执行时间：从下一个匹配到的凌晨 2:10 AM 开始
    STARTS TIMESTAMP(CURDATE(), '02:10:00')
    ON COMPLETION PRESERVE
    COMMENT '每日定时同步学生缺勤率明细表'
DO
BEGIN
    -- 调用核心的同步存储过程
    CALL SyncIcalinkStudentAbsenceRateDetail();
END$$

DELIMITER ;
