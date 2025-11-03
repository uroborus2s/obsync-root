CREATE OR REPLACE VIEW v_contacts AS
SELECT
    gh as user_id,
    xm as user_name,
    ssdwdm as school_id,
    ssdwmc as school_name,
    null as major_id,
    null as major_name,
    null as class_id,
    null as class_name,
    xb as gender,
    null as grade,
    null as people,
    zc as position,
    'teacher' AS role
FROM syncdb.out_jsxx
WHERE zt in ('add','update')
UNION ALL
SELECT
    xh as user_id,
    xm as user_name,
    xydm as school_id,
    xymc as school_name,
    zydm as major_id,
    zymc as major_name,
    bjdm as class_id,
    bjmc as class_name,
    xb as gender,
    sznj as grade,
    mz as people,
    null as position,
    'student' AS role
FROM syncdb.out_xsxx
WHERE zt in ('add','update')