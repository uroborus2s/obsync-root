/**
 * 格式化日期时间为 RFC3339 格式
 *
 * @param rq - 日期字符串，格式如 "2025/03/18"
 * @param sj_f - 时间字符串，格式如 "09:50:00.000"
 * @param timeZoneOffset - 时区偏移（分钟），默认为 +8:00 (480分钟)
 * @returns RFC3339 格式的日期时间字符串，如 "2025-03-18T09:50:00+08:00"
 * @throws `TypeError` 如果日期或时间格式无效
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期格式化
 *
 * @example
 * ```typescript
 * formatToRFC3339("2025/03/18", "09:50:00.000");  // "2025-03-18T09:50:00+08:00"
 * formatToRFC3339("2025/03/18", "09:50:00", 0);  // "2025-03-18T09:50:00Z"
 * formatToRFC3339("2025/03/18", "09:50:00.123", -480);  // "2025-03-18T09:50:00-08:00"
 * ```
 * @public
 */
export declare function formatToRFC3339(rq: string, sj_f: string, timeZoneOffset?: number): string;
/**
 * 课程时间和状态信息
 */
export interface CourseTimeInfo {
    /** 课程开始时间 */
    courseStartTime: Date;
    /** 课程结束时间 */
    courseEndTime: Date;
    /** 课程状态 */
    courseStatus: 'not_started' | 'in_progress' | 'finished';
}
/**
 * 根据数据库中的课程数据计算标准课程时间和状态
 *
 * @param rq - 上课日期，可以是字符串格式如 "2025/03/18" 或 "2025-03-18"，或者Date对象
 * @param sj_f - 开始时间，格式如 "09:50:00.000" 或 "08:30"
 * @param sj_t - 结束时间，格式如 "11:25:00.000" 或 "10:05"
 * @returns 包含课程开始时间、结束时间和状态的对象
 * @throws `TypeError` 如果日期或时间格式无效
 * @remarks
 * 版本: 1.0.0
 * 分类: 课程时间计算
 *
 * @example
 * ```typescript
 * const courseInfo = calculateCourseTimeAndStatus("2025/03/18", "09:50:00.000", "11:25:00.000");
 * console.log(courseInfo.courseStartTime); // Date对象
 * console.log(courseInfo.courseEndTime);   // Date对象
 * console.log(courseInfo.courseStatus);    // 'not_started' | 'in_progress' | 'finished'
 * ```
 * @public
 */
export declare function calculateCourseTimeAndStatus(rq: string | Date, sj_f: string, sj_t: string): CourseTimeInfo;
//# sourceMappingURL=time.d.ts.map