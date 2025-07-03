// ... existing code ...

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
export function formatToRFC3339(
  rq: string,
  sj_f: string,
  timeZoneOffset: number = 480 // 默认为北京时间 +08:00
): string {
  const currentTime = new Date();
  // 解析日期部分 (格式: "2025/03/18")
  const dateParts = rq.split('/');
  if (dateParts.length !== 3) {
    throw new TypeError(`无效的日期格式: ${rq}，期望格式: YYYY/MM/DD`);
  }

  const [year, month, day] = dateParts;

  // 验证日期部分
  if (
    !year ||
    !month ||
    !day ||
    year.length !== 4 ||
    month.length !== 2 ||
    day.length !== 2
  ) {
    throw new TypeError(`无效的日期格式: ${rq}，期望格式: YYYY/MM/DD`);
  }

  // 解析时间部分 (格式: "09:50:00.000" 或 "09:50:00")
  const timeParts = sj_f.split(':');
  if (timeParts.length < 2 || timeParts.length > 3) {
    throw new TypeError(
      `无效的时间格式: ${sj_f}，期望格式: HH:mm:ss.SSS 或 HH:mm:ss`
    );
  }

  const [hours, minutes] = timeParts;
  let seconds = '00';
  let milliseconds = '000';

  if (timeParts.length === 3) {
    const secondsPart = timeParts[2];
    if (secondsPart.includes('.')) {
      const [sec, ms] = secondsPart.split('.');
      seconds = sec;
      milliseconds = ms.padEnd(3, '0').substring(0, 3); // 确保毫秒是3位
    } else {
      seconds = secondsPart;
    }
  }

  // 验证时间部分
  if (
    !hours ||
    !minutes ||
    hours.length !== 2 ||
    minutes.length !== 2 ||
    seconds.length !== 2
  ) {
    throw new TypeError(
      `无效的时间格式: ${sj_f}，期望格式: HH:mm:ss.SSS 或 HH:mm:ss`
    );
  }

  // 构建 ISO 日期字符串
  const isoDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;

  // 创建 Date 对象进行验证

  // 生成时区偏移字符串
  let timezoneStr: string;
  if (timeZoneOffset === 0) {
    timezoneStr = 'Z';
  } else {
    const absOffset = Math.abs(timeZoneOffset);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMinutes = absOffset % 60;
    const sign = timeZoneOffset >= 0 ? '+' : '-';
    timezoneStr = `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
  }

  // 移除毫秒部分（如果是 .000）并添加时区
  const baseTime =
    milliseconds === '000'
      ? `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      : `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;

  return `${baseTime}${timezoneStr}`;
}

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
export function calculateCourseTimeAndStatus(
  rq: string | Date,
  sj_f: string,
  sj_t: string
): CourseTimeInfo {
  try {
    const currentTime = new Date();

    // 解析课程日期 - 支持 Date对象、"2025/03/18" 和 "2025-03-18" 格式
    let courseDate: Date;

    if (rq instanceof Date) {
      // 如果已经是Date对象，直接使用
      courseDate = new Date(rq);
    } else if (typeof rq === 'string') {
      if (rq.includes('/')) {
        // 处理 "2025/03/18" 格式
        const dateParts = rq.split('/');
        if (dateParts.length !== 3) {
          throw new TypeError(
            `无效的日期格式: ${rq}，期望格式: YYYY/MM/DD 或 YYYY-MM-DD`
          );
        }
        const [year, month, day] = dateParts;
        courseDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
      } else {
        // 处理 "2025-03-18" 格式
        courseDate = new Date(rq);
      }
    } else {
      throw new TypeError(`无效的日期类型: ${typeof rq}，期望 string 或 Date`);
    }

    if (isNaN(courseDate.getTime())) {
      throw new TypeError(`无效的日期: ${rq}`);
    }

    // 解析开始时间 - 支持 "09:50:00.000" 和 "08:30" 格式
    const parseTime = (timeStr: string): { hour: number; minute: number } => {
      if (typeof timeStr !== 'string') {
        throw new TypeError(`时间参数必须是字符串，收到: ${typeof timeStr}`);
      }

      const timeParts = timeStr.split(':');
      if (timeParts.length < 2) {
        throw new TypeError(
          `无效的时间格式: ${timeStr}，期望格式: HH:mm:ss.SSS 或 HH:mm`
        );
      }

      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);

      if (
        isNaN(hour) ||
        isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        throw new TypeError(`无效的时间: ${timeStr}`);
      }

      return { hour, minute };
    };

    const { hour: startHour, minute: startMinute } = parseTime(sj_f);
    const { hour: endHour, minute: endMinute } = parseTime(sj_t);

    // 构建课程开始时间
    const courseStartTime = new Date(courseDate);
    courseStartTime.setHours(startHour, startMinute, 0, 0);

    // 构建课程结束时间
    const courseEndTime = new Date(courseDate);
    courseEndTime.setHours(endHour, endMinute, 0, 0);

    // 验证时间逻辑
    if (courseStartTime >= courseEndTime) {
      throw new TypeError(
        `课程开始时间 ${sj_f} 不能晚于或等于结束时间 ${sj_t}`
      );
    }

    // 计算课程状态
    let courseStatus: 'not_started' | 'in_progress' | 'finished';
    if (currentTime < courseStartTime) {
      courseStatus = 'not_started';
    } else if (currentTime > courseEndTime) {
      courseStatus = 'finished';
    } else {
      courseStatus = 'in_progress';
    }

    return {
      courseStartTime,
      courseEndTime,
      courseStatus
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw error;
    }
    throw new TypeError(
      `计算课程时间失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
