// WPS协作JSAPI集成模块 - 适配本地SDK
// 基于WPS协作网页应用开发工具包 v0.2.0
class WPSCollaborationService {
    isInitialized = false;
    // private config: WPSCollaborationConfig | null = null;
    /**
     * 初始化WPS协作JSAPI
     */
    async initialize(config) {
        // this.config = config;
        return new Promise((resolve, reject) => {
            if (typeof window !== 'undefined' && window.ksoxz_sdk) {
                // 进行授权
                window.ksoxz_sdk.authorize({
                    params: { scope: config.scope.join(',') },
                    onSuccess: (result) => {
                        if (result.auth) {
                            this.isInitialized = true;
                            console.log('🎉 WPS协作JSAPI初始化成功');
                            resolve();
                        }
                        else {
                            console.error('❌ WPS协作JSAPI授权失败');
                            reject(new Error('授权失败'));
                        }
                    },
                    onError: (error) => {
                        console.error('❌ WPS协作JSAPI授权错误:', error);
                        reject(error);
                    }
                });
            }
            else {
                console.warn('⚠️ WPS协作JSAPI SDK未加载');
                reject(new Error('SDK未加载'));
            }
        });
    }
    /**
     * 检查是否已初始化
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * 获取地理位置信息
     */
    async getLocation() {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.getLocationInfo({
                type: 'gcj02', // 使用国测局坐标系
                onSuccess: (result) => {
                    console.log('📍 获取位置成功:', result);
                    resolve(result);
                },
                onError: (error) => {
                    console.error('❌ 获取位置失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 选择图片
     */
    async chooseImage(count = 1) {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.chooseImage({
                params: {
                    count,
                    sizeType: ['original', 'compressed'],
                    sourceType: ['album', 'camera']
                },
                onSuccess: (result) => {
                    console.log('📷 选择图片成功:', result);
                    resolve(result.localIds);
                },
                onError: (error) => {
                    console.error('❌ 选择图片失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 上传文件
     */
    async uploadFile(filePath, uploadUrl = '/api/upload') {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.uploadFile({
                params: {
                    url: uploadUrl,
                    filePath,
                    name: 'file',
                    formData: {
                        type: 'checkin_photo'
                    }
                },
                onSuccess: (result) => {
                    console.log('📤 上传文件成功:', result);
                    resolve(result.serverId || filePath);
                },
                onError: (error) => {
                    console.error('❌ 上传文件失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 分享内容
     */
    async share(data) {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.shareMessage({
                params: {
                    title: data.title,
                    desc: data.desc,
                    link: data.link,
                    imgUrl: data.imgUrl
                },
                onSuccess: (result) => {
                    console.log('📤 分享成功:', result);
                    resolve();
                },
                onError: (error) => {
                    console.error('❌ 分享失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 显示提示框
     */
    async showAlert(title, content) {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.showAlert({
                params: {
                    title,
                    content,
                    buttonText: '确定'
                },
                onSuccess: () => {
                    resolve();
                },
                onError: (error) => {
                    console.error('❌ 显示提示框失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 显示确认框
     */
    async showConfirm(title, content) {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.showConfirm({
                params: {
                    title,
                    content,
                    confirmText: '确定',
                    cancelText: '取消'
                },
                onSuccess: (result) => {
                    resolve(result.confirm);
                },
                onError: (error) => {
                    console.error('❌ 显示确认框失败:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * 显示Toast提示
     */
    async showToast(title, icon = 'success') {
        if (!this.isReady()) {
            throw new Error('WPS协作JSAPI未初始化');
        }
        return new Promise((resolve) => {
            window.ksoxz_sdk.showToast({
                params: {
                    title,
                    icon,
                    duration: 2000
                },
                onSuccess: () => {
                    resolve();
                },
                onError: () => {
                    resolve(); // Toast失败不影响主流程
                }
            });
        });
    }
    /**
     * 签到功能 - 结合位置和图片
     */
    async checkInWithLocation() {
        try {
            // 获取位置信息
            const location = await this.getLocation();
            // 可选：拍照签到
            const shouldTakePhoto = await this.showConfirm('签到确认', '是否需要拍照签到？');
            let photos = [];
            if (shouldTakePhoto) {
                const localIds = await this.chooseImage(1);
                photos = await Promise.all(localIds.map((localId) => this.uploadFile(localId)));
            }
            return { location, photos };
        }
        catch (error) {
            console.error('❌ 签到失败:', error);
            throw error;
        }
    }
    /**
     * 分享签到结果
     */
    async shareCheckInResult(courseName, location) {
        const shareData = {
            title: `${courseName} 签到成功`,
            desc: `我已在 ${location} 完成课程签到`,
            link: window.location.href,
            imgUrl: '/vite.svg' // 可以替换为应用图标
        };
        await this.share(shareData);
    }
    /**
     * 获取模拟签到数据（用于演示）
     */
    getMockAttendanceData() {
        const mockRecords = [
            {
                studentId: '2021001',
                studentName: '张三',
                checkInTime: '09:05',
                location: {
                    latitude: 39.9042,
                    longitude: 116.4074,
                    address: '教学楼A座 201教室',
                    accuracy: 10
                },
                status: 'present'
            },
            {
                studentId: '2021002',
                studentName: '李四',
                checkInTime: '09:12',
                location: {
                    latitude: 39.9042,
                    longitude: 116.4074,
                    address: '教学楼A座 201教室',
                    accuracy: 8
                },
                status: 'late'
            },
            {
                studentId: '2021003',
                studentName: '王五',
                checkInTime: '',
                location: {
                    latitude: 0,
                    longitude: 0,
                    address: '',
                    accuracy: 0
                },
                status: 'absent'
            }
        ];
        return {
            courseId: 'MATH001',
            courseName: '高等数学',
            date: new Date().toLocaleDateString('zh-CN'),
            time: '09:00 - 10:40',
            classroom: '教学楼A座 201教室',
            teacher: '张教授',
            records: mockRecords,
            totalStudents: 30,
            presentCount: 25,
            lateCount: 3,
            absentCount: 2
        };
    }
    /**
     * 获取历史签到统计数据
     */
    getMockHistoryData() {
        const baseData = this.getMockAttendanceData();
        return [
            {
                ...baseData,
                date: '2024-01-15',
                presentCount: 28,
                lateCount: 1,
                absentCount: 1
            },
            {
                ...baseData,
                date: '2024-01-12',
                presentCount: 26,
                lateCount: 2,
                absentCount: 2
            },
            {
                ...baseData,
                date: '2024-01-10',
                presentCount: 29,
                lateCount: 1,
                absentCount: 0
            }
        ];
    }
    /**
     * 获取个人签到统计数据
     */
    getMockPersonalStats() {
        const students = [
            { id: '2021001', name: '张三' },
            { id: '2021002', name: '李四' },
            { id: '2021003', name: '王五' },
            { id: '2021004', name: '赵六' },
            { id: '2021005', name: '钱七' }
        ];
        return students.map((student) => {
            const recentRecords = [
                {
                    date: '2024-01-15',
                    status: 'present',
                    courseName: '高等数学'
                },
                {
                    date: '2024-01-12',
                    status: student.id === '2021003'
                        ? 'leave'
                        : 'present',
                    courseName: '数据结构'
                },
                {
                    date: '2024-01-10',
                    status: student.id === '2021002' ? 'late' : 'present',
                    courseName: '计算机组成原理'
                },
                {
                    date: '2024-01-08',
                    status: student.id === '2021005'
                        ? 'absent'
                        : 'present',
                    courseName: '高等数学'
                }
            ];
            const presentCount = recentRecords.filter((d) => d.status === 'present').length;
            const lateCount = recentRecords.filter((d) => d.status === 'late').length;
            const absentCount = recentRecords.filter((d) => d.status === 'absent').length;
            const leaveCount = recentRecords.filter((d) => d.status === 'leave').length;
            const totalClasses = recentRecords.length;
            return {
                studentId: student.id,
                studentName: student.name,
                totalClasses,
                presentCount,
                lateCount,
                absentCount,
                leaveCount,
                attendanceRate: ((presentCount + lateCount) / totalClasses) * 100,
                recentRecords
            };
        });
    }
    /**
     * 获取模拟课程信息
     */
    getMockCourseInfo() {
        return {
            courseId: 'MATH001',
            courseName: '高等数学',
            date: new Date().toLocaleDateString('zh-CN'),
            time: '09:00 - 10:40',
            classroom: '教学楼A座 201教室',
            teacher: '张教授'
        };
    }
    /**
     * 获取模拟学生信息
     */
    getMockStudentInfo() {
        return {
            studentId: '2021001',
            name: '张三',
            class: '计算机科学与技术2021-1班',
            major: '计算机科学与技术'
        };
    }
    /**
     * 获取学生签到记录
     */
    getStudentCheckInRecord(_studentId) {
        // 模拟检查学生是否已签到
        // 实际应用中这里会查询数据库或API
        return null;
    }
    /**
     * 获取当前位置（别名方法）
     */
    async getCurrentLocation() {
        return this.getLocation();
    }
    /**
     * 提交签到记录
     */
    async submitCheckIn(checkInData) {
        // 模拟提交签到数据
        console.log('提交签到数据:', checkInData);
        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // 实际应用中这里会调用API提交数据
        return Promise.resolve();
    }
    /**
     * 获取课程整体统计数据
     */
    getMockCourseStats() {
        const personalStats = this.getMockPersonalStats();
        const historyData = this.getMockHistoryData();
        const classStats = historyData.map((data) => ({
            date: data.date,
            time: data.time,
            classroom: data.classroom,
            totalStudents: data.totalStudents,
            presentCount: data.presentCount,
            lateCount: data.lateCount,
            absentCount: data.absentCount,
            leaveCount: 0, // 可以根据实际数据计算
            attendanceRate: ((data.presentCount + data.lateCount) / data.totalStudents) * 100
        }));
        const totalClasses = classStats.length;
        const totalAttendances = classStats.reduce((sum, stat) => sum + stat.presentCount + stat.lateCount, 0);
        const totalPossibleAttendances = classStats.reduce((sum, stat) => sum + stat.totalStudents, 0);
        return {
            courseId: 'MATH001',
            courseName: '高等数学',
            teacher: '张教授',
            totalClasses,
            totalStudents: 30,
            overallAttendanceRate: (totalAttendances / totalPossibleAttendances) * 100,
            classStats,
            studentStats: personalStats
        };
    }
}
// 创建全局实例
export const wpsCollaboration = new WPSCollaborationService();
//# sourceMappingURL=wps-collaboration-api.js.map