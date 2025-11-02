--
-- View `v_course_checkin_stats_summary`
--
-- This view provides a summary of check-in statistics for each course,
-- calculating absence and truancy rates.
--
CREATE OR REPLACE VIEW `v_course_checkin_stats_summary` AS
SELECT
    `course_code`,
    MAX(`course_name`) AS `course_name`,
    MAX(`semester`) AS `semester`,
    MAX(`class_location`) AS `class_location`,
    MAX(`teacher_name`) AS `teacher_name`,
    MAX(`teacher_codes`) AS `teacher_codes`,
    MAX(`course_unit_id`) AS `course_unit_id`,
    MAX(`course_unit`) AS `course_unit`,
    MAX(`teaching_class_code`) AS `teaching_class_code`,
    MIN(`teaching_week`) AS `start_week`,
    MAX(`teaching_week`) AS `end_week`,
    MIN(DATE(`start_time`)) AS `start_time`,
    MAX(DATE(`end_time`)) AS `end_time`,
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
    `course_code`;
