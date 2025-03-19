import { hrtime } from './number.js';

export enum TimeResolution {
  NORMAL = 'normal',
  HIGH = 'high'
}

// 性能记录接口
export interface IPerformanceRecorder {
  record(measurement: PerformanceMeasurement): void;
  getRecords(): PerformanceMeasurement[];
}

// 性能测量数据结构
export interface PerformanceMeasurement {
  name: string;
  startTime: number | bigint;
  endTime: number | bigint;
  duration: number;
  resolution: TimeResolution;
  metadata?: Record<string, any>;
  tags?: string[];
}

// 内存记录器实现
export class MemoryPerformanceRecorder implements IPerformanceRecorder {
  protected measurements: PerformanceMeasurement[] = [];

  record(measurement: PerformanceMeasurement): void {
    this.measurements.push(measurement);
  }

  getRecords(): PerformanceMeasurement[] {
    return this.measurements;
  }
}

// 性能计量单元
export class DurationUnit {
  private startTime: number | bigint;
  private endTime?: number | bigint;
  private metadata?: Record<string, any>;
  private tags: string[] = [];
  private resolution: TimeResolution;
  private name: string;
  private recorder: IPerformanceRecorder;

  constructor(
    name: string,
    resolution: TimeResolution = TimeResolution.NORMAL,
    metadata?: Record<string, any>,
    recorder?: IPerformanceRecorder
  ) {
    this.name = name;
    this.resolution = resolution;
    this.startTime = resolution === TimeResolution.HIGH ? hrtime() : Date.now();
    this.metadata = metadata;
    this.recorder = recorder || new MemoryPerformanceRecorder();
  }

  addTags(...tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  end(isRecord: boolean = false): number {
    this.endTime =
      this.resolution === TimeResolution.HIGH ? hrtime() : Date.now();
    const duration = this.calculateDuration(this.endTime);

    if (isRecord) {
      this.recorder.record({
        name: this.name,
        startTime: this.startTime,
        endTime: this.endTime,
        duration,
        resolution: this.resolution,
        metadata: this.metadata,
        tags: this.tags
      });
    }

    return duration;
  }

  private readonly TIME_UNITS = {
    YEAR: 365 * 24 * 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
    MINUTE: 60 * 1000,
    SECOND: 1000
  };

  endFormat(): string {
    const duration = this.end();
    let remaining = duration;

    const years = Math.floor(remaining / this.TIME_UNITS.YEAR);
    remaining %= this.TIME_UNITS.YEAR;

    const days = Math.floor(remaining / this.TIME_UNITS.DAY);
    remaining %= this.TIME_UNITS.DAY;

    const hours = Math.floor(remaining / this.TIME_UNITS.HOUR);
    remaining %= this.TIME_UNITS.HOUR;

    const minutes = Math.floor(remaining / this.TIME_UNITS.MINUTE);
    remaining %= this.TIME_UNITS.MINUTE;

    const seconds = Math.ceil(remaining / this.TIME_UNITS.SECOND);

    const parts: string[] = [];

    if (years > 0) parts.push(`${years}年`);
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (seconds > 0) parts.push(`${seconds}秒`);

    return parts.length > 0 ? parts.join('') : '0秒';
  }

  private calculateDuration(endTime: number | bigint): number {
    if (
      typeof this.startTime === 'bigint' &&
      typeof this.endTime === 'bigint'
    ) {
      return Number(this.endTime - this.startTime) / 1_000_000;
    }
    return Number(this.endTime) - Number(this.startTime);
  }
}
