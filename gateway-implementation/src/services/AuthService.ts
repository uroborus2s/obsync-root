// 认证服务
// 提供JWT认证、用户验证、权限检查等功能

import type { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

/**
 * 用户信息接口
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  lastLoginAt?: Date;
}

/**
 * JWT载荷接口
 */
export interface JWTPayload {
  sub: string; // 用户ID
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  iat?: number; // 签发时间
  exp?: number; // 过期时间
  iss?: string; // 签发者
  aud?: string; // 受众
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn: number;
}

/**
 * 认证配置接口
 */
export interface AuthConfig {
  secret: string;
  algorithms: string[];
  expiresIn: string;
  issuer: string;
  audience: string;
  refreshTokenExpiresIn?: string;
}

/**
 * 认证服务类
 * 提供完整的认证和授权功能
 */
export class AuthService {
  private config: AuthConfig;
  private users: Map<string, User> = new Map(); // 简化的用户存储
  private refreshTokens: Set<string> = new Set(); // 刷新令牌存储

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializeDefaultUsers();
  }

  /**
   * 初始化默认用户（演示用）
   */
  private initializeDefaultUsers(): void {
    const defaultUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin', 'user'],
        permissions: [
          'user:read', 'user:write', 'user:delete',
          'order:read', 'order:write', 'order:delete',
          'product:read', 'product:write', 'product:delete',
          'admin:access', 'gateway:manage'
        ],
        createdAt: new Date(),
        metadata: { isDefault: true }
      },
      {
        id: '2',
        username: 'user',
        email: 'user@example.com',
        roles: ['user'],
        permissions: [
          'user:read', 'order:read', 'order:write',
          'product:read', 'notification:read'
        ],
        createdAt: new Date(),
        metadata: { isDefault: true }
      },
      {
        id: '3',
        username: 'guest',
        email: 'guest@example.com',
        roles: ['guest'],
        permissions: ['product:read'],
        createdAt: new Date(),
        metadata: { isDefault: true }
      }
    ];

    defaultUsers.forEach(user => {
      this.users.set(user.username, user);
    });
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { username, password, rememberMe = false } = credentials;

    // 验证用户凭据（简化实现）
    const user = await this.validateCredentials(username, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    this.users.set(username, user);

    // 生成JWT令牌
    const token = this.generateToken(user, rememberMe);
    
    // 生成刷新令牌（如果需要）
    let refreshToken: string | undefined;
    if (rememberMe) {
      refreshToken = this.generateRefreshToken(user);
      this.refreshTokens.add(refreshToken);
    }

    // 计算过期时间
    const expiresIn = this.getTokenExpirationTime(rememberMe);

    return {
      token,
      refreshToken,
      user: this.sanitizeUser(user),
      expiresIn
    };
  }

  /**
   * 验证JWT令牌
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.config.secret, {
        algorithms: this.config.algorithms as jwt.Algorithm[],
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as JWTPayload;

      // 从存储中获取最新的用户信息
      const user = this.users.get(payload.username);
      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.warn('JWT verification failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    if (!this.refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    try {
      const payload = jwt.verify(refreshToken, this.config.secret) as JWTPayload;
      const user = this.users.get(payload.username);
      
      if (!user) {
        throw new Error('User not found');
      }

      // 移除旧的刷新令牌
      this.refreshTokens.delete(refreshToken);

      // 生成新的令牌
      const newToken = this.generateToken(user, true);
      const newRefreshToken = this.generateRefreshToken(user);
      this.refreshTokens.add(newRefreshToken);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user: this.sanitizeUser(user),
        expiresIn: this.getTokenExpirationTime(true)
      };
    } catch (error) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * 用户登出
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
  }

  /**
   * 检查用户权限
   */
  hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * 检查用户角色
   */
  hasRole(user: User, role: string): boolean {
    return user.roles.includes(role);
  }

  /**
   * 检查多个权限（需要全部满足）
   */
  hasAllPermissions(user: User, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * 检查多个权限（满足任一即可）
   */
  hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * 检查多个角色（需要全部满足）
   */
  hasAllRoles(user: User, roles: string[]): boolean {
    return roles.every(role => this.hasRole(user, role));
  }

  /**
   * 检查多个角色（满足任一即可）
   */
  hasAnyRole(user: User, roles: string[]): boolean {
    return roles.some(role => this.hasRole(user, role));
  }

  /**
   * 从请求中提取用户信息
   */
  extractUserFromRequest(request: FastifyRequest): User | null {
    return (request as any).user || null;
  }

  /**
   * 创建权限检查中间件
   */
  createPermissionMiddleware(permission: string) {
    return async (request: FastifyRequest, reply: any) => {
      const user = this.extractUserFromRequest(request);
      
      if (!user) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }

      if (!this.hasPermission(user, permission)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: `Required permission: ${permission}`
        });
        return;
      }
    };
  }

  /**
   * 创建角色检查中间件
   */
  createRoleMiddleware(role: string) {
    return async (request: FastifyRequest, reply: any) => {
      const user = this.extractUserFromRequest(request);
      
      if (!user) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }

      if (!this.hasRole(user, role)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: `Required role: ${role}`
        });
        return;
      }
    };
  }

  /**
   * 获取用户列表（管理功能）
   */
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const user = this.users.get(username);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * 创建新用户
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: Date.now().toString(), // 简化的ID生成
      createdAt: new Date()
    };

    this.users.set(user.username, user);
    return this.sanitizeUser(user);
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(user.username, updatedUser);
    
    return this.sanitizeUser(updatedUser);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<boolean> {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    if (!user) {
      return false;
    }

    this.users.delete(user.username);
    return true;
  }

  // 私有方法

  /**
   * 验证用户凭据
   */
  private async validateCredentials(username: string, password: string): Promise<User | null> {
    const user = this.users.get(username);
    if (!user) {
      return null;
    }

    // 简化的密码验证（实际应用中应该使用哈希密码）
    const validPasswords: Record<string, string> = {
      'admin': 'admin123',
      'user': 'user123',
      'guest': 'guest123'
    };

    if (validPasswords[username] === password) {
      return user;
    }

    return null;
  }

  /**
   * 生成JWT令牌
   */
  private generateToken(user: User, rememberMe: boolean = false): string {
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    };

    const options: jwt.SignOptions = {
      algorithm: this.config.algorithms[0] as jwt.Algorithm,
      expiresIn: rememberMe ? '7d' : this.config.expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience
    };

    return jwt.sign(payload, this.config.secret, options);
  }

  /**
   * 生成刷新令牌
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      type: 'refresh'
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.refreshTokenExpiresIn || '30d'
    });
  }

  /**
   * 获取令牌过期时间（秒）
   */
  private getTokenExpirationTime(rememberMe: boolean): number {
    if (rememberMe) {
      return 7 * 24 * 60 * 60; // 7天
    }

    // 解析expiresIn字符串
    const expiresIn = this.config.expiresIn;
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      return 24 * 60 * 60; // 默认24小时
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      's': 1,
      'm': 60,
      'h': 60 * 60,
      'd': 24 * 60 * 60
    };

    return value * multipliers[unit];
  }

  /**
   * 清理用户信息（移除敏感数据）
   */
  private sanitizeUser(user: User): User {
    const { ...sanitized } = user;
    return sanitized;
  }

  /**
   * 生命周期方法：服务准备就绪
   */
  async onReady(): Promise<void> {
    console.log('🔐 AuthService: Authentication service ready');
    console.log(`👥 AuthService: ${this.users.size} users loaded`);
  }

  /**
   * 生命周期方法：服务关闭
   */
  async onClose(): Promise<void> {
    console.log('🔐 AuthService: Cleaning up authentication service...');
    
    // 清理刷新令牌
    this.refreshTokens.clear();
    
    console.log('✅ AuthService: Authentication service closed');
  }
}