// WPS JSAPI 集成模块
// 基于WPS WebOffice开放平台的JSAPI
class WPSAPIService {
    instance = null;
    isInitialized = false;
    async initialize(config) {
        try {
            if (typeof window !== 'undefined' && window.WebOfficeSDK) {
                const WebOfficeSDK = window.WebOfficeSDK;
                this.instance = WebOfficeSDK.init({
                    officeType: WebOfficeSDK.OfficeType[config.officeType],
                    appId: config.appId,
                    fileId: config.fileId
                });
                await this.instance.ready();
                this.isInitialized = true;
                console.log('WPS JSAPI 初始化成功');
            }
            else {
                console.warn('WPS WebOffice SDK 未加载，使用模拟模式');
                this.isInitialized = false;
            }
        }
        catch (error) {
            console.error('WPS JSAPI 初始化失败:', error);
            this.isInitialized = false;
        }
    }
    isReady() {
        return this.isInitialized && this.instance !== null;
    }
    async createLeaveApplication(data) {
        if (!this.isReady()) {
            console.log('模拟创建请假申请文档:', data);
            return;
        }
        try {
            const app = this.instance.Application;
            const doc = await app.ActiveDocument;
            doc.Range.Text = '请假申请表\n\n';
            const content = `申请人姓名：${data.studentName}
学号：${data.studentId}
请假类型：${data.type}
请假时间：${data.startDate} ${data.startTime} 至 ${data.endDate} ${data.endTime}
请假原因：${data.reason}
申请时间：${data.submitTime}

申请人签名：________________

审批意见：

审批人签名：________________
审批时间：________________`;
            await doc.Range.InsertAfter(content);
            console.log('请假申请文档创建成功');
        }
        catch (error) {
            console.error('创建请假申请文档失败:', error);
        }
    }
    async createAttendanceSheet(data) {
        if (!this.isReady()) {
            console.log('模拟创建签到表文档:', data);
            return;
        }
        try {
            const app = this.instance.Application;
            if (app.ActiveWorkbook) {
                const sheet = await app.ActiveSheet;
                sheet.Cells(1, 1).Value = `${data.courseName} 签到表`;
                sheet.Cells(2, 1).Value = `日期：${data.date}`;
                sheet.Cells(3, 1).Value = `时间：${data.time}`;
                sheet.Cells(4, 1).Value = `地点：${data.location}`;
                sheet.Cells(6, 1).Value = '序号';
                sheet.Cells(6, 2).Value = '姓名';
                sheet.Cells(6, 3).Value = '学号';
                sheet.Cells(6, 4).Value = '签到时间';
                sheet.Cells(6, 5).Value = '状态';
                for (let i = 0; i < data.students.length; i++) {
                    const student = data.students[i];
                    const row = 7 + i;
                    sheet.Cells(row, 1).Value = i + 1;
                    sheet.Cells(row, 2).Value = student.name;
                    sheet.Cells(row, 3).Value = student.id;
                    sheet.Cells(row, 4).Value = student.checkInTime || '';
                    sheet.Cells(row, 5).Value = this.getStatusText(student.status);
                }
                console.log('签到表文档创建成功');
            }
        }
        catch (error) {
            console.error('创建签到表文档失败:', error);
        }
    }
    getStatusText(status) {
        switch (status) {
            case 'present':
                return '已签到';
            case 'late':
                return '迟到';
            case 'absent':
                return '缺勤';
            default:
                return '未知';
        }
    }
}
export const wpsAPI = new WPSAPIService();
//# sourceMappingURL=wps-api.js.map