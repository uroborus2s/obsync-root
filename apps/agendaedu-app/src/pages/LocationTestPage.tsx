// import { wpsAuthService } from '@/lib/wps-auth-service';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { attendanceApi } from '@/lib/attendance-api';
import { LocationInfo } from '@/lib/wps-collaboration-api';
import {
  formatDistance,
  getSupportedBuildings,
  validateLocationForCheckIn
} from '@/utils/locationUtils';
import { checkWPSSDKStatus } from '@/utils/wps-sdk-checker';
import imageCompression from 'browser-image-compression';
import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

export function LocationTestPage() {
  const { toast } = useToast();

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

  // 图片上传相关状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false); // 压缩状态
  const [compressionProgress, setCompressionProgress] = useState<number>(0); // 压缩进度

  // === 图片预览状态（与 StudentDashboard 保持一致）===
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [compressedFileSize, setCompressedFileSize] = useState<number>(0);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);

  // === WPS 相机测试状态 ===
  const [wpsTestImage, setWpsTestImage] = useState<string | null>(null); // 图片 URL 或 Base64
  const [wpsTestImageInfo, setWpsTestImageInfo] = useState<any>(null); // 图片文件信息

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

  // 压缩图片
  const compressImage = async (file: File): Promise<File> => {
    try {
      // 设置压缩状态
      setIsCompressing(true);
      setCompressionProgress(0);

      toast.info('正在压缩图片...', {
        description: '请稍候，不要关闭页面'
      });

      const options = {
        maxSizeMB: 0.4, // 最大文件大小 400KB
        maxWidthOrHeight: 1920, // 最大宽度或高度
        useWebWorker: true, // 使用 Web Worker 提升性能
        initialQuality: 0.8, // 初始质量 80%
        fileType: file.type, // 保留原始文件类型
        onProgress: (progress: number) => {
          // browser-image-compression 的进度是 0-100
          setCompressionProgress(progress);
          console.log('压缩进度:', progress);
        }
      };

      const compressedBlob = await imageCompression(file, options);

      // ✅ 重要：确保压缩后的文件保留原始文件名
      // imageCompression 返回的可能是 Blob，需要转换为 File 并保留原始文件名
      const compressedFile = new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now()
      });

      console.log('图片压缩完成:', {
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRate: Math.round(
          ((file.size - compressedFile.size) / file.size) * 100
        ),
        fileName: compressedFile.name
      });

      // 压缩完成，设置进度为100%
      setCompressionProgress(100);

      addTestResult({
        type: 'success',
        message: '图片压缩成功',
        details: {
          originalSize: `${(file.size / 1024).toFixed(2)} KB`,
          compressedSize: `${(compressedFile.size / 1024).toFixed(2)} KB`,
          compressionRate: `${Math.round(((file.size - compressedFile.size) / file.size) * 100)}%`,
          fileName: compressedFile.name
        }
      });

      return compressedFile;
    } catch (error) {
      console.error('图片压缩失败:', error);
      addTestResult({
        type: 'error',
        message: '图片压缩失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new Error('图片压缩失败，请重试');
    } finally {
      // 重置压缩状态
      setIsCompressing(false);
    }
  };

  // 使用浏览器原生相机接口上传图片到 OSS（与 StudentDashboard 保持一致）
  const handleImageUpload = async () => {
    addTestResult({
      type: 'info',
      message: '开始测试图片上传（浏览器原生相机）...'
    });

    try {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // 优先使用后置摄像头

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          addTestResult({
            type: 'error',
            message: '未选择文件'
          });
          return;
        }

        addTestResult({
          type: 'info',
          message: '获取到图片文件',
          details: {
            fileName: file.name,
            fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            fileType: file.type
          }
        });

        try {
          // 验证文件类型
          const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
          ];
          if (!allowedTypes.includes(file.type)) {
            toast.error('不支持的文件类型', {
              description: '仅支持 JPEG、PNG、GIF、WebP 格式'
            });
            addTestResult({
              type: 'error',
              message: '不支持的文件类型',
              details: { fileType: file.type, allowedTypes }
            });
            return;
          }

          // 验证文件大小（20MB）
          const maxSize = 20 * 1024 * 1024;
          if (file.size > maxSize) {
            toast.error('文件过大', {
              description: `文件大小不能超过 ${maxSize / 1024 / 1024}MB`
            });
            addTestResult({
              type: 'error',
              message: '文件过大',
              details: {
                fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                maxSize: `${maxSize / 1024 / 1024} MB`
              }
            });
            return;
          }

          addTestResult({
            type: 'success',
            message: '文件验证通过'
          });

          // 生成预览 URL
          const previewUrl = URL.createObjectURL(file);

          // 设置预览状态
          setOriginalFileSize(file.size);
          setCompressedFileSize(0); // 标记为未压缩
          setCompressedFile(file); // 保存原始文件
          setPreviewImageUrl(previewUrl);

          // 显示预览对话框
          setShowImagePreview(true);

          addTestResult({
            type: 'success',
            message: '已打开图片预览对话框'
          });
        } catch (error) {
          console.error('❌ 处理图片失败:', error);
          toast.error('处理图片失败', {
            description: error instanceof Error ? error.message : '请稍后重试'
          });
          addTestResult({
            type: 'error',
            message: '处理图片失败',
            details: {
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      };

      // 触发文件选择
      input.click();
    } catch (error) {
      console.error('❌ 打开文件选择器失败:', error);
      toast.error('打开文件选择器失败', {
        description: '请重试'
      });
      addTestResult({
        type: 'error',
        message: '打开文件选择器失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  };

  // 处理预览确认 - 压缩图片并上传到 OSS（与 StudentDashboard 保持一致，但不执行签到）
  const handlePreviewConfirm = async () => {
    if (!compressedFile) {
      toast.error('未找到图片文件', {
        description: '请重新选择图片'
      });
      return;
    }

    try {
      addTestResult({
        type: 'info',
        message: '开始压缩图片...'
      });

      // 1. 先压缩图片（在对话框中显示压缩进度）
      const compressed = await compressImage(compressedFile);

      // 更新压缩后的文件大小
      setCompressedFileSize(compressed.size);
      setCompressedFile(compressed);

      addTestResult({
        type: 'success',
        message: '图片压缩成功',
        details: {
          originalSize: `${(originalFileSize / 1024 / 1024).toFixed(2)} MB`,
          compressedSize: `${(compressed.size / 1024 / 1024).toFixed(2)} MB`,
          compressionRatio: `${((1 - compressed.size / originalFileSize) * 100).toFixed(1)}%`
        }
      });

      // 2. 上传图片到 OSS（带进度回调）
      setIsUploading(true);
      setUploadProgress(0);

      addTestResult({
        type: 'info',
        message: '开始上传到 OSS...'
      });

      const uploadResult = await attendanceApi.uploadCheckinPhoto(
        compressed,
        (progress) => {
          setUploadProgress(progress);
          console.log(`上传进度: ${progress}%`);
        }
      );

      if (uploadResult.success && uploadResult.data) {
        const { photo_url, bucket_name } = uploadResult.data;
        setUploadedImageUrl(photo_url);

        toast.success('上传成功！', {
          description: '图片已成功上传到 OSS'
        });

        addTestResult({
          type: 'success',
          message: '图片上传成功',
          details: {
            photo_url,
            bucket_name,
            uploadProgress: '100%'
          }
        });

        // ⚠️ 注意：这里不执行签到操作，仅上传图片
        addTestResult({
          type: 'info',
          message: '⚠️ 测试模式：仅上传图片，不执行签到操作'
        });

        // 关闭预览对话框
        handlePreviewCancel();
      } else {
        throw new Error(uploadResult.message || '上传失败');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error('上传失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      });
      addTestResult({
        type: 'error',
        message: '图片上传失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCompressionProgress(0);
      setIsCompressing(false);
    }
  };

  // 处理预览取消 - 清理状态（与 StudentDashboard 保持一致）
  const handlePreviewCancel = () => {
    // 释放 Blob URL
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }

    // 重置所有预览相关状态
    setShowImagePreview(false);
    setPreviewImageUrl('');
    setOriginalFileSize(0);
    setCompressedFileSize(0);
    setCompressedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setCompressionProgress(0);
    setIsCompressing(false);

    addTestResult({
      type: 'info',
      message: '已关闭图片预览对话框'
    });
  };

  // WPS 相机测试函数（仅测试相机功能，不上传）
  const handleWPSCameraTest = async () => {
    addTestResult({
      type: 'info',
      message: '开始测试 WPS 相机功能...'
    });

    // 1. 检查 WPS SDK 是否存在
    if (!window.ksoxz_sdk || !window.ksoxz_sdk.ready) {
      toast.error('WPS SDK 不可用', {
        description: '请在 WPS 协同环境中测试此功能'
      });
      addTestResult({
        type: 'error',
        message: 'WPS SDK 不可用',
        details: {
          error: '当前环境不支持 WPS SDK',
          suggestion: '请在 WPS 协同应用中打开此页面'
        }
      });
      return;
    }

    // 2. 检查是否支持 chooseImage 功能
    const canUseCamera = window.ksoxz_sdk.canIUse('chooseImage');
    addTestResult({
      type: 'info',
      message: 'WPS SDK 功能检测',
      details: {
        canUseChooseImage: canUseCamera
      }
    });

    if (!canUseCamera) {
      toast.error('不支持相机功能', {
        description: '当前环境不支持 WPS 相机功能'
      });
      addTestResult({
        type: 'error',
        message: 'WPS SDK 不支持相机功能',
        details: {
          error: 'chooseImage API 不可用',
          suggestion: '请在支持的 WPS 客户端中测试（Android/iOS）'
        }
      });
      return;
    }

    try {
      // 3. 等待 WPS SDK 就绪
      window.ksoxz_sdk.ready(() => {
        addTestResult({
          type: 'info',
          message: 'WPS SDK 已就绪，正在打开相机...'
        });

        // 4. 调用 chooseImage（添加水印）
        window.ksoxz_sdk.chooseImage({
          params: {
            sourceType: ['camera'], // 仅使用相机拍照
            count: 1, // 选择1张图片
            sizeType: ['compressed'], // 使用压缩图片
            enableWatermark: true, // 启用水印
            watermarkConfig: {
              watermarkText: [
                {
                  text: `测试 ${new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}`
                }
              ],
              position: 'bottom', // 水印位置：底部
              fontSize: 14,
              color: '#FFFFFF',
              backgroundStyleColor: '#000000',
              backgroundStyleOpacity: 0.5
            }
          },
          onSuccess: async (res) => {
            console.log('✅ WPS SDK 选择图片成功:', res);
            addTestResult({
              type: 'success',
              message: 'WPS SDK 相机调用成功',
              details: {
                imageInfos: res.imageInfos,
                count: res.imageInfos.length
              }
            });

            // 5. 处理返回的图片数据
            if (res.imageInfos && res.imageInfos.length > 0) {
              const imageInfo = res.imageInfos[0];

              addTestResult({
                type: 'info',
                message: '获取到图片信息',
                details: {
                  imageName: imageInfo.imageName,
                  imageSize: imageInfo.imageSize,
                  imagePath: imageInfo.imagePath,
                  localID: imageInfo.localID
                }
              });

              // 6. 获取设备平台信息
              addTestResult({
                type: 'info',
                message: '正在检测设备平台...'
              });

              window.ksoxz_sdk.getSystemInfo({
                onSuccess: async (systemInfo) => {
                  addTestResult({
                    type: 'success',
                    message: '设备信息获取成功',
                    details: {
                      platform: systemInfo.platform,
                      model: systemInfo.model,
                      system: systemInfo.system
                    }
                  });

                  // 7. 根据平台获取图片数据
                  try {
                    if (systemInfo.platform === 'ios') {
                      // iOS 平台：使用 getImageBase64
                      addTestResult({
                        type: 'info',
                        message: '正在获取图片 Base64 数据（iOS）...'
                      });

                      window.ksoxz_sdk.getImageBase64({
                        params: {
                          filePath: imageInfo.imagePath
                        },
                        onSuccess: async (base64Result) => {
                          addTestResult({
                            type: 'success',
                            message: 'Base64 数据获取成功',
                            details: {
                              base64Length: base64Result.imageBase64.length
                            }
                          });

                          // 将 Base64 转换为 Blob 以获取文件信息
                          const base64Data = base64Result.imageBase64.replace(
                            /^data:image\/\w+;base64,/,
                            ''
                          );
                          const byteCharacters = atob(base64Data);
                          const byteNumbers = new Array(byteCharacters.length);
                          for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                          }
                          const byteArray = new Uint8Array(byteNumbers);
                          const blob = new Blob([byteArray], {
                            type: 'image/jpeg'
                          });

                          // 获取图片尺寸
                          const img = new Image();
                          img.onload = () => {
                            // 获取文件头信息
                            const fileHeader = Array.from(
                              byteArray.slice(0, 16)
                            )
                              .map((b) => b.toString(16).padStart(2, '0'))
                              .join(' ')
                              .toUpperCase();

                            const imageInfoData = {
                              fileName: imageInfo.imageName,
                              fileSize: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
                              fileType: 'image/jpeg',
                              imageDimensions: `${img.width}x${img.height}`,
                              platform: systemInfo.platform,
                              base64Length: base64Result.imageBase64.length,
                              fileHeader: fileHeader
                            };

                            setWpsTestImage(base64Result.imageBase64);
                            setWpsTestImageInfo(imageInfoData);

                            addTestResult({
                              type: 'success',
                              message: '图片信息获取成功（iOS）',
                              details: imageInfoData
                            });

                            toast.success('WPS 相机测试成功', {
                              description: '图片已显示在下方'
                            });
                          };
                          img.src = base64Result.imageBase64;
                        },
                        onError: (error) => {
                          console.error('❌ 获取 Base64 失败:', error);
                          addTestResult({
                            type: 'error',
                            message: '获取 Base64 失败（iOS）',
                            details: {
                              error: error?.errMsg || '未知错误'
                            }
                          });
                          toast.error('获取图片数据失败', {
                            description: error?.errMsg || '请重试'
                          });
                        }
                      });
                    } else if (systemInfo.platform === 'android') {
                      // Android 平台：使用 localID 通过特殊协议获取
                      addTestResult({
                        type: 'info',
                        message: '正在获取图片数据（Android）...'
                      });

                      if (!imageInfo.localID) {
                        throw new Error('Android 平台未返回 localID');
                      }

                      // 使用 ksoxz:// 协议获取图片
                      const localUrl = `ksoxz://xz.wps.cn/resource?localID=${imageInfo.localID}`;

                      try {
                        const response = await fetch(localUrl);
                        const blob = await response.blob();

                        // 获取图片尺寸
                        const objectUrl = URL.createObjectURL(blob);
                        const img = new Image();
                        img.onload = async () => {
                          // 获取文件头信息
                          const arrayBuffer = await blob.arrayBuffer();
                          const byteArray = new Uint8Array(arrayBuffer);
                          const fileHeader = Array.from(byteArray.slice(0, 16))
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(' ')
                            .toUpperCase();

                          const imageInfoData = {
                            fileName: imageInfo.imageName,
                            fileSize: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
                            fileType: blob.type || 'image/jpeg',
                            imageDimensions: `${img.width}x${img.height}`,
                            platform: systemInfo.platform,
                            localID: imageInfo.localID,
                            fileHeader: fileHeader
                          };

                          setWpsTestImage(objectUrl);
                          setWpsTestImageInfo(imageInfoData);

                          addTestResult({
                            type: 'success',
                            message: '图片信息获取成功（Android）',
                            details: imageInfoData
                          });

                          toast.success('WPS 相机测试成功', {
                            description: '图片已显示在下方'
                          });
                        };
                        img.src = objectUrl;
                      } catch (fetchError) {
                        console.error(
                          '❌ 从 localID 获取图片失败:',
                          fetchError
                        );
                        addTestResult({
                          type: 'error',
                          message: '从 localID 获取图片失败（Android）',
                          details: {
                            error:
                              fetchError instanceof Error
                                ? fetchError.message
                                : String(fetchError)
                          }
                        });
                        toast.error('获取图片数据失败', {
                          description: '请重试'
                        });
                      }
                    } else {
                      // 其他平台
                      addTestResult({
                        type: 'error',
                        message: '不支持的平台',
                        details: {
                          platform: systemInfo.platform,
                          suggestion: '仅支持 iOS 和 Android 平台'
                        }
                      });
                      toast.error('不支持的平台', {
                        description: '仅支持 iOS 和 Android 平台'
                      });
                    }
                  } catch (conversionError) {
                    console.error('❌ 图片处理失败:', conversionError);
                    addTestResult({
                      type: 'error',
                      message: '图片处理失败',
                      details: {
                        error:
                          conversionError instanceof Error
                            ? conversionError.message
                            : String(conversionError)
                      }
                    });
                    toast.error('图片处理失败', {
                      description: '请重试'
                    });
                  }
                },
                onError: (error) => {
                  console.error('❌ 获取设备信息失败:', error);
                  addTestResult({
                    type: 'error',
                    message: '获取设备信息失败',
                    details: {
                      error: error?.errMsg || '未知错误'
                    }
                  });
                  toast.error('获取设备信息失败', {
                    description: '请重试'
                  });
                }
              });
            }
          },
          onError: (err) => {
            console.error('❌ WPS SDK 选择图片失败:', err);
            toast.error('相机调用失败', {
              description: err?.errMsg || '请检查相机权限'
            });
            addTestResult({
              type: 'error',
              message: 'WPS SDK 相机调用失败',
              details: {
                error: err,
                errorMessage: err?.errMsg || '未知错误'
              }
            });
          }
        });
      });
    } catch (error) {
      console.error('调用 WPS SDK 失败:', error);
      toast.error('调用失败', {
        description: error instanceof Error ? error.message : '请重试'
      });
      addTestResult({
        type: 'error',
        message: '调用 WPS SDK 失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
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

            <button
              onClick={handleImageUpload}
              disabled={isUploading || isCompressing}
              className='flex items-center justify-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50'
              type='button'
            >
              <Upload className='h-4 w-4' />
              {isCompressing
                ? `压缩中 ${compressionProgress}%`
                : isUploading
                  ? `上传中 ${uploadProgress}%`
                  : '测试图片上传'}
            </button>

            <button
              onClick={handleWPSCameraTest}
              className='flex items-center justify-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700'
              type='button'
            >
              <Upload className='h-4 w-4' />
              测试 WPS 相机
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

        {/* 上传结果显示 */}
        {uploadedImageUrl && (
          <div className='mb-6 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-xl font-semibold'>上传结果</h2>
            <div className='space-y-4'>
              <div>
                <p className='mb-2 text-sm font-medium text-gray-700'>
                  图片 URL:
                </p>
                <div className='rounded bg-gray-50 p-3'>
                  <code className='break-all text-sm text-gray-900'>
                    {uploadedImageUrl}
                  </code>
                </div>
              </div>
              <div>
                <p className='mb-2 text-sm font-medium text-gray-700'>
                  图片预览:
                </p>
                <div className='rounded border border-gray-200 p-2'>
                  <img
                    src={uploadedImageUrl}
                    alt='上传的图片'
                    className='max-h-96 w-full object-contain'
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorMsg = document.createElement('p');
                      errorMsg.className = 'text-red-500 text-sm';
                      errorMsg.textContent = '图片加载失败';
                      e.currentTarget.parentElement?.appendChild(errorMsg);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WPS 相机测试结果显示 */}
        {wpsTestImage && wpsTestImageInfo && (
          <div className='mb-6 rounded-lg bg-white p-6 shadow'>
            <h2 className='mb-4 text-xl font-semibold'>WPS 相机测试结果</h2>
            <div className='space-y-4'>
              {/* 图片预览 */}
              <div>
                <p className='mb-2 text-sm font-medium text-gray-700'>
                  拍摄的图片:
                </p>
                <div className='rounded border border-gray-200 p-2'>
                  <img
                    src={wpsTestImage}
                    alt='WPS 相机拍摄的图片'
                    className='max-h-96 w-full object-contain'
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorMsg = document.createElement('p');
                      errorMsg.className = 'text-red-500 text-sm';
                      errorMsg.textContent = '图片加载失败';
                      e.currentTarget.parentElement?.appendChild(errorMsg);
                    }}
                  />
                </div>
              </div>

              {/* 图片文件信息表格 */}
              <div>
                <p className='mb-2 text-sm font-medium text-gray-700'>
                  图片文件信息:
                </p>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200 border border-gray-200'>
                    <tbody className='divide-y divide-gray-200 bg-white'>
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          文件名
                        </td>
                        <td className='px-4 py-2 text-sm text-gray-900'>
                          {wpsTestImageInfo.fileName}
                        </td>
                      </tr>
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          文件大小
                        </td>
                        <td className='px-4 py-2 text-sm text-gray-900'>
                          {wpsTestImageInfo.fileSize}
                        </td>
                      </tr>
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          文件类型
                        </td>
                        <td className='px-4 py-2 text-sm text-gray-900'>
                          {wpsTestImageInfo.fileType}
                        </td>
                      </tr>
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          图片尺寸
                        </td>
                        <td className='px-4 py-2 text-sm text-gray-900'>
                          {wpsTestImageInfo.imageDimensions}
                        </td>
                      </tr>
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          平台
                        </td>
                        <td className='px-4 py-2 text-sm text-gray-900'>
                          {wpsTestImageInfo.platform}
                        </td>
                      </tr>
                      {wpsTestImageInfo.localID && (
                        <tr>
                          <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                            localID (Android)
                          </td>
                          <td className='break-all px-4 py-2 font-mono text-sm text-gray-900'>
                            {wpsTestImageInfo.localID}
                          </td>
                        </tr>
                      )}
                      {wpsTestImageInfo.base64Length && (
                        <tr>
                          <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                            Base64 长度 (iOS)
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-900'>
                            {wpsTestImageInfo.base64Length.toLocaleString()}{' '}
                            字符
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className='whitespace-nowrap bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700'>
                          文件头
                        </td>
                        <td className='px-4 py-2 font-mono text-sm text-gray-900'>
                          {wpsTestImageInfo.fileHeader}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {/* 图片预览对话框（与 StudentDashboard 保持一致）*/}
      <ImagePreviewDialog
        isOpen={showImagePreview}
        imageUrl={previewImageUrl}
        originalSize={originalFileSize}
        compressedSize={compressedFileSize}
        onConfirm={handlePreviewConfirm}
        onClose={handlePreviewCancel}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        isCompressing={isCompressing}
        compressionProgress={compressionProgress}
      />
    </div>
  );
}
