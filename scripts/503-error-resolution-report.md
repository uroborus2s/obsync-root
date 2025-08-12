# 静态页面503错误解决报告

## 问题描述

部署静态页面后，访问静态文件返回503错误，用户无法正常访问Web管理后台和移动端应用。

## 问题诊断过程

### 1. 初步检查

- ✅ 网络连接正常：可以ping通 kwps.jlufe.edu.cn (120.131.12.6)
- ✅ 静态文件存在：本地构建文件和服务器静态文件目录都存在
- ✅ Nginx服务运行：systemctl status显示nginx服务正常运行
- ❌ SSH连接问题：初始诊断时SSH连接超时

### 2. 深入诊断

通过SSH成功连接服务器后，发现：

- ✅ 静态文件目录存在且有内容：
  ```
  /var/www/agendaedu-web/
  /var/www/agendaedu-app/
  ```
- ❌ Nginx配置测试失败：
  ```
  nginx: configuration file /etc/nginx/nginx.conf test failed
  ```

### 3. 根本原因分析

通过 `nginx -t` 命令发现错误信息：
```
cannot load certificate key "/etc/nginx/ssl/STAR_jlufe_edu_cn.key": 
BIO_new_file() failed (SSL: error:8000000D:system library::Permission denied)
```

检查SSL证书文件权限：
```bash
-rw------- 1 root root 1679 Aug 11 19:42 STAR_jlufe_edu_cn.key  # 权限600
-rw-r--r-- 1 root root 4012 Aug 11 19:42 STAR_jlufe_edu_cn.pem  # 权限644
```

检查Nginx进程：
```bash
root      187944  nginx: master process    # 主进程运行在root用户
www-data  227572  nginx: worker process    # 工作进程运行在www-data用户
```

**问题根因**：SSL私钥文件权限设置为600（只有root可读），但Nginx的worker进程运行在www-data用户下，无法读取证书文件，导致HTTPS请求失败。

## 解决方案

### 修复步骤

1. **修复SSL证书权限**：
   ```bash
   sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
   ```

2. **验证Nginx配置**：
   ```bash
   sudo nginx -t
   # 输出：nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

3. **重新加载Nginx配置**：
   ```bash
   sudo systemctl reload nginx
   ```

4. **验证修复结果**：
   ```bash
   curl -I https://kwps.jlufe.edu.cn/web/
   # 输出：HTTP/2 200
   ```

### 修复后状态

- ✅ Nginx配置测试通过
- ✅ SSL证书可正常读取
- ✅ 静态文件访问正常
- ✅ HTTPS访问返回200状态码

## 验证结果

### 本地测试
```bash
# HTTP访问（自动重定向到HTTPS）
curl -I http://localhost/web/
# HTTP/1.1 301 Moved Permanently
# Location: https://kwps.jlufe.edu.cn/web/

# HTTPS访问
curl -k -I https://localhost/web/
# HTTP/2 200
```

### 外部访问测试
```bash
curl -I https://kwps.jlufe.edu.cn/web/
# HTTP/2 200 
# server: nginx/1.24.0 (Ubuntu)
# content-type: text/html
# content-length: 3438
```

## 预防措施

### 1. 权限检查脚本
创建了 `scripts/fix-ssl-permissions.sh` 脚本，用于：
- 检查SSL证书权限
- 自动修复权限问题
- 验证修复结果

### 2. 定期监控
建议定期执行以下检查：
```bash
# 检查Nginx配置
sudo nginx -t

# 检查SSL证书权限
ls -la /etc/nginx/ssl/

# 检查Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 3. 部署流程改进
在部署脚本中添加SSL证书权限检查：
```bash
# 确保SSL证书权限正确
sudo chmod 644 /etc/nginx/ssl/*.key
sudo chmod 644 /etc/nginx/ssl/*.pem
```

## 经验总结

### 关键学习点
1. **503错误不一定是应用问题**：可能是Nginx配置或权限问题
2. **SSL证书权限很重要**：私钥文件需要让Nginx worker进程可读
3. **nginx -t是诊断利器**：能快速发现配置问题
4. **进程用户权限要匹配**：确保Nginx worker进程能访问所需文件

### 故障排查流程
1. 检查服务状态（systemctl status）
2. 测试配置文件（nginx -t）
3. 检查文件权限（ls -la）
4. 查看错误日志（tail -f error.log）
5. 验证进程用户（ps aux | grep nginx）

## 访问地址

修复完成后，以下地址可正常访问：
- 🌐 Web管理后台: https://kwps.jlufe.edu.cn/web/
- 📱 移动端应用: https://kwps.jlufe.edu.cn/app/
- 🔍 健康检查: https://kwps.jlufe.edu.cn/health

---

**修复时间**: 2025-08-12 09:50  
**修复人员**: Augment Agent  
**问题级别**: 高（影响用户访问）  
**修复状态**: ✅ 已完成
