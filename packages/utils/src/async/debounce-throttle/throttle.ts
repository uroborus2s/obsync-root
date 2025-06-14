/**
 * 节流函数实现，提供限制函数调用频率的工具
 *
 * 节流函数确保函数在一段时间内多次调用时，按指定的时间间隔执行。
 * 适用于滚动事件、鼠标移动、窗口调整大小等高频触发的事件处理。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数控制
 *
 * @packageDocumentation
 */

import { BaseOptions, FunctionController } from './common.js';

/**
 * 节流选项接口，配置节流行为
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @example
 * ```typescript
 * // 完整配置示例
 * const options: ThrottleOptions = {
 *   leading: true,  // 在节流开始前调用一次
 *   trailing: true  // 在节流结束后调用一次
 * };
 * ```
 * @public
 */
export interface ThrottleOptions extends BaseOptions {
  // 继承自BaseOptions，包含leading和trailing
}

/**
 * 扩展FunctionController以便访问受保护的方法
 * @internal
 */
class ThrottleController<
  F extends (...args: any[]) => any
> extends FunctionController<F> {
  /**
   * 公开leadingEdge方法
   */
  public invokeLeadingEdge(time: number): any {
    return this.leadingEdge(time);
  }

  /**
   * 公开执行函数方法
   */
  public invokeFunc(time: number): any {
    return this.invokeFunc(time);
  }

  /**
   * 公开定时器到期方法
   */
  public invokeTimerExpired(): any {
    return this.timerExpired();
  }
}

/**
 * 创建节流函数，限制函数调用频率
 *
 * 节流函数确保函数在一段时间内最多执行一次，无论调用多少次。
 * 可选择是否在节流开始前立即执行一次（leading）以及在节流结束后执行（trailing）。
 *
 * @typeParam F - 函数类型
 * @param func - 需要节流的函数
 * @param wait - 时间间隔(毫秒)，默认为0
 * @param options - 节流选项
 * @returns 节流后的函数，带有cancel方法用于取消等待的执行，和flush方法用于立即执行
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数调节
 *
 * @example
 * ```typescript
 * // 基本使用 - 限制滚动事件处理
 * const throttledScroll = throttle(
 *   () => {
 *     updateScrollIndicator();
 *   },
 *   200 // 200ms节流
 * );
 *
 * window.addEventListener('scroll', throttledScroll);
 *
 * // 不在开始时执行，仅在结束时执行
 * const throttledResize = throttle(
 *   () => {
 *     recalculateLayout();
 *   },
 *   300,
 *   {
 *     leading: false,  // 不在开始执行
 *     trailing: true   // 在结束后执行
 *   }
 * );
 *
 * // 取消挂起的执行
 * const throttledSave = throttle(saveProgress, 2000);
 *
 * // 在游戏循环中调用
 * gameLoop(() => {
 *   throttledSave(gameState);
 * });
 *
 * // 用户退出游戏，取消保存
 * exitButton.addEventListener('click', () => {
 *   throttledSave.cancel();
 * });
 * ```
 * @public
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  wait: number = 0,
  options: ThrottleOptions = {}
): F & { cancel(): void; flush(): ReturnType<F>; pending(): boolean } {
  // 默认配置: leading=true, trailing=true
  const mergedOptions = {
    leading: true,
    trailing: true,
    ...options
  };

  // 创建控制器实例
  const controller = new ThrottleController(func, wait, mergedOptions);

  /**
   * 节流函数主体
   */
  function throttled(this: any, ...args: any[]): any {
    const time = Date.now();
    const isInvoking = controller.shouldInvoke(time);

    // 更新状态
    controller.updateState(this, args, time);

    if (isInvoking) {
      // 如果没有定时器，表示是leading或第一次调用
      if (!controller.pending()) {
        return controller.invokeLeadingEdge(time);
      }
    }

    // 如果没有定时器且使用trailing，为下一次trailing调用设置定时器
    if (!controller.pending() && mergedOptions.trailing) {
      controller.getState().timerId = setTimeout(
        () => controller.invokeTimerExpired(),
        wait
      );
    }

    return controller.getState().result;
  }

  // 添加方法
  throttled.cancel = () => controller.cancel();
  throttled.flush = () => controller.flush();
  throttled.pending = () => controller.pending();

  // 使用类型断言确保返回类型正确
  return throttled as unknown as F & {
    cancel(): void;
    flush(): ReturnType<F>;
    pending(): boolean;
  };
}
