/**
 * debounce和throttle函数的共享实现
 * @packageDocumentation
 * @internal
 */

/**
 * 定时器回调类型
 */
export type TimerHandler = () => any;

/**
 * 基础选项接口，包含debounce和throttle共享的选项
 * @internal
 */
export interface BaseOptions {
  /**
   * 是否在延迟开始前立即调用一次函数
   */
  leading?: boolean;

  /**
   * 是否在延迟结束后调用函数
   */
  trailing?: boolean;
}

/**
 * 控制函数调用的工具类，提供debounce和throttle共享的底层实现
 * @internal
 */
export class FunctionController<F extends (...args: any[]) => any> {
  private lastArgs?: any[];
  private lastThis?: any;
  private result: any;
  private timerId?: ReturnType<typeof setTimeout>;
  private lastCallTime?: number;
  private lastInvokeTime = 0;
  private maxWaitTimer?: ReturnType<typeof setTimeout>;
  private isInvoked = false;

  // 封装的原始函数
  private func: F;

  // 延迟时间(毫秒)
  private waitTime: number;

  // 选项
  private leading: boolean;
  private trailing: boolean;
  private maxWaitTime: number;

  /**
   * 构造函数
   * @param func - 原始函数
   * @param wait - 延迟时间(毫秒)
   * @param options - 选项
   */
  constructor(
    func: F,
    wait: number = 0,
    options: BaseOptions & { maxWait?: number } = {}
  ) {
    this.func = func;
    this.waitTime = Number(wait) || 0;
    this.leading = !!options.leading;
    this.trailing = options.trailing !== false;
    this.maxWaitTime = options.maxWait ? Number(options.maxWait) : 0;
  }

  /**
   * 执行原始函数
   * @param time - 当前时间戳
   * @returns 函数执行结果
   */
  protected invokeFunc(time: number): any {
    const args = this.lastArgs;
    const thisArg = this.lastThis;

    this.lastArgs = this.lastThis = undefined;
    this.lastInvokeTime = time;
    this.isInvoked = true;
    this.result = this.func.apply(thisArg, args as any[]);
    return this.result;
  }

  /**
   * 启动定时器
   * @param pendingFunc - 等待执行的函数
   * @param delay - 延迟时间
   * @returns 定时器ID
   */
  protected startTimer(
    pendingFunc: TimerHandler,
    delay: number
  ): ReturnType<typeof setTimeout> {
    return setTimeout(pendingFunc, delay);
  }

  /**
   * 取消定时器
   * @param timer - 定时器ID
   */
  protected cancelTimer(timer?: ReturnType<typeof setTimeout>): void {
    if (timer) {
      clearTimeout(timer);
    }
  }

  /**
   * 处理trailing边缘调用
   * @param time - 当前时间戳
   * @returns 函数执行结果
   */
  protected trailingEdge(time: number): any {
    this.timerId = undefined;

    // 如果设置了trailing且有尚未处理的参数，则执行函数
    if (this.trailing && this.lastArgs) {
      return this.invokeFunc(time);
    }

    this.lastArgs = this.lastThis = undefined;
    return this.result;
  }

  /**
   * 判断是否应该执行函数
   * @param time - 当前时间戳
   * @returns 是否应该执行
   */
  public shouldInvoke(time: number): boolean {
    if (!this.lastCallTime) return true;

    const timeSinceLastCall = time - this.lastCallTime;
    const timeSinceLastInvoke = time - this.lastInvokeTime;

    // 执行条件:
    // 1. 距离上次调用的时间超过了等待时间
    // 2. 系统时间被调整(时间倒流)
    // 3. 达到了最大等待时间(如果设置了)
    return (
      timeSinceLastCall >= this.waitTime ||
      timeSinceLastCall < 0 ||
      (this.maxWaitTime > 0 && timeSinceLastInvoke >= this.maxWaitTime)
    );
  }

  /**
   * 计算剩余等待时间
   * @param time - 当前时间戳
   * @returns 剩余等待时间
   */
  public remainingWait(time: number): number {
    if (!this.lastCallTime) return 0;

    const timeSinceLastCall = time - this.lastCallTime;
    const timeSinceLastInvoke = time - this.lastInvokeTime;
    const timeWaiting = this.waitTime - timeSinceLastCall;

    // 如果设置了最大等待时间，则取最小值
    return this.maxWaitTime > 0
      ? Math.min(timeWaiting, this.maxWaitTime - timeSinceLastInvoke)
      : timeWaiting;
  }

  /**
   * 处理leading边缘调用
   * @param time - 当前时间戳
   * @returns 函数执行结果
   */
  protected leadingEdge(time: number): any {
    // 重置上次调用时间
    this.lastInvokeTime = time;

    // 启动定时器等待trailing边缘的回调
    if (this.trailing) {
      this.timerId = this.startTimer(() => this.timerExpired(), this.waitTime);
    }

    // 如果设置了leading，则立即执行函数
    return this.leading ? this.invokeFunc(time) : this.result;
  }

  /**
   * 定时器到期处理
   * @returns 函数执行结果
   */
  protected timerExpired(): any {
    const time = Date.now();
    if (this.shouldInvoke(time)) {
      return this.trailingEdge(time);
    }

    // 如果还不应该执行，重新启动定时器等待剩余时间
    this.timerId = this.startTimer(
      () => this.timerExpired(),
      this.remainingWait(time)
    );
    return undefined;
  }

  /**
   * 处理最大等待时间超时 (仅用于debounce)
   */
  public maxDelayTimeout(): void {
    this.timerId = undefined;
    // 只有在至少调用过一次时才调用
    if (this.lastCallTime && this.lastArgs) {
      this.invokeFunc(Date.now());
    }
    this.maxWaitTimer = undefined;
  }

  /**
   * 取消等待的执行
   */
  public cancel(): void {
    if (this.timerId !== undefined) {
      this.cancelTimer(this.timerId);
    }
    if (this.maxWaitTimer !== undefined) {
      this.cancelTimer(this.maxWaitTimer);
    }
    this.lastInvokeTime = 0;
    this.lastArgs =
      this.lastCallTime =
      this.lastThis =
      this.timerId =
      this.maxWaitTimer =
        undefined;
    this.isInvoked = false;
  }

  /**
   * 立即执行等待的函数
   * @returns 函数执行结果
   */
  public flush(): any {
    return this.timerId === undefined
      ? this.result
      : this.trailingEdge(Date.now());
  }

  /**
   * 检查是否有等待执行的调用
   * @returns 是否有等待执行的调用
   */
  public pending(): boolean {
    return this.timerId !== undefined;
  }

  /**
   * 获取当前实例状态
   */
  public getState() {
    return {
      lastArgs: this.lastArgs,
      lastThis: this.lastThis,
      lastCallTime: this.lastCallTime,
      lastInvokeTime: this.lastInvokeTime,
      timerId: this.timerId,
      maxWaitTimer: this.maxWaitTimer,
      result: this.result,
      isInvoked: this.isInvoked
    };
  }

  /**
   * 更新实例状态
   */
  public updateState(
    thisArg: any,
    args: any[],
    time: number = Date.now()
  ): void {
    this.lastArgs = args;
    this.lastThis = thisArg;
    this.lastCallTime = time;
  }
}
