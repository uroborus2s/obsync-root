DELIMITER //

CREATE EVENT IF NOT EXISTS `evt_daily_attendance_archive`
ON SCHEDULE
    EVERY 1 DAY
    STARTS TIMESTAMP(CURDATE(), '02:00:00')
    COMMENT 'Daily attendance archiving and summarization event'
DO
BEGIN
    -- Call the stored procedure to archive and summarize attendance data for the effective day
    CALL ArchiveAndSummarizeRange();
END //

DELIMITER ;

-- To enable the event scheduler, run: SET GLOBAL event_scheduler = ON;