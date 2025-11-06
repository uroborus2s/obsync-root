/*
 Navicat Premium Dump SQL

 Source Server         : 本地mysql5.7-3307
 Source Server Type    : MySQL
 Source Server Version : 50744 (5.7.44)
 Source Host           : localhost:3307
 Source Schema         : icasync

 Target Server Type    : MySQL
 Target Server Version : 50744 (5.7.44)
 File Encoding         : 65001

 Date: 05/11/2025 18:40:58
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for icalink_contacts
-- ----------------------------
DROP TABLE IF EXISTS `icalink_contacts`;
CREATE TABLE `icalink_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_name` varchar(90) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `major_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `major_name` varchar(90) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_name` varchar(90) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `people` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(30) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `role` varchar(7) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17354 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
