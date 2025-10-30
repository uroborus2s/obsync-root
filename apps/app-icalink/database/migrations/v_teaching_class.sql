CREATE OR REPLACE VIEW v_teaching_class AS
SELECT 
  xs.xh AS student_id,
  xsxx.xm AS student_name,
  xsxx.xymc AS school_name,
  xsxx.xydm AS college_code,
  xsxx.zymc AS major_name,
  xsxx.bjmc AS class_name,
  xs.kkh AS course_code,
  kc.kcbh AS teaching_class_code,
  kc.kcmc AS course_name,
  kc.dwmc AS course_unit
FROM syncdb.out_jw_kcb_xs xs 
INNER JOIN syncdb.out_xsxx xsxx 
  ON xsxx.xh = xs.xh  -- 按学号关联学生课程表和学生信息表
INNER JOIN syncdb.out_jw_kc kc on kc.kcbh=xs.kcbh
WHERE 
  xs.zt IN ('add', 'update')  -- 课程表中状态为新增或更新的记录
  AND xsxx.zt IN ('add', 'update')
  and kc.zt in ('add', 'update');