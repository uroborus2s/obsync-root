CREATE OR REPLACE VIEW v_teaching_class AS
SELECT 
  xs.xh AS student_id,
  xs.kkh AS course_code,
  xsxx.xm AS name,
  xsxx.xymc AS school_name,
  xsxx.xydm AS college_code,
  xsxx.zymc AS major_name,
  xsxx.bjmc AS class_name,
  icm.calendar_name AS course_name
FROM syncdb.out_jw_kcb_xs xs 
INNER JOIN syncdb.out_xsxx xsxx 
  ON xsxx.xh = xs.xh  -- 按学号关联学生课程表和学生信息表
INNER JOIN icasync_calendar_mapping icm on icm.kkh=xs.kkh
WHERE 
  xs.zt IN ('add', 'update')  -- 课程表中状态为新增或更新的记录
  AND xsxx.zt IN ('add', 'update')
  and icm.deleted_at is null;