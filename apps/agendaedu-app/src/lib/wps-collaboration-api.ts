// WPS协作JSAPI集成模块 - 适配本地SDK
// 基于WPS协作网页应用开发工具包 v0.2.0

interface WPSCollaborationConfig {
  appId: string;
  scope: string[];
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address: {
    city: string;
    provice: string;
    description: string;
    district: string;
    road: string;
    roadNum: string;
  };
  accuracy: number;
}

interface ImageInfo {
  localId: string;
  serverId?: string;
  base64?: string;
}

// WPS SDK chooseImage 返回的图片信息
interface WPSImageInfo {
  imageSize: number; // 图片大小（字节）
  imagePath: string; // 图片路径
  imageName: string; // 文件名
  localID?: string; // 本地资源 ID（仅 Android）
}

interface ShareData {
  title: string;
  desc: string;
  link: string;
  imgUrl?: string;
}

interface CheckInRecord {
  studentId: string;
  studentName: string;
  checkInTime: string;
  location: LocationInfo;
  photos?: string[];
  status: 'present' | 'late' | 'absent';
}

interface CourseInfo {
  courseId: string;
  courseName: string;
  date: string;
  time: string;
  classroom: string;
  teacher: string;
}

interface StudentInfo {
  studentId: string;
  name: string;
  class: string;
  major: string;
}

interface AttendanceData {
  courseId: string;
  courseName: string;
  date: string;
  time: string;
  classroom: string;
  teacher: string;
  records: CheckInRecord[];
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}

// 新增：个人签到统计接口
interface PersonalAttendanceStats {
  studentId: string;
  studentName: string;
  totalClasses: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  attendanceRate: number;
  recentRecords: Array<{
    date: string;
    status: 'present' | 'late' | 'absent' | 'leave';
    courseName: string;
  }>;
}

interface PersonalAttendanceDetail {
  date: string;
  time: string;
  status: 'present' | 'late' | 'absent' | 'leave';
  checkInTime?: string;
  leaveReason?: string;
  location?: LocationInfo;
}

// 新增：课程整体统计接口
interface CourseAttendanceStats {
  courseId: string;
  courseName: string;
  teacher: string;
  totalClasses: number;
  totalStudents: number;
  overallAttendanceRate: number;
  classStats: ClassAttendanceStats[];
  studentStats: PersonalAttendanceStats[];
}

interface ClassAttendanceStats {
  date: string;
  time: string;
  classroom: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  attendanceRate: number;
}

declare global {
  interface Window {
    ksoxz_sdk: {
      canIUse(arg0: string): unknown;
      ready(arg0: () => void): unknown;
      // SDK配置方法
      config: (params: {
        params: {
          appId: string;
          timeStamp: number;
          nonceStr: string;
          signature: string;
        };
        onSuccess: () => void;
        onError: (error: any) => void;
      }) => void;

      // 位置相关API
      getLocationInfo: (params: {
        params: {
          coordinate?: number;
          withReGeocode?: boolean;
          timeout?: number;
          accuracy?: string;
        };
        onSuccess: (result: LocationInfo) => void;
        onError: (error: any) => void;
      }) => void;

      // 图片相关API
      chooseImage: (params: {
        params?: {
          count?: number;
          sizeType?: string[];
          sourceType?: string[];
          enableWatermark?: boolean;
          watermarkConfig?: {
            watermarkText: Array<{ text: string; icon?: string }>;
            position?: 'top' | 'bottom';
            fontSize?: number;
            color?: string;
            backgroundStyleColor?: string;
            backgroundStyleOpacity?: number;
          };
          applyBtnText?: string;
        };
        onSuccess: (result: {
          imageInfos: Array<{
            imageSize: number;
            imagePath: string;
            imageName: string;
            localID?: string;
          }>;
        }) => void;
        onError: (error: any) => void;
      }) => void;

      // 获取图片 Base64（仅 iOS 支持）
      getImageBase64: (params: {
        params: {
          filePath: string;
        };
        onSuccess: (result: { imageBase64: string }) => void;
        onError: (error: any) => void;
      }) => void;

      // 压缩图片
      compressImage: (params: {
        params: {
          filepath: string;
          quality?: number;
        };
        onSuccess: (result: { tempFilePath: string }) => void;
        onError: (error: any) => void;
      }) => void;

      // 获取图片信息
      getImageInfo: (params: {
        params: {
          src: string;
        };
        onSuccess: (result: {
          imageSize: number;
          width: number;
          height: number;
          path: string;
        }) => void;
        onError: (error: any) => void;
      }) => void;

      // 获取设备信息
      getSystemInfo: (params: {
        onSuccess: (result: {
          platform: 'android' | 'ios' | 'windows' | 'mac';
          brand: string;
          model: string;
          system: string;
          appVersion: string;
          deviceId: string;
          screenWidth: number;
          screenHeight: number;
          statusBarHeight: number;
        }) => void;
        onError: (error: any) => void;
      }) => void;

      uploadFile: (params: {
        params: {
          url: string;
          filePath: string;
          name: string;
          formData?: Record<string, any>;
        };
        onSuccess: (result: any) => void;
        onError: (error: any) => void;
      }) => void;

      // 分享相关API
      shareMessage: (params: {
        params: {
          title: string;
          desc: string;
          link: string;
          imgUrl?: string;
        };
        onSuccess: (result: any) => void;
        onError: (error: any) => void;
      }) => void;

      // UI交互API
      showAlert: (params: {
        params: {
          title: string;
          content: string;
          buttonText?: string;
        };
        onSuccess: (result: any) => void;
        onError: (error: any) => void;
      }) => void;

      showConfirm: (params: {
        params: {
          title: string;
          content: string;
          confirmText?: string;
          cancelText?: string;
        };
        onSuccess: (result: { confirm: boolean }) => void;
        onError: (error: any) => void;
      }) => void;

      showToast: (params: {
        params: {
          title: string;
          icon?: 'success' | 'error' | 'loading' | 'none';
          duration?: number;
        };
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
      }) => void;

      // 授权相关API
      authorize: (params: {
        params: { scope: string };
        onSuccess: (result: { auth: boolean }) => void;
        onError: (error: any) => void;
      }) => void;

      // 设备信息API
      getDeviceInfo: (params: {
        onSuccess: (result: any) => void;
        onError: (error: any) => void;
      }) => void;
    };
  }
}

// 导出类型定义
export type {
  AttendanceData,
  CheckInRecord,
  ClassAttendanceStats,
  CourseAttendanceStats,
  CourseInfo,
  ImageInfo,
  PersonalAttendanceDetail,
  PersonalAttendanceStats,
  ShareData,
  StudentInfo,
  WPSCollaborationConfig,
  WPSImageInfo
};
