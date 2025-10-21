# @stratix/icasync 插件项目分析报告

## 项目概述

@stratix/icasync 是一个基于 Stratix 框架的课程表同步插件，负责将数据库中的课程数据同步到 WPS 日历系统。项目目前处于重构阶段，已完成基础架构但仍有部分功能待实现。

# 原始数据表
## 1. u_jw_kcb_cur表
课程原始表

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for u_jw_kcb_cur
-- ----------------------------
DROP TABLE IF EXISTS `u_jw_kcb_cur`;
CREATE TABLE `u_jw_kcb_cur` (
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int(11) DEFAULT NULL COMMENT '教学周（1-20）',
  `zc` int(11) DEFAULT NULL COMMENT '周次（星期1-星期日）',
  `jc` int(11) DEFAULT NULL COMMENT '节次（1-10）',
  `lq` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lc` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '来源库时间',
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '来源库状态标识（add、update、delete）',
  `gx_sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '目标库更新时间',
  `gx_zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '目标库更新状态',
  `kcmc` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `xms` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师姓名组',
  `sfdk` varchar(2) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '是否打卡(打卡，不打卡)，有些课程仅为占位给老师提醒，学生不打卡，无学生日历',
  KEY `idx_combined` (`kkh`,`rq`,`st`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='本学期课程表';

SET FOREIGN_KEY_CHECKS = 1;
```
数据例子
```sql
INSERT INTO `<table_name>` (`kkh`, `xnxq`, `jxz`, `zc`, `jc`, `lq`, `room`, `xq`, `ghs`, `lc`, `rq`, `st`, `ed`, `sj`, `zt`, `gx_sj`, `gx_zt`, `kcmc`, `xms`, `sfdk`) VALUES ('202420252003013016705', '2024-2025-2', 1, 1, 1, '第一教学楼', '1422', '1', '101049', '4', '2025/03/03 00:00:00.000', '08:00:00.000', '08:45:00.000', '2025-07-30 21:57:06', 'add', NULL, NULL, '国际税收', '王君', '1');
INSERT INTO `<table_name>` (`kkh`, `xnxq`, `jxz`, `zc`, `jc`, `lq`, `room`, `xq`, `ghs`, `lc`, `rq`, `st`, `ed`, `sj`, `zt`, `gx_sj`, `gx_zt`, `kcmc`, `xms`, `sfdk`) VALUES ('202420252003013037101', '2024-2025-2', 1, 1, 1, '第一教学楼', '1106', '1', '101061', '1', '2025/03/03 00:00:00.000', '08:00:00.000', '08:45:00.000', '2025-07-30 21:57:06', 'add', NULL, NULL, '税务检查', '陈艺毛', '1');
```
## 2. juhe_renwu
课程聚合表，由u_jw_kcb_cur表聚合而来,合并连上的课程，每一条记录对应一条日历中的一条日程
```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for juhe_renwu
-- ----------------------------
DROP TABLE IF EXISTS `juhe_renwu`;
CREATE TABLE `juhe_renwu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int(11) DEFAULT NULL COMMENT '教学周',
  `zc` int(11) DEFAULT NULL COMMENT '周次',
  `rq` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '日期',
  `kcmc` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `sfdk` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '是否打卡（是否生成学生日历）',
  `jc_s` varchar(256) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '节次合并',
  `room_s` varchar(1000) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '上课教室合并（一般都是同一教室）',
  `gh_s` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师组号，推送教师课表日历的依据',
  `xm_s` varchar(1000) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教师组姓名，推送学生课表日历直接取此',
  `lq` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '教学楼',
  `sj_f` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `sj_t` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sjd` varchar(2) COLLATE utf8_unicode_ci NOT NULL DEFAULT '' COMMENT '时间段（1-4为am，4-10为pm）',
  `gx_sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '更新时间，给杨经理用',
  `gx_zt` varchar(2) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '更新状态，给杨经理用(0未处理，1教师日历已经推送，2学生日历已经推送，3软删除未处理，4软删除处理完毕',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM AUTO_INCREMENT=8956 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
```
数据例子
```sql
INSERT INTO `<table_name>` (`id`, `kkh`, `xnxq`, `jxz`, `zc`, `rq`, `kcmc`, `sfdk`, `jc_s`, `room_s`, `gh_s`, `xm_s`, `lq`, `sj_f`, `sj_t`, `sjd`, `gx_sj`, `gx_zt`) VALUES (1, '202420252003035027701', '2024-2025-2', 1, 2, '2025/03/04', '财务管理', '1', '3/4', '1223/1223', '104066', '梁毕明', '第一教学楼', '09:50:00.000', '11:25:00.000', 'am', '2025-06-05T07:30:06.043Z', '1');
INSERT INTO `<table_name>` (`id`, `kkh`, `xnxq`, `jxz`, `zc`, `rq`, `kcmc`, `sfdk`, `jc_s`, `room_s`, `gh_s`, `xm_s`, `lq`, `sj_f`, `sj_t`, `sjd`, `gx_sj`, `gx_zt`) VALUES (2, '202420252003035027701', '2024-2025-2', 1, 3, '2025/03/05', '财务管理', '1', '1/2', '1223/1223', '104066', '梁毕明', '第一教学楼', '08:00:00.000', '09:35:00.000', 'am', '2025-06-05T07:30:08.098Z', '1');
```


## 3. out_jw_kcb_xs
这是学生课程关联表，通过此表可以获取教学班
```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for out_jw_kcb_xs
-- ----------------------------
DROP TABLE IF EXISTS `out_jw_kcb_xs`;
CREATE TABLE `out_jw_kcb_xs` (
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生编号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `pyfadm` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '培养方案代码',
  `xsyd` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生异动标识',
  `xgxklbdm` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gx_zj` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gx_zx` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL
  KEY `idx_out_jw_kcb_xs_kkh_xh_kcbh` (`kkh`,`xh`,`kcbh`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='u_学生课程表';

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. out_xsxx
学生信息表
```sql
-- ----------------------------
-- Table structure for out_xsxx
-- ----------------------------
DROP TABLE IF EXISTS `out_xsxx`;
CREATE TABLE `out_xsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `mz` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sfzh` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sznj` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `rxnf` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lx` int(11) DEFAULT '1' COMMENT '类型 1本科生 2研究生',
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_out_xsxx_xh_bjdm` (`xh`,`bjdm`,`bjmc`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
```

## 5. out_jsxx
教师信息表
```sql
DROP TABLE IF EXISTS `out_jsxx`;
CREATE TABLE `out_jsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxw` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxl` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zc` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
```

# 同步保存数据
1. 将原始数据转化为同步数据
2. 一门课（kkh）对应一个日历数据，创建的kkh和日历id的对应表
3. 教学班（out_jw_kcb_xs表获取）+授课教师（gh_s）组成日历的参与者
4. juhe_renwu的每条数据对应一个日程，通过kkh找到日历id
5. 创建所有的用户视图out_xsxx+out_jsxx,视图包括学号/工号+用户类型（学生/教师）+ 学院+专业+班级

# 同步过程
## 全量同步
1. 根据学期信息和状态信息从u_jw_kcb_cur获取所有的课程保存到juhe_renwu表
```sql
# 聚合代码
CREATE TABLE juhe_renwu (
    id INT PRIMARY KEY AUTO_INCREMENT
) as
SELECT
	kkh,
	xnxq,
	jxz,
	zc,
	LEFT ( rq, 10 ) rq,kcmc,sfdk,
	GROUP_CONCAT( jc ORDER BY jc SEPARATOR '/' ) jc_s,
	GROUP_CONCAT( ifnull( room, '无' ) ORDER BY jc SEPARATOR '/' ) room_s,
	GROUP_CONCAT( DISTINCT ghs ) gh_s,
   GROUP_CONCAT( DISTINCT xms ) xm_s,
	SUBSTRING_INDEX( GROUP_CONCAT( lq ORDER BY st ), ',', 1 ) lq,
	SUBSTRING_INDEX( GROUP_CONCAT( st ORDER BY st ), ',', 1 ) sj_f,
	SUBSTRING_INDEX( GROUP_CONCAT( ed ORDER BY ed DESC ), ',', 1 ) sj_t,
	'am' sjd 
FROM
	u_jw_kcb_cur 
WHERE
	1 = 1 
	AND jc < 5 
GROUP BY
	kkh,
	xnxq,
	jxz,
	zc,
	rq ,kcmc,sfdk 
UNION
SELECT
	kkh,
	xnxq,
	jxz,
	zc,
	LEFT ( rq, 10 ) rq,kcmc,sfdk,
	GROUP_CONCAT( jc ORDER BY jc SEPARATOR '/' ) jc_s,
	GROUP_CONCAT( ifnull( room, '无' ) ORDER BY jc SEPARATOR '/' ) room_s,
	GROUP_CONCAT( DISTINCT ghs ) gh_s,
  GROUP_CONCAT( DISTINCT xms ) xm_s,
	SUBSTRING_INDEX( GROUP_CONCAT( lq ORDER BY st ), ',', 1 ) lq,
	SUBSTRING_INDEX( GROUP_CONCAT( st ORDER BY st ), ',', 1 ) sj_f,
	SUBSTRING_INDEX( GROUP_CONCAT( ed ORDER BY ed DESC ), ',', 1 ) sj_t,
	'pm' sjd 
FROM
	u_jw_kcb_cur 
WHERE
	1 = 1 
	AND jc > 4 
GROUP BY
	kkh,
	xnxq,
	jxz,
	zc,
	rq,kcmc,sfdk
# 以上代码是以节（1-4）为上午和（5-10）为下午两部分union而成。
```
2. 将juhe_renwu表的内容同步到日历中（按照日历和日程的数据对应结构），没完成同步一个日程则修改juhe_renwu表的gx_zt为1，还有对应u_jw_kcb_cur表的状态
3. 先同步课程日历和日历参与者
4. 在同步课程

## 增量同步课程
1. 通过u_jw_kcb_cur表的 gx_sj和gx_zt为null 来获取未处理的增量数据
```sql
select distinct kkh，rq from u_jw_kcb_cur where gx_zt is null
```
2. 将变化的课程数据（kkh，rq）将juhe_renwu表中的记录都软删除gx_zt为4
3. 调用wps的接口删除日程，删除后修改juhe_renwu表的gx_zt为4
4. 根据所有未处理的数据中add和update类型的聚合并添加到juhe_renwu表中
5. （同全量同步流程）将juhe_renwu表的内容同步到日历中（按照日历和日程的数据对应结构），没完成同步一个日程则修改juhe_renwu表的gx_zt为1，还有对应u_jw_kcb_cur表的状态

## 增量同步日历参与者
1. 根据out_xsxx表的rq和zt来获取未处理的数据
2. 增量状态（新增/删除/）修改用户所属的教学班，修改日历的参与者