--
-- View `v_course_checkin_stats_by_class`
--
-- This view provides a summary of check-in statistics for each teaching class,
-- calculating absence and truancy rates.
--
CREATE OR REPLACE VIEW `v_course_checkin_stats_class` AS
SELECT
    `teaching_class_code`,
    MAX(`course_name`) AS `course_name`,
    MAX(`semester`) AS `semester`,
    MAX(`course_unit_id`) AS `course_unit_id`,
    MAX(`course_unit`) AS `course_unit`,
    MIN(`teaching_week`) AS `start_week`,
    MAX(`teaching_week`) AS `end_week`,
    MIN(DATE(`start_time`)) AS `start_time`,
    MAX(DATE(`end_time`)) AS `end_time`,
    COUNT(DISTINCT `course_code`) AS `course_code_count`,
    SUM(`total_should_attend`) AS `total_should_attend`,
    SUM(`absent_count`) AS `total_absent`,
    SUM(`truant_count`) AS `total_truant`,
    -- Calculate absence rate, avoiding division by zero.
    -- Absence rate is the ratio of (total absent + total truant) to total should attend.
    CASE
        WHEN SUM(`total_should_attend`) = 0 THEN 0
        ELSE (SUM(`absent_count`) + SUM(`truant_count`)) / SUM(`total_should_attend`)
    END AS `absence_rate`,
    -- Calculate truancy rate, avoiding division by zero.
    -- Truancy rate is the ratio of total truant to total should attend.
    CASE
        WHEN SUM(`total_should_attend`) = 0 THEN 0
        ELSE SUM(`truant_count`) / SUM(`total_should_attend`)
    END AS `truancy_rate`
FROM
    `icalink_course_checkin_stats`
GROUP BY
    `teaching_class_code`;
