import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import LocationFailedDialog from '@/components/LocationFailedDialog';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { attendanceApi } from '@/lib/attendance-api';
import { authManager } from '@/lib/auth-manager';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import { LocationInfo } from '@/lib/wps-collaboration-api';
import {
  BackendAttendanceData,
  determineDisplayState,
  DisplayState
} from '@/utils/attendance-status-helper';
import { LocationHelper } from '@/utils/location-helper';
import { validateLocationForCheckIn } from '@/utils/locationUtils';
import { checkWPSSDKStatus } from '@/utils/wps-sdk-checker';
import imageCompression from 'browser-image-compression';
import { addMinutes } from 'date-fns';
import { BookOpen, Calendar, Clock, MapPin, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// === withAbort 工具函数 ===
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise
      .then((v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      })
      .catch((e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      });
  });
}

function StudentDashboardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // === 核心状态 ===
  const [attendanceData, setAttendanceData] =
    useState<BackendAttendanceData | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 页面级加载
  const [checkinLoading, setCheckinLoading] = useState(false); // 签到按钮加载
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentLocation, setCurrentLocation] = useState<LocationInfo | null>(
    null
  );

  // === 位置校验失败对话框状态 ===
  const [showLocationFailedDialog, setShowLocationFailedDialog] =
    useState(false);
  const [locationValidationDistance, setLocationValidationDistance] = useState<
    number | undefined
  >(undefined);
  const [pendingLocationData, setPendingLocationData] =
    useState<LocationInfo | null>(null);

  // === 撤回请假申请状态 ===
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // === 图片预览状态 ===
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [compressedFileSize, setCompressedFileSize] = useState<number>(0);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); // 压缩状态
  const [compressionProgress, setCompressionProgress] = useState<number>(0); // 压缩进度

  // === Ref 与 AbortController ===
  const dataFetchAbortRef = useRef<AbortController | null>(null);
  const checkinAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const id = searchParams.get('id');

  // === 认证重定向 ===
  const handleAuthRedirect = () => {
    const currentUrl = window.location.href;
    authManager.redirectToAuth(currentUrl);
  };

  // === 数据加载函数 ===
  const loadAttendanceData = useCallback(
    async (isRefetch = false) => {
      if (!id) return;

      if (dataFetchAbortRef.current && !isRefetch) {
        dataFetchAbortRef.current.abort();
      }
      dataFetchAbortRef.current = new AbortController();
      const { signal } = dataFetchAbortRef.current;

      if (!isRefetch) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const p = icaLinkApiClient.get<BackendAttendanceData>(
          `/icalink/v1/courses/external/${encodeURIComponent(
            id
          )}/complete?type=student`
        );
        const response = await withAbort(Promise.resolve(p as any), signal);

        if (response.success && response.data) {
          if (!isMountedRef.current) return;
          setAttendanceData(response.data);
        } else {
          throw new Error(response.message || '获取课程信息失败');
        }
      } catch (err: unknown) {
        if ((err as any)?.name === 'AbortError') {
          console.log('Data fetch aborted');
          return;
        }
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('401')) {
          // handleAuthRedirect();
          return;
        }
        setError(errorMessage);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [id]
  );

  // === 签到处理函数 ===
  const handleCheckin = async () => {
    // 防止重复点击：如果已经在处理签到，直接返回
    if (checkinLoading) {
      return;
    }

    if (!id || !attendanceData) {
      return;
    }

    // 检查页面可见性
    if (document.visibilityState !== 'visible') {
      toast.error('签到失败', {
        description: '页面不是当前活动窗口，已阻止签到操作。'
      });
      return;
    }

    // 如果已有进行中的请求，直接返回（不中止）
    if (checkinAbortRef.current) {
      return;
    }

    // 创建新的 AbortController
    checkinAbortRef.current = new AbortController();
    const { signal } = checkinAbortRef.current;

    // 设置加载状态（这会自动禁用按钮）
    setCheckinLoading(true);

    try {
      // 1. 获取地理位置
      let locationData: LocationInfo;
      try {
        const p =
          LocationHelper.getCurrentLocation() as unknown as Promise<LocationInfo>;
        locationData = await withAbort(p, signal);
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          throw new Error('签到已取消');
        }
        throw new Error('获取位置失败，请检查浏览器或系统位置权限设置。');
      }

      // 2. 验证位置范围
      const roomInfo = attendanceData.course.room_s;
      if (!roomInfo) {
        throw new Error('课程教室信息缺失，无法进行位置验证。');
      }
      const locationValidation = validateLocationForCheckIn(
        { lat: locationData.latitude, lng: locationData.longitude },
        roomInfo
      );
      if (
        !locationValidation.valid
        // attendanceData.student.xh !== '0306012409428'
      ) {
        // 位置校验失败，显示对话框让用户选择
        setPendingLocationData(locationData);
        setLocationValidationDistance(locationValidation.distance);
        setShowLocationFailedDialog(true);
        // 抛出错误以触发 finally 块清理状态
        throw new Error('LOCATION_VALIDATION_FAILED');
      }

      // 3. 判断签到来源并构建Payload
      const { verification_windows } = attendanceData;

      // 判断是否为窗口期签到
      const isWindowCheckin = !!(
        verification_windows?.window_id &&
        verification_windows?.open_time &&
        verification_windows?.duration_minutes
      );

      // 构建基础 payload
      const payload: any = {
        location: locationData.address.description,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        course_start_time: attendanceData.course.course_start_time // ✅ 必填字段
      };

      // 如果是窗口期签到，添加窗口相关字段
      if (isWindowCheckin && verification_windows) {
        // 计算窗口关闭时间
        const windowOpenTime = new Date(verification_windows.open_time);
        const windowCloseTime = addMinutes(
          windowOpenTime,
          verification_windows.duration_minutes
        );

        payload.window_id = verification_windows.window_id;
        payload.window_open_time = verification_windows.open_time;
        payload.window_close_time = windowCloseTime.toISOString();
      }

      // 4. 发起签到请求
      const req = attendanceApi.studentCheckIn(attendanceData.id, payload);
      const response = await withAbort(Promise.resolve(req), signal);

      if (response.success) {
        toast.success('签到成功!', { description: '签到状态已更新。' });
        // 只在接口成功后，基于本地快照更新并立刻重算 UI（不二次拉取）
        let nextData: BackendAttendanceData | null = null;
        // ⭐ 签到成功后，直接更新本地状态
        setAttendanceData((prevData) => {
          if (!prevData) return null;

          const updatedData = { ...prevData };
          const now = new Date().toISOString();

          // 如果是窗口签到，更新窗口信息和考勤记录
          if (isWindowCheckin && verification_windows) {
            updatedData.verification_windows = {
              ...verification_windows,
              attendance_record: {
                id: prevData.attendance_record_id || 0,
                checkin_time: now,
                status: 'present',
                last_checkin_source: 'window',
                last_checkin_reason: '窗口签到',
                window_id: verification_windows.window_id
              }
            };
          }

          // 更新状态字段（根据 updateStatusField 更新对应的状态）
          if (displayState?.updateStatusField) {
            // 使用类型断言来避免类型错误
            (updatedData as any)[displayState.updateStatusField] = 'present';
          }
          nextData = updatedData;
          return updatedData;
        });
        if (nextData) {
          // 立即以最新快照重算显示状态（无需等 1s 的 setInterval）
          setDisplayState(determineDisplayState(nextData, new Date()));
        }
      } else {
        throw new Error(response.message || '签到失败，请重试');
      }
    } catch (error: any) {
      // 特殊处理：位置校验失败不显示错误提示（已显示对话框）
      if (error?.message === 'LOCATION_VALIDATION_FAILED') {
        // 不显示 toast，对话框已经显示
        return;
      }

      // 处理其他错误
      if (error?.name !== 'AbortError') {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('401')) {
          handleAuthRedirect();
        } else {
          toast.error('签到失败', { description: errorMessage });
        }
      }
    } finally {
      // 确保总是清理状态
      if (!signal.aborted) {
        setCheckinLoading(false);
      }
      checkinAbortRef.current = null; // 清理 AbortController 引用
    }
  };

  // === 处理位置校验失败对话框操作 ===

  // 刷新位置（对话框内刷新，不关闭对话框）
  const handleRefreshLocation = async () => {
    if (!attendanceData) {
      toast.error('刷新位置失败', { description: '课程信息缺失' });
      return;
    }

    try {
      // 1. 重新获取地理位置
      const locationData =
        (await LocationHelper.getCurrentLocation()) as unknown as LocationInfo;

      // 2. 验证位置范围
      const roomInfo = attendanceData.course.room_s;
      if (!roomInfo) {
        throw new Error('课程教室信息缺失，无法进行位置验证。');
      }

      const locationValidation = validateLocationForCheckIn(
        { lat: locationData.latitude, lng: locationData.longitude },
        roomInfo
      );

      if (locationValidation.valid) {
        // 位置校验成功，自动签到
        toast.info('位置校验成功', { description: '正在自动签到...' });

        // 关闭对话框
        setShowLocationFailedDialog(false);
        setPendingLocationData(null);
        setLocationValidationDistance(undefined);

        // 构建签到 payload
        const { verification_windows } = attendanceData;
        const isWindowCheckin = !!(
          verification_windows?.window_id &&
          verification_windows?.open_time &&
          verification_windows?.duration_minutes
        );

        const payload: any = {
          location: locationData.address.description,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          course_start_time: attendanceData.course.course_start_time
        };

        // 如果是窗口期签到，添加窗口相关字段
        if (isWindowCheckin && verification_windows) {
          const windowOpenTime = new Date(verification_windows.open_time);
          const windowCloseTime = addMinutes(
            windowOpenTime,
            verification_windows.duration_minutes
          );

          payload.window_id = verification_windows.window_id;
          payload.window_open_time = verification_windows.open_time;
          payload.window_close_time = windowCloseTime.toISOString();
        }

        // 发起签到请求
        const response = await attendanceApi.studentCheckIn(
          attendanceData.id,
          payload
        );

        if (response.success) {
          toast.success('签到成功!', { description: '签到状态已更新。' });
          // 刷新数据
          await loadAttendanceData(true);
        } else {
          throw new Error(response.message || '签到失败，请重试');
        }
      } else {
        // 位置仍然校验失败，更新距离显示
        setPendingLocationData(locationData);
        setLocationValidationDistance(locationValidation.distance);
        const distance = locationValidation.distance || 0;
        toast.warning('位置仍未在范围内', {
          description: `距离约 ${Math.round(distance)} 米，请继续刷新或使用图片签到`
        });
      }
    } catch (error) {
      console.error('刷新位置失败:', error);
      toast.error('刷新位置失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      });
    }
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
        onProgress: (progress: number) => {
          // browser-image-compression 的进度是 0-100
          setCompressionProgress(progress);
          console.log('压缩进度:', progress);
        }
      };

      const compressedFile = await imageCompression(file, options);

      console.log('图片压缩完成:', {
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRate: Math.round(
          ((file.size - compressedFile.size) / file.size) * 100
        )
      });

      // 压缩完成，设置进度为100%
      setCompressionProgress(100);

      return compressedFile;
    } catch (error) {
      console.error('图片压缩失败:', error);
      throw new Error('图片压缩失败，请重试');
    } finally {
      // 重置压缩状态
      setIsCompressing(false);
    }
  };

  // 浏览器原生相机拍照处理函数
  const handleBrowserCameraCapture = () => {
    console.log('📸 使用浏览器原生相机接口');

    try {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // 优先使用后置摄像头

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          console.log('⚠️ 未选择文件');
          return;
        }

        console.log('📷 获取到图片文件:', {
          name: file.name,
          size: file.size,
          type: file.type
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
            console.error('❌ 不支持的文件类型:', file.type);
            return;
          }

          // 验证文件大小（10MB）
          const maxSize = 20 * 1024 * 1024;
          if (file.size > maxSize) {
            toast.error('文件过大', {
              description: `文件大小不能超过 ${maxSize / 1024 / 1024}MB`
            });
            console.error('❌ 文件过大:', file.size);
            return;
          }

          console.log('✅ 文件验证通过');

          // 生成预览 URL
          const previewUrl = URL.createObjectURL(file);

          // 设置预览状态
          setOriginalFileSize(file.size);
          setCompressedFileSize(0); // 标记为未压缩
          setCompressedFile(file); // 保存原始文件
          setPreviewImageUrl(previewUrl);

          // 显示预览对话框
          setShowImagePreview(true);

          console.log('✅ 已打开图片预览对话框');
        } catch (error) {
          console.error('❌ 处理图片失败:', error);
          toast.error('处理图片失败', {
            description: error instanceof Error ? error.message : '请稍后重试'
          });
        }
      };

      // 触发文件选择
      input.click();
    } catch (error) {
      console.error('❌ 打开相机失败:', error);
      toast.error('打开相机失败', {
        description: '请重试'
      });
    }
  };

  // 图片签到（使用浏览器原生相机）
  const handlePhotoCheckin = async () => {
    if (!attendanceData || !pendingLocationData) {
      return;
    }

    // 关闭对话框
    setShowLocationFailedDialog(false);
    setCheckinLoading(true);

    console.log('🚀 开始图片签到流程');

    // 使用浏览器原生相机
    handleBrowserCameraCapture();
  };

  // 处理预览确认 - 压缩图片、上传图片并签到
  const handlePreviewConfirm = async () => {
    if (!compressedFile || !attendanceData || !pendingLocationData) {
      return;
    }

    try {
      // 1. 先压缩图片（在对话框中显示压缩进度）
      const compressed = await compressImage(compressedFile);

      // 更新压缩后的文件大小
      setCompressedFileSize(compressed.size);
      setCompressedFile(compressed);

      // 2. 上传图片到 OSS（带进度回调）
      setIsUploading(true);
      setUploadProgress(0);

      const uploadResult = await attendanceApi.uploadCheckinPhoto(
        compressed,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.message || '图片上传失败，请重试');
      }

      const { photo_url: objectPath } = uploadResult.data;

      // 2. 构建图片签到 payload
      const { verification_windows } = attendanceData;
      const isWindowCheckin = !!(
        verification_windows?.window_id &&
        verification_windows?.open_time &&
        verification_windows?.duration_minutes
      );

      const payload: any = {
        location: pendingLocationData.address.description,
        latitude: pendingLocationData.latitude,
        longitude: pendingLocationData.longitude,
        accuracy: pendingLocationData.accuracy,
        course_start_time: attendanceData.course.course_start_time,
        photo_url: objectPath, // 图片 OSS 路径
        location_offset_distance: locationValidationDistance, // 位置偏移距离
        last_checkin_source: isWindowCheckin ? 'window' : 'regular' // 保持与普通签到一致
      };

      // 如果是窗口期签到，添加窗口相关字段
      if (isWindowCheckin && verification_windows) {
        const windowOpenTime = new Date(verification_windows.open_time);
        const windowCloseTime = addMinutes(
          windowOpenTime,
          verification_windows.duration_minutes
        );

        payload.window_id = verification_windows.window_id;
        payload.window_open_time = verification_windows.open_time;
        payload.window_close_time = windowCloseTime.toISOString();
      }

      // 4. 发起签到请求
      const response = await attendanceApi.studentCheckIn(
        attendanceData.id,
        payload
      );

      if (response.success) {
        toast.success('照片签到已提交', {
          description: '您的签到申请已提交，等待教师审核。'
        });

        // ✅ 直接更新本地状态，无需重新请求接口
        let nextData: BackendAttendanceData | null = null;
        setAttendanceData((prevData) => {
          if (!prevData) return null;

          const updatedData = { ...prevData };

          // 如果是窗口签到，更新窗口信息和考勤记录
          if (isWindowCheckin && verification_windows) {
            const now = new Date().toISOString();
            updatedData.verification_windows = {
              ...verification_windows,
              attendance_record: {
                id: prevData.attendance_record_id || 0,
                checkin_time: now,
                status: 'pending_approval',
                last_checkin_source: 'window',
                last_checkin_reason: '位置校验失败，使用照片签到',
                window_id: verification_windows.window_id
              }
            };
          }

          // 更新状态字段（根据 updateStatusField 更新对应的状态）
          if (displayState?.updateStatusField) {
            // 使用类型断言来避免类型错误
            (updatedData as any)[displayState.updateStatusField] =
              'pending_approval';
          }

          // 添加 metadata 字段
          updatedData.metadata = {
            photo_url: objectPath,
            location_offset_distance: locationValidationDistance,
            reason: '位置校验失败，使用照片签到'
          };

          nextData = updatedData;
          return updatedData;
        });

        // 立即重新计算显示状态
        if (nextData) {
          setDisplayState(determineDisplayState(nextData, new Date()));
        }

        // 关闭预览对话框
        handlePreviewCancel();
      } else {
        throw new Error(response.message || '签到失败，请重试');
      }
    } catch (error) {
      console.error('照片签到失败:', error);
      toast.error('照片签到失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCompressionProgress(0);
      setIsCompressing(false);
    }
  };

  // 处理预览取消 - 清理状态并允许重新拍照
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
    setCheckinLoading(false);
    setPendingLocationData(null);
    setLocationValidationDistance(undefined);
  };

  // 撤回请假申请
  const handleWithdrawLeave = async () => {
    if (!attendanceData?.attendance_record_id) {
      toast.error('撤回失败', {
        description: '未找到考勤记录信息'
      });
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await attendanceApi.studentWithdrawLeave(
        attendanceData.attendance_record_id
      );

      if (response.success) {
        toast.success('请假申请已撤回');
        // 刷新数据
        await loadAttendanceData(true);
      } else {
        toast.error('撤回失败', {
          description: response.message || '请稍后重试'
        });
      }
    } catch (error) {
      console.error('撤回请假申请失败:', error);
      toast.error('撤回失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setWithdrawLoading(false);
      setShowWithdrawConfirm(false);
    }
  };

  // === Effects ===

  // 组件挂载/卸载
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      dataFetchAbortRef.current?.abort();
      checkinAbortRef.current?.abort();
    };
  }, []);

  // 页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面恢复可见时，重新加载数据
        console.log('Page is visible again, reloading data...');
        loadAttendanceData(true);
      } else {
        // 页面隐藏时，中止正在进行的请求
        dataFetchAbortRef.current?.abort();
        checkinAbortRef.current?.abort();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadAttendanceData]);

  // 初始化加载用户信息和WPS SDK
  useEffect(() => {
    checkWPSSDKStatus(setCurrentLocation);
  }, []);

  // 课程ID变化时，加载数据
  useEffect(() => {
    if (id) {
      setAttendanceData(null);
      setDisplayState(null);
      loadAttendanceData();
    }
  }, [id, loadAttendanceData]);

  // 时间和数据显示状态更新
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      // 实时计算显示状态
      if (attendanceData) {
        setDisplayState(determineDisplayState(attendanceData, now));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attendanceData]); // 依赖 attendanceData

  // === 渲染逻辑 ===

  if (isLoading || !displayState) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p className='text-gray-600'>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <h1 className='mb-4 text-2xl font-bold text-red-600'>加载失败</h1>
          <p className='mb-4 text-gray-600'>{error}</p>
          <button
            type='button'
            onClick={() => loadAttendanceData()}
            className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!id || !attendanceData) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <h1 className='mb-4 text-xl font-semibold text-gray-800'>
            暂无课程数据
          </h1>
          <p className='mb-4 text-gray-600'>
            {!id
              ? '缺少课程参数，请从课程列表进入。'
              : '未获取到课程详情，请尝试刷新。'}
          </p>
        </div>
      </div>
    );
  }

  const { course } = attendanceData;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-md space-y-4 p-4'>
        {/* 学生信息卡片 */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='flex items-center space-x-4'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
              <User className='h-8 w-8 text-gray-600' />
            </div>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>
                {attendanceData.student.xm || '未知用户'}
              </h1>
              <p className='text-gray-600'>
                学号：
                {attendanceData.student.xh || '未知'}
              </p>
              <div className='mt-2 space-y-1'>
                <p className='text-sm text-gray-500'>
                  班级：{attendanceData.student.bjmc || '未知班级'}
                </p>
                <p className='text-sm text-gray-500'>
                  专业：{attendanceData.student.zymc || '未知专业'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 课程信息卡片 */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-bold text-gray-900'>
            {course.kcmc}
          </h2>
          <div className='space-y-3'>
            <div className='flex items-center text-gray-600'>
              <Calendar className='mr-3 h-4 w-4 text-gray-400' />
              <span className='text-sm'>
                {new Date(course.course_start_time).toLocaleDateString(
                  'zh-CN',
                  {
                    month: '2-digit',
                    day: '2-digit',
                    weekday: 'short'
                  }
                )}
              </span>
            </div>
            <div className='flex items-center text-gray-600'>
              <Clock className='mr-3 h-4 w-4 text-gray-400' />
              <span className='text-sm'>
                {new Date(course.course_start_time).toLocaleTimeString(
                  'zh-CN',
                  {
                    hour: '2-digit',
                    minute: '2-digit'
                  }
                )}{' '}
                -{' '}
                {new Date(course.course_end_time).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className='flex items-center text-gray-600'>
              <MapPin className='mr-3 h-4 w-4 text-gray-400' />
              <span className='text-sm'>{course.room_s} 室</span>
            </div>
            <div className='flex items-center text-gray-600'>
              <User className='mr-3 h-4 w-4 text-gray-400' />
              <span className='text-sm'>{course.xm_s}</span>
            </div>
            <div className='flex items-center text-gray-600'>
              <BookOpen className='mr-3 h-4 w-4 text-gray-400' />
              <span className='text-sm'>
                第{course.jxz}教学周 {course.jc_s}节
              </span>
            </div>
          </div>
        </div>

        {/* 签到状态卡片 */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='mb-6 text-center'>
            <div className={displayState.statusColor}>
              <div className='mb-3 text-4xl'>{displayState.statusIcon}</div>
              <div className='text-xl font-semibold'>
                {displayState.statusText}
              </div>
              {displayState.subText && (
                <div className='mt-2 text-sm text-gray-500'>
                  {displayState.subText}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='space-y-3'>
            {displayState.uiCategory === 'leaveCheckinEnabled' && (
              <>
                <button
                  type='button'
                  onClick={handleCheckin}
                  disabled={checkinLoading}
                  className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                    checkinLoading
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {checkinLoading
                    ? '处理中...'
                    : displayState.checkInButtonText}
                </button>
                <button
                  type='button'
                  onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                  className={`w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700`}
                >
                  {displayState.leaveButtonText}
                </button>
              </>
            )}

            {displayState.uiCategory === 'leaveCheckinDisabled' && (
              <>
                <button
                  type='button'
                  disabled
                  className={`w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-3 font-semibold text-gray-500 transition-colors`}
                >
                  {displayState.checkInButtonText}
                </button>
                <button
                  type='button'
                  onClick={() => navigate(`/leave/${encodeURIComponent(id)}`)}
                  className={`w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700`}
                >
                  {displayState.leaveButtonText}
                </button>
              </>
            )}

            {displayState.uiCategory === 'checkinOnly' && (
              <button
                type='button'
                onClick={handleCheckin}
                disabled={checkinLoading}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                  checkinLoading
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {checkinLoading ? '处理中...' : displayState.checkInButtonText}
              </button>
            )}

            {/* 撤回请假申请按钮 */}
            {attendanceData &&
              attendanceData.attendance_record_id &&
              (attendanceData.pending_status === 'leave' ||
                attendanceData.pending_status === 'leave_pending' ||
                attendanceData.final_status === 'leave' ||
                attendanceData.final_status === 'leave_pending' ||
                attendanceData.live_status === 'leave' ||
                attendanceData.live_status === 'leave_pending') &&
              new Date() <
                new Date(attendanceData.course.course_start_time) && (
                <button
                  type='button'
                  onClick={() => setShowWithdrawConfirm(true)}
                  disabled={withdrawLoading}
                  className='w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500'
                >
                  {withdrawLoading ? '处理中...' : '撤回申请'}
                </button>
              )}
          </div>
        </div>

        {/* 时间提示卡片 */}
        <div className='rounded-lg bg-gray-50 p-4 text-sm text-gray-700'>
          <p>
            <strong>当前时间：</strong>
            {currentTime.toLocaleTimeString('zh-CN')}
          </p>
        </div>
      </div>
      {/* <StudentFloatingMessageButton /> */}

      {/* 图片预览对话框 */}
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

      {/* 位置校验失败对话框 */}
      <LocationFailedDialog
        isOpen={showLocationFailedDialog}
        onClose={() => {
          setShowLocationFailedDialog(false);
          setPendingLocationData(null);
          setLocationValidationDistance(undefined);
          setCheckinLoading(false); // 重置加载状态，允许用户重新签到
          checkinAbortRef.current = null; // 清理 AbortController 引用
          // 显示窗口已结束提示
          if (attendanceData?.verification_windows) {
            const windowOpenTime = new Date(
              attendanceData.verification_windows.open_time
            );
            const windowCloseTime = addMinutes(
              windowOpenTime,
              attendanceData.verification_windows.duration_minutes
            );
            const now = new Date();
            if (now > windowCloseTime) {
              toast.info('签到时间窗口已结束', {
                description: '请联系教师处理签到问题'
              });
              // 刷新数据
              loadAttendanceData(true);
            }
          }
        }}
        onPhotoCheckin={handlePhotoCheckin}
        onRefreshLocation={handleRefreshLocation}
        isLoading={checkinLoading}
        distance={locationValidationDistance}
        windowEndTime={
          attendanceData?.verification_windows
            ? addMinutes(
                new Date(attendanceData.verification_windows.open_time),
                attendanceData.verification_windows.duration_minutes
              ).toISOString()
            : undefined
        }
      />

      {/* 撤回请假申请确认对话框 */}
      <ConfirmDialog
        isOpen={showWithdrawConfirm}
        onClose={() => setShowWithdrawConfirm(false)}
        onConfirm={handleWithdrawLeave}
        title='撤回请假申请'
        message='确定要撤回请假申请吗？撤回后您的签到状态将恢复为未签到。'
        confirmText='确定撤回'
        cancelText='取消'
        isLoading={withdrawLoading}
        variant='danger'
      />
    </div>
  );
}

export function StudentDashboard() {
  return (
    <ToastProvider>
      <Toaster />
      <StudentDashboardContent />
    </ToastProvider>
  );
}
