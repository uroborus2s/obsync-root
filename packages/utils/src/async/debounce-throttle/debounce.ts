/**
 * 防抖函数实现，提供用于限制函数调用频率的工具
 *
 * 防抖函数确保函数在一段时间内多次调用时，只在最后一次调用后的指定延迟执行一次。
 * 适用于处理用户输入、窗口调整大小等频繁触发的事件。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数控制
 *
 * @packageDocumentation
 */

import { BaseOptions, FunctionController } from './common.js';

/**
 * 防抖选项接口，配置防抖行为
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @example
 * ```typescript
 * // 完整配置示例
 * const options: DebounceOptions = {
 *   leading: true,     // 在延迟开始前调用一次
 *   trailing: true,    // 在延迟结束后调用一次
 *   maxWait: 5000      // 最长等待5秒
 * };
 * ```
 * @public
 */
export interface DebounceOptions extends BaseOptions {
  /**
   * 最大等待时间(毫秒)，即使持续触发，函数也会在这个时间后执行
   * @defaultValue 0 表示无限制
   */
  maxWait?: number;
}

/**
 * 扩展FunctionController以便访问受保护的方法
 * @internal
 */
class DebounceController<
  F extends (...args: any[]) => any
> extends FunctionController<F> {
  /**
   * 公开leadingEdge方法
   */
  public invokeLeadingEdge(time: number): any {
    return this.leadingEdge(time);
  }

  /**
   * 公开启动定时器方法
   */
  public invokeStartTimer(
    pendingFunc: () => any,
    delay: number
  ): ReturnType<typeof setTimeout> {
    return this.startTimer(pendingFunc, delay);
  }

  /**
   * 公开取消定时器方法
   */
  public invokeCancelTimer(timer?: ReturnType<typeof setTimeout>): void {
    this.cancelTimer(timer);
  }

  /**
   * 公开定时器到期方法
   */
  public invokeTimerExpired(): any {
    return this.timerExpired();
  }
}

/**
 * 创建防抖函数，限制函数调用频率
 *
 * 防抖函数会延迟执行，如果在延迟时间内再次调用，则重新计时。
 * 可选择是否在延迟开始前立即执行一次（leading）以及在延迟结束后执行（trailing）。
 *
 * @typeParam F - 函数类型
 * @param func - 需要防抖的函数
 * @param wait - 延迟时间(毫秒)，默认为0
 * @param options - 防抖选项
 * @returns 防抖后的函数，带有cancel方法用于取消等待的执行
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数调节
 *
 * @example
 * ```typescript
 * // 基本使用 - 延迟处理用户输入
 * const debouncedSearch = debounce(
 *   (query) => {
 *     fetchSearchResults(query);
 *   },
 *   300 // 300ms延迟
 * );
 *
 * // 监听输入事件
 * searchInput.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 *
 * // 高级用法 - 设置leading和maxWait
 * const handleResize = debounce(
 *   () => {
 *     recalculateLayout();
 *   },
 *   200,
 *   {
 *     leading: true,    // 首次立即执行
 *     trailing: true,   // 延迟后也执行
 *     maxWait: 1000     // 最多等待1秒
 *   }
 * );
 *
 * // 取消挂起的执行
 * const debouncedSave = debounce(saveData, 1000);
 * debouncedSave(formData);
 *
 * // 用户离开页面，取消保存
 * cancelButton.addEventListener('click', () => {
 *   debouncedSave.cancel();
 * });
 * ```
 * @public
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number = 0,
  options: DebounceOptions = {}
): F & { cancel(): void; flush(): ReturnType<F>; pending(): boolean } {
  // 默认配置: leading=false, trailing=true
  const mergedOptions = {
    leading: false,
    trailing: true,
    ...options
  };

  // 创建控制器实例
  const controller = new DebounceController(func, wait, mergedOptions);

  /**
   * 防抖函数主体
   */
  function debounced(this: any, ...args: any[]): any {
    const time = Date.now();
    const isInvoking = controller.shouldInvoke(time);

    // 更新状态
    controller.updateState(this, args, time);

    if (isInvoking) {
      // 处理第一次调用或leading边缘情况
      if (!controller.pending()) {
        return controller.invokeLeadingEdge(time);
      }

      // 处理maxWait逻辑，仅用于debounce
      if (mergedOptions.maxWait && !controller.getState().maxWaitTimer) {
        controller.getState().maxWaitTimer = controller.invokeStartTimer(
          () => controller.maxDelayTimeout(),
          mergedOptions.maxWait
        );
      }

      // 重新设置定时器
      if (controller.getState().timerId) {
        controller.invokeCancelTimer(controller.getState().timerId);
      }

      controller.getState().timerId = controller.invokeStartTimer(
        () => controller.invokeTimerExpired(),
        wait
      );

      return controller.getState().result;
    }

    // 如果之前没有定时器，创建一个
    if (!controller.pending()) {
      controller.getState().timerId = controller.invokeStartTimer(
        () => controller.invokeTimerExpired(),
        wait
      );
    }

    return controller.getState().result;
  }

  // 添加方法
  debounced.cancel = () => controller.cancel();
  debounced.flush = () => controller.flush();
  debounced.pending = () => controller.pending();

  // 使用类型断言确保返回类型正确
  return debounced as unknown as F & {
    cancel(): void;
    flush(): ReturnType<F>;
    pending(): boolean;
  };
}
