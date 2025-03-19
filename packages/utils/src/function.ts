const doOnceFlags: { [key: string]: boolean } = {};

/**
 * If the key was passed before, then doesn't execute the func
 * @param {Function} func
 * @param {string} key
 */
export function _doOnce(func: () => void, key: string) {
  if (doOnceFlags[key]) {
    return;
  }

  func();
  doOnceFlags[key] = true;
}

/**
 * Creates a debounced function a function, and attach it to a bean for lifecycle
 * @param {Function} func The function to be debounced
 * @param {number} delay The time in ms to debounce
 * @return {Function} The debounced function
 */
export function _debounce(
  bean: { isAlive(): boolean },
  func: (...args: any[]) => void,
  delay: number
): (...args: any[]) => void {
  let timeout: NodeJS.Timeout | null = null;

  // Calling debounce returns a new anonymous function
  return function (this: any, ...args: any[]) {
    const thas = this;
    if (timeout) {
      clearTimeout(timeout);
    }

    // Set the new timeout
    timeout = setTimeout(() => {
      // at the moment we just check if the bean is still alive, in the future the bean stub should
      // another option is to manage a list of active timers and clear them when the bean is destroyed.
      if (bean.isAlive()) {
        func.apply(thas, args);
      }
      timeout = null;
    }, delay);
  };
}

/**
 * @param {Function} func The function to be throttled
 * @param {number} wait The time in ms to throttle
 * @return {Function} The throttled function
 */
export function _throttle(
  func: (...args: any[]) => void,
  wait: number
): (...args: any[]) => void {
  let previousCall = 0;

  return function (this: any, ...args: any[]) {
    const context = this;
    const currentCall = new Date().getTime();

    if (currentCall - previousCall < wait) {
      return;
    }

    previousCall = currentCall;

    func.apply(context, args);
  };
}

export function _waitUntil(
  condition: () => boolean,
  callback: () => void,
  timeout: number = 100,
  timeoutMessage?: string
) {
  const timeStamp = new Date().getTime();

  let interval: NodeJS.Timeout | null = null;
  let executed: boolean = false;

  const internalCallback = () => {
    const reachedTimeout = new Date().getTime() - timeStamp > timeout;
    if (condition() || reachedTimeout) {
      callback();
      executed = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      if (reachedTimeout && timeoutMessage) {
        console.warn(timeoutMessage);
      }
    }
  };

  internalCallback();

  if (!executed) {
    interval = setInterval(internalCallback, 10);
  }
}
