DROP PROCEDURE
IF
	EXISTS RefreshAbsentRelationsHistory;

DELIMITER $$
CREATE PROCEDURE RefreshAbsentRelationsHistory (IN p_teaching_week INT, IN p_week_day INT) BEGIN
	DECLARE
		v_stat_date DATE DEFAULT CURDATE();-- 异常回滚机制（MySQL 5.7 兼容）
	DECLARE
	EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
			ROLLBACK;		
	END;
    -- =====================================================
-- 在事务外创建临时表，避免 DDL 触发隐式提交
-- =====================================================
	DROP TEMPORARY TABLE IF EXISTS tmp_history_details;
	CREATE TEMPORARY TABLE tmp_history_details ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci AS SELECT
	* 
	FROM
		v_attendance_history_details 
	WHERE
		teaching_week = p_teaching_week 
		AND (p_week_day IS NULL OR week_day = p_week_day);
    

	START TRANSACTION;
    -- =====================================================
-- [阶段 1] 历史数据统计与缺勤明细生成 (v_attendance_history_details)
-- =====================================================
	DELETE 
	FROM
		icasync.icalink_course_checkin_stats 
	WHERE
		teaching_week = p_teaching_week 
		AND (p_week_day IS NULL OR week_day = p_week_day);

    -- 插入历史统计
	INSERT INTO icasync.icalink_course_checkin_stats (
		stat_date,
		course_id,
		external_id,
		course_code,
		course_name,
		start_time,
		end_time,
		teacher_name,
		teacher_codes,
		teaching_week,
		week_day,
		periods,
		time_period,
		class_location,
		total_should_attend,
		present_count,
		absent_count,
		truant_count,
		leave_count,
		course_unit_id,
		course_unit,
		teaching_class_code,
		need_checkin,
		semester
	) SELECT
	v_stat_date,
	t.attendance_course_id,
	t.external_id,
	t.course_code,
	t.course_name,
	t.start_time,
	t.end_time,
	t.teacher_names,
	t.teacher_codes,
	t.teaching_week,
	t.week_day,
	t.periods,
	t.time_period,
	t.class_location,
	COUNT(t.student_id) AS total_should_attend,
	SUM(
		CASE
				
				WHEN t.final_status in ('present') THEN
				1 ELSE 0 
			END) AS present_count,
	SUM(
		CASE
				
				WHEN t.final_status in ('absent','pending_approval') THEN
				1 ELSE 0 
			END) AS absent_count,
	SUM(
		CASE
				
				WHEN t.final_status = 'truant' THEN
				1 ELSE 0 
			END) AS truant_count,
	SUM(
		CASE
				
				WHEN t.final_status IN ('leave', 'leave_pending') THEN
				1 ELSE 0 
			END) AS leave_count,
	t.course_unit_id,
	t.course_unit,
	t.teaching_class_code,
	t.need_checkin,
	t.semester 
	FROM
		tmp_history_details AS t 
	GROUP BY
		t.attendance_course_id,
		t.external_id,
		t.course_code,
		t.course_name,
		t.start_time,
		t.end_time,
		t.teacher_names,
		t.teacher_codes,
		t.teaching_week,
		t.week_day,
		t.periods,
		t.time_period,
		t.class_location,
		t.course_unit_id,
		t.course_unit,
		t.teaching_class_code,
		t.need_checkin,
		t.semester;
        
    -- 删除旧缺勤明细
	DELETE 
	FROM
		icasync.icalink_absent_student_relations 
	WHERE
		teaching_week = p_teaching_week 
		AND (p_week_day IS NULL OR week_day = p_week_day);
    
    -- 插入缺勤明细（历史）
	INSERT INTO icalink_absent_student_relations (
			course_stats_id,
			course_id,
			external_id,
			course_code,
			course_name,
			student_id,
			student_name,
			class_name,
			major_name,
			school_name,
			absence_type,
			stat_date,
			teaching_week,
			week_day,
			periods,
			time_period,
			school_id,
			major_id,
			class_id,
			grade,
			gender,
			people,
			semester
	) SELECT
	s.id,
	t.attendance_course_id,
	t.external_id,
	t.course_code,
	t.course_name,
	t.student_id,
	t.student_name,
	t.class_name,
	t.major_name,
	t.school_name,
	t.final_status,
	v_stat_date,
	t.teaching_week,
	t.week_day,
	t.periods,
	t.time_period,
	t.school_id,
	t.major_id,
	t.class_id,
	t.grade,
	t.gender,
	t.people,
	t.semester 
	FROM
		tmp_history_details AS t
		INNER JOIN icasync.icalink_course_checkin_stats AS s ON s.course_id = t.attendance_course_id 
		AND s.stat_date = v_stat_date 
	WHERE
		t.final_status IN ('absent', 'truant', 'leave', 'leave_pending','pending_approval');
-- 提交事务
-- =====================================================
	COMMIT;
	DROP TEMPORARY TABLE IF EXISTS tmp_history_details;
END$$

DELIMITER ;