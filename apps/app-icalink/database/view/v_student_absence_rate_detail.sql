SELECT
	`tc`.`student_id` AS `student_id`,
	`tc`.`student_name` AS `student_name`,
	`tc`.`school_name` AS `school_name`,
	`tc`.`class_name` AS `class_name`,
	`tc`.`major_name` AS `major_name`,
	`tc`.`course_code` AS `course_code`,
	`tc`.`course_name` AS `course_name`,
	count(DISTINCT `ac`.`id`) AS `total_sessions`,
	count(
		DISTINCT (
			CASE
					
					WHEN (`ac`.`start_time` < curdate()) THEN
					`ac`.`id` ELSE NULL 
				END)) AS `completed_sessions`,
	COALESCE(
		sum(
				(
					CASE
							
							WHEN (`asr`.`absence_type` IN ('absent', 'truant')) THEN
							1 ELSE 0 
						END)),
	0) AS `absent_count`,
	COALESCE(
		sum(
				(
					CASE
							
							WHEN (`asr`.`absence_type` IN ('leave', 'leave_pending')) THEN
							1 ELSE 0 
						END)),
	0) AS `leave_count`,
	(
		CASE
					
					WHEN (
							count(
								DISTINCT (
									CASE
											
											WHEN (`ac`.`start_time` < curdate()) THEN
											`ac`.`id` ELSE NULL 
										END)) = 0) THEN
							0 ELSE (
								COALESCE(
										sum(
											(
												CASE
														
														WHEN (`asr`.`absence_type` IN ('absent', 'truant')) THEN
														1 ELSE 0 
													END)),
										0) / count(
										DISTINCT (
											CASE
														
														WHEN (`ac`.`start_time` < curdate()) THEN
														`ac`.`id` ELSE NULL 
												END))) 
					END) AS `absence_rate` 
		FROM
			(
					(
						`icalink_teaching_class` `tc`
						JOIN `icasync_attendance_courses` `ac` ON (
							(
									(`tc`.`course_code` = `ac`.`course_code`) 
									AND isnull(`ac`.`deleted_at`) 
									AND (`ac`.`start_time` >= '2025-09-01') 
							AND (`ac`.`start_time` < curdate()))))
					LEFT JOIN `icalink_absent_student_relations` `asr` ON (
						(
							(`tc`.`student_id` = `asr`.`student_id`) 
							AND (`tc`.`course_code` = `asr`.`course_code`) 
						AND (`ac`.`id` = `asr`.`course_id`)))) 
		GROUP BY
			`tc`.`student_id`,
			`tc`.`student_name`,
			`tc`.`school_name`,
			`tc`.`class_name`,
			`tc`.`major_name`,
			`tc`.`course_code`,
	`tc`.`course_name`