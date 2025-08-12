/**
 * OAuth认证流程集成测试
 */

import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthController from '../../controllers/AuthController.js';
import StudentRepository from '../../repositories/StudentRepository.js';
import TeacherRepository from '../../repositories/TeacherRepository.js';
import JWTService from '../../services/JWTService.js';
import UserAuthService from '../../services/UserAuthService.js';
import WPSApiService from '../../services/WPSApiService.js';

describe('OAuth认证流程集成测试', () => {
  let authController: AuthController;
  let jwtService: JWTService;
  let wpsApiService: WPSApiService;
  let userAuthService: UserAuthService;
  let studentRepository: StudentRepository;
  let teacherRepository: TeacherRepository;
  let mockLogger: any;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 创建服务实例
    jwtService = new JWTService(mockLogger);
    wpsApiService = new WPSApiService(mockLogger);
    studentRepository = new StudentRepository(mockLogger);
    teacherRepository = new TeacherRepository(mockLogger);
    userAuthService = new UserAuthService(
      studentRepository,
      teacherRepository,
      mockLogger
    );

    authController = new AuthController(
      jwtService,
      wpsApiService,
      userAuthService,
      mockLogger
    );

    // Mock请求和响应对象
    mockRequest = {
      query: {
        code: 'test-auth-code',
        state: Buffer.from('http://localhost:3000||type=web', 'utf8').toString(
          'base64'
        )
      }
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      setCookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis()
    };
  });

  describe('handleAuthorizationCallback', () => {
    it('应该处理缺少授权码的情况', async () => {
      mockRequest.query.code = undefined;

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_CODE',
        message: '缺少授权码'
      });
    });

    it('应该处理缺少state参数的情况', async () => {
      mockRequest.query.state = undefined;

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'MISSING_STATE',
        message: '缺少state参数'
      });
    });

    it('应该处理OAuth错误', async () => {
      mockRequest.query.error = 'access_denied';
      mockRequest.query.error_description = 'User denied access';

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth authorization error:',
        {
          error: 'access_denied',
          error_description: 'User denied access'
        }
      );
    });

    it('应该处理无效的state参数', async () => {
      mockRequest.query.state = 'invalid-base64';

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_STATE',
        message: 'state参数格式错误'
      });
    });

    it('应该处理WPS API token获取失败', async () => {
      // Mock WPS API服务抛出错误
      vi.spyOn(wpsApiService, 'getAccessToken').mockRejectedValue(
        new Error('WPS API request failed')
      );

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get WPS access token:',
        expect.any(Error)
      );
    });

    it('应该处理WPS用户信息获取失败', async () => {
      // Mock成功获取token但获取用户信息失败
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockRejectedValue(
        new Error('Failed to get user info')
      );

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get WPS user info:',
        expect.any(Error)
      );
    });

    it('应该处理本地用户不存在的情况', async () => {
      // Mock WPS API成功返回
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockResolvedValue({
        openid: 'wps-user-123',
        nickname: '不存在的用户',
        third_union_id: '9999999' // 不存在的学号/工号
      });

      // Mock用户认证服务返回未匹配
      vi.spyOn(userAuthService, 'findLocalUser').mockResolvedValue({
        matched: false,
        matchType: 'none',
        error: '用户不存在于本地数据库中'
      });

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User not found in local database',
        expect.objectContaining({
          wpsOpenid: 'wps-user-123',
          wpsNickname: '不存在的用户'
        })
      );
    });

    it('应该处理学生用户成功认证流程', async () => {
      // Mock WPS API成功返回
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockResolvedValue({
        openid: 'wps-user-123',
        nickname: '张三',
        unionid: 'union-123',
        third_union_id: '2021001' // 学号
      });

      // Mock找到学生用户
      const mockStudent = {
        id: '1',
        xm: '张三',
        xh: '2021001',
        xymc: '计算机学院',
        zymc: '软件工程',
        bjmc: '软工2101班',
        email: 'zhangsan@example.com',
        sjh: '13800138001',
        lx: 1
      };

      vi.spyOn(userAuthService, 'findLocalUser').mockResolvedValue({
        matched: true,
        user: {
          id: '1',
          name: '张三',
          userType: 'student',
          email: 'zhangsan@example.com',
          phone: '13800138001',
          studentInfo: mockStudent
        },
        matchType: 'exact',
        matchedFields: ['name', 'email', 'phone']
      });

      vi.spyOn(userAuthService, 'validateUserAccess').mockResolvedValue(true);

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth authentication successful',
        expect.objectContaining({
          userId: '1',
          name: '张三',
          userType: 'student'
        })
      );

      expect(mockReply.redirect).toHaveBeenCalledWith(
        expect.stringContaining('auth_success=true')
      );
    });

    it('应该处理教师用户成功认证流程', async () => {
      // Mock WPS API成功返回
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockResolvedValue({
        openid: 'wps-teacher-456',
        nickname: '王教授',
        unionid: 'union-456',
        third_union_id: 'T001' // 工号
      });

      // Mock找到教师用户
      const mockTeacher = {
        id: '1',
        xm: '王教授',
        gh: 'T001',
        ssdwmc: '计算机学院',
        email: 'wangprof@example.com',
        sjh: '13900139001',
        zc: '教授',
        zgxl: '博士'
      };

      vi.spyOn(userAuthService, 'findLocalUser').mockResolvedValue({
        matched: true,
        user: {
          id: '1',
          name: '王教授',
          userType: 'teacher',
          email: 'wangprof@example.com',
          phone: '13900139001',
          teacherInfo: mockTeacher
        },
        matchType: 'exact',
        matchedFields: ['name', 'email', 'phone']
      });

      vi.spyOn(userAuthService, 'validateUserAccess').mockResolvedValue(true);

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth authentication successful',
        expect.objectContaining({
          userId: '1',
          name: '王教授',
          userType: 'teacher'
        })
      );

      expect(mockReply.redirect).toHaveBeenCalledWith(
        expect.stringContaining('auth_success=true')
      );
    });

    it('应该处理用户访问权限被拒绝的情况', async () => {
      // Mock WPS API和用户查找成功
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockResolvedValue({
        openid: 'wps-user-789',
        nickname: '禁用用户',
        third_union_id: '2021002' // 禁用学生的学号
      });

      vi.spyOn(userAuthService, 'findLocalUser').mockResolvedValue({
        matched: true,
        user: {
          id: '999',
          name: '禁用用户',
          userType: 'student',
          email: 'disabled@example.com'
        },
        matchType: 'exact'
      });

      // Mock用户访问权限验证失败
      vi.spyOn(userAuthService, 'validateUserAccess').mockResolvedValue(false);

      await authController.handleAuthorizationCallback(mockRequest, mockReply);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User access denied',
        expect.objectContaining({
          userId: '999',
          userType: 'student'
        })
      );
    });

    it('should fail when third_union_id is missing', async () => {
      // Mock WPS API成功返回但缺少third_union_id
      vi.spyOn(wpsApiService, 'getAccessToken').mockResolvedValue({
        result: 0,
        token: {
          appid: 'test-app-id',
          expires_in: 3600,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          openid: 'test-openid'
        }
      });

      vi.spyOn(wpsApiService, 'getUserInfo').mockResolvedValue({
        openid: 'wps-user-no-third-id',
        nickname: '缺少ID用户',
        third_union_id: '' // 空的third_union_id
      });

      const response = await request(app)
        .get('/auth/wps/callback')
        .query({
          code: 'test-code',
          state: Buffer.from('http://localhost:3000/dashboard').toString(
            'base64'
          )
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication failed',
        message: 'third_union_id 字段缺失，无法进行用户匹配'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'third_union_id is missing, login failed',
        expect.objectContaining({
          wpsOpenid: 'wps-user-no-third-id',
          wpsNickname: '缺少ID用户'
        })
      );
    });
  });

  describe('JWT载荷创建', () => {
    it('应该为学生用户创建正确的JWT载荷', () => {
      const studentUser = {
        id: '1',
        name: '张三',
        userType: 'student' as const,
        userNumber: '2021001', // 学号
        email: 'zhangsan@example.com',
        phone: '13800138001',
        collegeName: '计算机学院', // 学院名称
        majorName: '软件工程', // 专业名称
        className: '软工2101班', // 班级名称
        studentInfo: {
          id: '1',
          xm: '张三',
          xh: '2021001',
          xymc: '计算机学院',
          zymc: '软件工程',
          bjmc: '软工2101班',
          lx: 1,
          sznj: '2021',
          rxnf: '2021'
        }
      };

      const payload = (authController as any).createEnhancedJWTPayload(
        studentUser
      );

      expect(payload).toMatchObject({
        userId: '1',
        username: '张三',
        userNumber: '2021001', // 学号
        userType: 'student',
        collegeName: '计算机学院', // 学院名称
        studentNumber: '2021001',
        className: '软工2101班',
        majorName: '软件工程',
        studentType: 'undergraduate',
        permissions: expect.arrayContaining([
          'student:profile',
          'student:courses'
        ])
      });
    });

    it('应该为教师用户创建正确的JWT载荷', () => {
      const teacherUser = {
        id: '1',
        name: '王教授',
        userType: 'teacher' as const,
        userNumber: 'T001', // 工号
        email: 'wangprof@example.com',
        phone: '13900139001',
        collegeName: '计算机学院', // 部门名称
        teacherInfo: {
          id: '1',
          xm: '王教授',
          gh: 'T001',
          ssdwmc: '计算机学院',
          zc: '教授',
          zgxl: '博士',
          xw: '博士'
        }
      };

      const payload = (authController as any).createEnhancedJWTPayload(
        teacherUser
      );

      expect(payload).toMatchObject({
        userId: '1',
        username: '王教授',
        userNumber: 'T001', // 工号
        userType: 'teacher',
        collegeName: '计算机学院', // 部门名称
        employeeNumber: 'T001',
        departmentName: '计算机学院',
        title: '教授',
        education: '博士',
        permissions: expect.arrayContaining([
          'teacher:profile',
          'teacher:courses',
          'teacher:students'
        ])
      });
    });
  });
});
