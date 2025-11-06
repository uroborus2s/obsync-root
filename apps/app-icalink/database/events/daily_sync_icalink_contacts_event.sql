-- Event to run the sync procedure daily
DELIMITER //
CREATE EVENT IF NOT EXISTS `daily_sync_icalink_contacts_event`
ON SCHEDULE
    EVERY 1 DAY
    STARTS TIMESTAMP(CURDATE(), '01:32:00')
DO
BEGIN
    CALL `SyncIcalinkContacts`();
END//
DELIMITER ;