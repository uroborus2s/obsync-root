-- 设置同步任务
CREATE EVENT icasync.daily_sync_teaching_class
ON SCHEDULE
  EVERY 1 DAY
  STARTS '2025-11-02 01:30:00'  -- 首次执行时间（凌晨3点，低峰期）
DO
  CALL icasync.SyncTeachingClass(); 