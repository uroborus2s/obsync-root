-- Stored Procedure to sync data from v_contacts to icalink_contacts
DELIMITER $$
CREATE PROCEDURE `SyncIcalinkContacts`()
BEGIN
    -- Truncate the table to clear old data
    TRUNCATE TABLE `icalink_contacts`;

    -- Insert new data from the view
    INSERT INTO `icalink_contacts` (
        `user_id`,
        `user_name`,
        `school_id`,
        `school_name`,
        `major_id`,
        `major_name`,
        `class_id`,
        `class_name`,
        `gender`,
        `grade`,
        `people`,
        `position`,
        `role`
    )
    SELECT
        `user_id`,
        `user_name`,
        `school_id`,
        `school_name`,
        `major_id`,
        `major_name`,
        `class_id`,
        `class_name`,
        `gender`,
        `grade`,
        `people`,
        `position`,
        `role`
    FROM `v_contacts`;
END$$
DELIMITER ;

