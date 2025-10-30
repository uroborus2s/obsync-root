-- 1. 先删除旧的存储过程（如果存在）
DROP PROCEDURE IF EXISTS icasync.SyncTeachingClass;

-- 2. 修改分隔符，创建新的存储过程
DELIMITER //

CREATE PROCEDURE icasync.SyncTeachingClass()
BEGIN
  -- 步骤1：清空目标表（TRUNCATE 效率更高，且重置自增ID计数器）
  TRUNCATE TABLE icasync.icalink_teaching_class;
  
  -- 步骤2：从视图插入数据（不指定id，自动生成）
  INSERT INTO icasync.icalink_teaching_class (
    student_id, course_code, student_name, school_name, college_code,
    major_name, class_name, course_name, course_unit, teaching_class_code
  )
  SELECT  -- 严格对应视图的字段顺序
    student_id, course_code, student_name, school_name, college_code,
    major_name, class_name, course_name, course_unit, teaching_class_code
  FROM v_teaching_class;
END //

DELIMITER ;  -- 恢复默认分隔符



-- 设置同步任务


-- 2. 创建每日同步事件
CREATE EVENT icasync.daily_sync_teaching_class
ON SCHEDULE
  EVERY 1 DAY
  STARTS '2025-10-29 03:00:00'  -- 首次执行时间（凌晨3点，低峰期）
DO
  CALL icasync.SyncTeachingClass();  -- 调用同步存储过程