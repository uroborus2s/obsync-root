/**
 * WPS SDK 检查工具
 * 用于验证WPS SDK是否正确加载和可用
 */

export interface WPSSDKStatus {
  isLoaded: boolean;
  isWPSEnvironment: boolean;
  availableMethods: string[];
  version?: string;
  error?: string;
}

/**
 * 检查WPS SDK状态
 */
export function checkWPSSDKStatus(): WPSSDKStatus {
  const status: WPSSDKStatus = {
    isLoaded: false,
    isWPSEnvironment: false,
    availableMethods: []
  };

  try {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      status.error = '不在浏览器环境中';
      return status;
    }

    // 检查WPS SDK是否加载
    if (window.ksoxz_sdk) {
      status.isLoaded = true;
      status.availableMethods = Object.keys(window.ksoxz_sdk);

      // 检查是否在WPS环境中（通过User-Agent或其他方式）
      const userAgent = navigator.userAgent.toLowerCase();
      status.isWPSEnvironment =
        userAgent.includes('wps') || userAgent.includes('ksoxz');

      console.log('✅ WPS SDK检查结果:', status);
    } else {
      status.error = 'WPS SDK未加载 - 请检查script标签是否正确';
      console.warn('❌ WPS SDK未找到');
    }
  } catch (error) {
    status.error = `检查WPS SDK时发生错误: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌ WPS SDK检查异常:', error);
  }

  return status;
}

/**
 * 等待WPS SDK加载完成
 */
export function waitForWPSSDK(timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    // 如果已经加载，直接返回
    if (typeof window !== 'undefined' && window.ksoxz_sdk) {
      resolve(true);
      return;
    }

    let attempts = 0;
    const maxAttempts = timeout / 100; // 每100ms检查一次

    const checkInterval = setInterval(() => {
      attempts++;

      if (typeof window !== 'undefined' && window.ksoxz_sdk) {
        clearInterval(checkInterval);
        console.log('✅ WPS SDK加载完成');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('⚠️ WPS SDK加载超时');
        resolve(false);
      }
    }, 100);
  });
}

/**
 * 测试WPS SDK基本功能
 */
export async function testWPSSDKBasicFunctions(): Promise<{
  success: boolean;
  results: Record<string, any>;
  errors: string[];
}> {
  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    // 等待SDK加载
    const isLoaded = await waitForWPSSDK(3000);
    if (!isLoaded) {
      errors.push('WPS SDK加载超时');
      return { success: false, results, errors };
    }

    const sdk = window.ksoxz_sdk;

    // 测试基本方法是否存在
    const expectedMethods = ['getLocationInfo', 'chooseImage', 'showToast'];
    expectedMethods.forEach((method) => {
      if (typeof (sdk as any)[method] === 'function') {
        results[method] = '✅ 方法存在';
      } else {
        results[method] = '❌ 方法不存在';
        errors.push(`方法 ${method} 不存在`);
      }
    });

    // 测试位置获取功能（模拟调用）
    if (typeof sdk.getLocationInfo === 'function') {
      results.locationTest = '✅ 位置API可调用';
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  } catch (error) {
    errors.push(
      `测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
    );
    return { success: false, results, errors };
  }
}

/**
 * 打印WPS SDK调试信息
 */
export function printWPSSDKDebugInfo(): void {
  console.group('🔍 WPS SDK 调试信息');

  const status = checkWPSSDKStatus();
  console.log('SDK状态:', status);

  if (status.isLoaded && window.ksoxz_sdk) {
    console.log('SDK对象:', window.ksoxz_sdk);
    console.log('可用方法:', status.availableMethods);
  }

  console.log('User-Agent:', navigator.userAgent);
  console.log('当前URL:', window.location.href);

  console.groupEnd();
}
