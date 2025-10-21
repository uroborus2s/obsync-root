// import { wpsAuthService } from '@/lib/wps-auth-service';
import { LocationInfo } from '@/lib/wps-collaboration-api';
import {
  formatDistance,
  getSupportedBuildings,
  validateLocationForCheckIn
} from '@/utils/locationUtils';
import { checkWPSSDKStatus } from '@/utils/wps-sdk-checker';
import { useEffect, useState } from 'react';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

export function LocationTestPage() {
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(
    null
  );
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBuilding, setSelectedBuilding] =
    useState<string>('第一教学楼');
  // const [wpsConfig, setWpsConfig] = useState<any>(null);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [testRadius, setTestRadius] = useState<number>(500);

  const buildings = getSupportedBuildings();

  useEffect(() => {
    checkWPSSDKStatus(setCurrentLocation);
  }, []);

  const addTestResult = (result: TestResult) => {
    setTestResults((prev) => [
      ...prev,
      { ...result, details: JSON.stringify(result.details, null, 2) }
    ]);
  };

  // const clearResults = () => {
  //   setTestResults([]);
  // };

  const testLocationAccess = async () => {
    setIsLoading(true);
    addTestResult({ type: 'info', message: '开始测试位置获取...' });

    try {
      window.ksoxz_sdk.ready(() => {
        window.ksoxz_sdk.getLocationInfo({
          params: { coordinate: 1, withReGeocode: true },
          onSuccess: (data: LocationInfo) => {
            setCurrentLocation(data);
            addTestResult({
              type: 'success',
              message: '位置获取成功',
              details: data
            });
          },
          onError: (error: unknown) => {
            console.error('❌ WPS JSAPI获取位置失败:', error);
            // 如果WPS API失败，尝试使用浏览器API
          }
        });
      });
      // const location = await LocationHelper.getCurrentLocation();

      // setCurrentLocation(location);
    } catch (error) {
      addTestResult({
        type: 'error',
        message: '位置获取失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // // 新增：使用WPS API获取位置并校验
  // const testWPSLocationAccess = async () => {
  //   setIsLoading(true);
  //   let locationData;

  //   try {
  //     locationData = await LocationHelper.getCurrentLocation();
  //     console.log('📍 获取到当前位置:', locationData);
  //   } catch (error) {
  //     console.error('获取位置失败:', error);
  //     toast.error('获取位置失败，请检查位置权限设置');
  //     return;
  //   }
  //   addTestResult({ type: 'info', message: '开始使用WPS API获取位置...' });
  // };

  const testLocationValidation = () => {
    if (!currentLocation) {
      addTestResult({
        type: 'error',
        message: '请先获取当前位置'
      });
      return;
    }

    const roomInfo = `${selectedBuilding}1329/1329`;

    addTestResult({
      type: 'info',
      message: `开始验证位置: ${roomInfo}`
    });

    const validation = validateLocationForCheckIn(
      {
        lng: currentLocation.longitude,
        lat: currentLocation.latitude
      },
      roomInfo,
      testRadius
    );

    addTestResult({
      type: validation.valid ? 'success' : 'error',
      message: validation.valid ? '位置验证通过' : '位置验证失败',
      details: {
        valid: validation.valid,
        matchedBuilding: validation.matchedBuilding?.name,
        distance: validation.distance
          ? formatDistance(validation.distance)
          : 'N/A',
        maxDistance: `${testRadius}米`,
        error: validation.error
      }
    });
  };

  const testManualLocationValidation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    // 验证输入的经纬度
    if (isNaN(lat) || isNaN(lng)) {
      addTestResult({
        type: 'error',
        message: '请输入有效的经纬度数值'
      });
      return;
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      addTestResult({
        type: 'error',
        message: '经纬度超出有效范围（纬度: -90~90, 经度: -180~180）'
      });
      return;
    }

    const roomInfo = `${selectedBuilding}1329/1329`;

    addTestResult({
      type: 'info',
      message: `开始验证手动输入位置: ${lat.toFixed(6)}, ${lng.toFixed(6)} -> ${roomInfo}`
    });

    const validation = validateLocationForCheckIn(
      {
        lng: lng,
        lat: lat
      },
      roomInfo,
      testRadius
    );

    addTestResult({
      type: validation.valid ? 'success' : 'error',
      message: validation.valid ? '手动位置验证通过' : '手动位置验证失败',
      details: {
        inputLocation: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        valid: validation.valid,
        matchedBuilding: validation.matchedBuilding?.name,
        buildingLocation: validation.matchedBuilding
          ? `${validation.matchedBuilding.location.lat.toFixed(6)}, ${validation.matchedBuilding.location.lng.toFixed(6)}`
          : 'N/A',
        distance: validation.distance
          ? formatDistance(validation.distance)
          : 'N/A',
        maxDistance: `${testRadius}米`,
        error: validation.error
      }
    });
  };

  // const testWPSInitialization = async () => {
  //   setIsLoading(true);
  //   addTestResult({ type: 'info', message: '开始测试WPS初始化...' });

  //   try {
  //     // 从服务器获取真实的WPS配置
  //     addTestResult({ type: 'info', message: '正在从服务器获取WPS配置...' });

  //     // 获取当前页面URL
  //     const currentUrl = window.location.href;

  // const response = await fetch(
  //   `/api/auth/wps/jsapi-ticket?url=${encodeURIComponent(currentUrl)}`,
  //   {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     }
  //   }
  // );

  // if (!response.ok) {
  //   throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  // }

  // const config = await response.json();

  //     // 保存配置到状态中
  //     setWpsConfig(config.data);

  //     addTestResult({
  //       type: 'success',
  //       message: '成功获取WPS配置',
  //       details: {
  //         requestUrl: `/api/auth/wps/jsapi-ticket?url=${encodeURIComponent(currentUrl)}`,
  //         currentPageUrl: currentUrl,
  //         configData: config.data,
  //         timestamp: new Date().toISOString(),
  //         responseStatus: response.status,
  //         responseHeaders: Object.fromEntries(response.headers.entries())
  //       }
  //     });

  //     // 验证配置字段
  //     const requiredFields = ['appId', 'timeStamp', 'nonceStr', 'signature'];
  //     const missingFields = requiredFields.filter(
  //       (field) => !config.data[field]
  //     );

  //     if (missingFields.length > 0) {
  //       addTestResult({
  //         type: 'error',
  //         message: `WPS配置缺少必要字段: ${missingFields.join(', ')}`,
  //         details: { missingFields, receivedConfig: config.data }
  //       });
  //       return;
  //     }

  //     // 尝试使用获取的配置初始化WPS SDK
  //     if (window.ksoxz_sdk && window.ksoxz_sdk.config) {
  //       addTestResult({
  //         type: 'info',
  //         message: '使用服务器配置初始化WPS SDK...'
  //       });

  //       window.ksoxz_sdk.config({
  //         params: {
  //           appId: config.data.appId,
  //           timeStamp: config.data.timeStamp,
  //           nonceStr: config.data.nonceStr,
  //           signature: config.data.signature
  //         },
  //         onSuccess: () => {
  //           addTestResult({
  //             type: 'success',
  //             message: 'WPS SDK配置成功',
  //             details: {
  //               configUsed: {
  //                 appId: config.data.appId,
  //                 timeStamp: config.data.timeStamp,
  //                 nonceStr: config.data.nonceStr,
  //                 signature: config.data.signature.substring(0, 10) + '...' // 只显示签名前10位
  //               },
  //               initTime: new Date().toISOString()
  //             }
  //           });
  //         },
  //         onError: (error: unknown) => {
  //           addTestResult({
  //             type: 'error',
  //             message: 'WPS SDK配置失败',
  //             details: {
  //               error,
  //               configUsed: config,
  //               sdkAvailable: !!window.ksoxz_sdk
  //             }
  //           });
  //         }
  //       });
  //     } else {
  //       addTestResult({
  //         type: 'error',
  //         message: 'WPS SDK未加载或不支持config方法',
  //         details: {
  //           sdkExists: !!window.ksoxz_sdk,
  //           configMethodExists: !!(window.ksoxz_sdk && window.ksoxz_sdk.config),
  //           availableMethods: window.ksoxz_sdk
  //             ? Object.keys(window.ksoxz_sdk)
  //             : []
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);

  //     addTestResult({
  //       type: 'error',
  //       message: '获取WPS配置失败',
  //       details: {
  //         error: errorMessage,
  //         errorType:
  //           error instanceof Error ? error.constructor.name : typeof error,
  //         timestamp: new Date().toISOString(),
  //         url: '/api/auth/wps/jsapi-ticket'
  //       }
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <div className='min-h-screen bg-gray-50 p-4'>
      <div className='mx-auto max-w-4xl'>
        <h1 className='mb-6 text-3xl font-bold text-gray-900'>
          地理位置签到功能测试
        </h1>

        {/* 状态信息 */}
        <div className='mb-6 rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-xl font-semibold'>环境状态</h2>
          <div className='space-y-2'>
            <p>
              <strong>当前位置:</strong>{' '}
              {currentLocation
                ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                : '未获取'}
            </p>
            <p>
              <strong>位置地址:</strong>{' '}
              {currentLocation?.address.description || '未获取'}
            </p>
          </div>
        </div>

        {/* 测试控制 */}
        <div className='mb-6 rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-xl font-semibold'>测试控制</h2>
          <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <button
              onClick={testLocationAccess}
              disabled={isLoading}
              className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50'
              type='button'
            >
              {isLoading ? '获取中...' : '测试位置获取'}
            </button>

            {/* <button
              onClick={testWPSLocationAccess}
              disabled={isLoading}
              className='rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50'
              type='button'
            >
              {isLoading ? '获取中...' : 'WPS位置获取'}
            </button> */}

            <button
              onClick={testLocationValidation}
              disabled={!currentLocation}
              className='rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50'
              type='button'
            >
              测试位置验证
            </button>

            {/* <button
              onClick={async () => {
                setIsLoading(true);
                addTestResult({
                  type: 'info',
                  message: '开始测试SDK基本功能...'
                });

                const testResult = await testWPSSDKBasicFunctions();
                addTestResult({
                  type: testResult.success ? 'success' : 'error',
                  message: testResult.success
                    ? 'SDK功能测试通过'
                    : 'SDK功能测试失败',
                  details: {
                    results: testResult.results,
                    errors: testResult.errors
                  }
                });

                setIsLoading(false);
              }}
              disabled={isLoading}
              className='rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50'
              type='button'
            >
              测试SDK功能
            </button> */}

            {/* <button
              onClick={clearResults}
              className='rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700'
              type='button'
            >
              清空结果
            </button> */}
          </div>

          <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-medium text-gray-700'>
                选择测试建筑物:
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className='w-full rounded border border-gray-300 px-3 py-2'
              >
                {buildings.map((building) => (
                  <option key={building.name} value={building.name}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-gray-700'>
                测试范围 (米):
              </label>
              <input
                type='number'
                value={testRadius}
                onChange={(e) => setTestRadius(Number(e.target.value))}
                className='w-full rounded border border-gray-300 px-3 py-2'
                min='1'
                max='10000'
                placeholder='输入测试范围'
              />
            </div>
          </div>

          {/* 手动输入经纬度测试区域 */}
          <div className='mb-4 rounded border border-gray-200 p-4'>
            <h3 className='mb-3 text-lg font-medium text-gray-800'>
              手动输入经纬度测试
            </h3>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700'>
                  纬度 (Latitude):
                </label>
                <input
                  type='number'
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2'
                  step='0.000001'
                  placeholder='例: 43.820859'
                />
              </div>

              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700'>
                  经度 (Longitude):
                </label>
                <input
                  type='number'
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2'
                  step='0.000001'
                  placeholder='例: 125.43551'
                />
              </div>

              <div className='flex items-end'>
                <button
                  onClick={testManualLocationValidation}
                  disabled={!manualLat || !manualLng}
                  className='w-full rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50'
                  type='button'
                >
                  测试手动位置
                </button>
              </div>
            </div>

            <div className='mt-3 text-sm text-gray-600'>
              <p>💡 提示: 可以输入不同的经纬度来测试位置验证功能</p>
              <p>📍 参考坐标: 第一教学楼 (43.820859, 125.43551)</p>
            </div>
          </div>
        </div>

        {/* WPS配置信息 */}
        {/* {wpsConfig && (
          <div className='mb-6 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-xl font-semibold'>WPS配置信息</h2>
            <div className='rounded bg-gray-50 p-4'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div>
                  <span className='font-medium text-gray-700'>应用ID:</span>
                  <p className='mt-1 font-mono text-sm text-gray-900'>
                    {wpsConfig.appId}
                  </p>
                </div>
                <div>
                  <span className='font-medium text-gray-700'>时间戳:</span>
                  <p className='mt-1 font-mono text-sm text-gray-900'>
                    {wpsConfig.timeStamp}
                  </p>
                </div>
                <div>
                  <span className='font-medium text-gray-700'>随机字符串:</span>
                  <p className='mt-1 font-mono text-sm text-gray-900'>
                    {wpsConfig.nonceStr}
                  </p>
                </div>
                <div>
                  <span className='font-medium text-gray-700'>签名:</span>
                  <p className='mt-1 break-all font-mono text-sm text-gray-900'>
                    {wpsConfig.signature?.substring(0, 20)}...
                  </p>
                </div>
              </div>
              <div className='mt-4'>
                <span className='font-medium text-gray-700'>完整配置:</span>
                <pre className='mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs'>
                  {JSON.stringify(wpsConfig, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )} */}

        {/* 支持的建筑物列表 */}
        <div className='mb-6 rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-xl font-semibold'>支持的建筑物</h2>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {buildings.map((building) => (
              <div
                key={building.name}
                className='rounded border border-gray-200 p-4'
              >
                <h3 className='font-semibold'>{building.name}</h3>
                <p className='text-sm text-gray-600'>
                  坐标: {building.location.lat.toFixed(6)},{' '}
                  {building.location.lng.toFixed(6)}
                </p>
                <p className='text-sm text-gray-600'>
                  关键词: {building.keywords.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 测试结果 */}
        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-xl font-semibold'>测试结果</h2>
          <div className='max-h-96 space-y-4 overflow-y-auto'>
            {testResults.length === 0 ? (
              <p className='text-gray-500'>暂无测试结果</p>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`rounded border-l-4 p-4 ${
                    result.type === 'success'
                      ? 'border-green-400 bg-green-50'
                      : result.type === 'error'
                        ? 'border-red-400 bg-red-50'
                        : 'border-blue-400 bg-blue-50'
                  }`}
                >
                  <div className='mb-2 flex items-center'>
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${
                        result.type === 'success'
                          ? 'bg-green-400'
                          : result.type === 'error'
                            ? 'bg-red-400'
                            : 'bg-blue-400'
                      }`}
                    ></span>
                    <span className='font-medium'>{result.message}</span>
                    <span className='ml-auto text-sm text-gray-500'>
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  {result.details && (
                    <pre className='overflow-x-auto rounded bg-gray-100 p-2 text-xs'>
                      {result.details}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
