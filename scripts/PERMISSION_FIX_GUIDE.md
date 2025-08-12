# 静态文件部署权限问题解决方案

## 问题描述

在执行 `deploy-static.sh` 脚本时遇到以下错误：

```
rsync: [generator] failed to set times on "/var/www/agendaedu-web/.": Operation not permitted (1)
rsync: [generator] recv_generator: mkdir "/var/www/agendaedu-web/assets" failed: Permission denied (13)
rsync: [receiver] mkstemp "/var/www/agendaedu-web/.index.html.SCOyC0" failed: Permission denied (13)
```

## 问题原因

1. **权限不足**：当前用户无法直接写入 `/var/www/agendaedu-web/` 目录
2. **目录所有者**：目录所有者应该是 `www-data:www-data`，但当前用户不是
3. **rsync直接写入**：rsync尝试直接写入受保护的目录

## 解决方案

### 方案一：使用修复后的部署脚本（推荐）

我已经修复了 `scripts/deploy-static.sh` 脚本，新的部署流程：

1. **先上传到临时目录**：避免权限问题
2. **通过sudo移动文件**：确保有足够权限
3. **设置正确权限**：自动设置 www-data 所有者

```bash
# 使用修复后的脚本
./scripts/deploy-static.sh
```

### 方案二：手动修复权限

如果需要手动修复权限，可以使用提供的修复脚本：

```bash
# 运行权限修复脚本
./scripts/fix-permissions.sh
```

### 方案三：手动操作步骤

如果需要手动执行，按以下步骤操作：

1. **修复服务器权限**：
   ```bash
   ssh ubutu@jlufe_10.128 "
       sudo mkdir -p /var/www/agendaedu-web
       sudo mkdir -p /var/www/agendaedu-app
       sudo chown -R www-data:www-data /var/www/agendaedu-web
       sudo chown -R www-data:www-data /var/www/agendaedu-app
       sudo chmod -R 755 /var/www/agendaedu-web
       sudo chmod -R 755 /var/www/agendaedu-app
   "
   ```

2. **使用临时目录部署**：
   ```bash
   # 上传到临时目录
   rsync -avz ./apps/agendaedu-web/dist/ ubutu@jlufe_10.128:/tmp/web-deploy/
   
   # 移动到目标目录
   ssh ubutu@jlufe_10.128 "
       sudo cp -r /tmp/web-deploy/* /var/www/agendaedu-web/
       sudo chown -R www-data:www-data /var/www/agendaedu-web
       rm -rf /tmp/web-deploy
   "
   ```

## 修复内容详解

### 1. 修改的部署策略

**原来的方式**（有问题）：
```bash
rsync -avz ./dist/ user@server:/var/www/agendaedu-web/
```

**新的方式**（已修复）：
```bash
# 1. 上传到临时目录
rsync -avz ./dist/ user@server:/tmp/temp-dir/

# 2. 通过sudo移动文件
ssh user@server "
    sudo cp -r /tmp/temp-dir/* /var/www/agendaedu-web/
    sudo chown -R www-data:www-data /var/www/agendaedu-web
    rm -rf /tmp/temp-dir
"
```

### 2. 权限设置

- **目录权限**：755 (rwxr-xr-x)
- **文件权限**：644 (rw-r--r--)
- **所有者**：www-data:www-data

### 3. 备份机制

修复后的脚本包含自动备份功能：
```bash
sudo cp -r /var/www/agendaedu-web /var/www/agendaedu-web.backup.$(date +%Y%m%d_%H%M%S)
```

## 验证修复

### 1. 检查目录权限
```bash
ssh ubutu@jlufe_10.128 "ls -la /var/www/"
```

应该看到：
```
drwxr-xr-x  www-data www-data  agendaedu-web
drwxr-xr-x  www-data www-data  agendaedu-app
```

### 2. 测试文件上传
```bash
# 创建测试文件
echo "test" > /tmp/test.txt

# 上传到临时目录
scp /tmp/test.txt ubutu@jlufe_10.128:/tmp/

# 移动到目标目录
ssh ubutu@jlufe_10.128 "sudo cp /tmp/test.txt /var/www/agendaedu-web/"
```

### 3. 验证Web访问
```bash
curl -I https://kwps.jlufe.edu.cn/web/
```

## 预防措施

### 1. 定期检查权限
```bash
# 添加到crontab中定期检查
0 2 * * * /usr/bin/find /var/www -type d -exec chmod 755 {} \;
0 2 * * * /usr/bin/find /var/www -type f -exec chmod 644 {} \;
0 2 * * * /usr/bin/chown -R www-data:www-data /var/www
```

### 2. 使用正确的部署流程
- 始终先上传到临时目录
- 通过sudo移动文件
- 设置正确的权限

### 3. 监控部署日志
- 检查rsync返回码
- 验证文件完整性
- 确认权限设置

## 常见问题

### Q: 为什么不能直接给用户写入权限？
A: 出于安全考虑，Web目录应该由www-data用户拥有，普通用户不应该有直接写入权限。

### Q: 临时目录方式会影响性能吗？
A: 影响很小，因为临时目录通常在内存中，而且文件移动操作很快。

### Q: 如何回滚到之前的版本？
A: 使用自动创建的备份：
```bash
ssh ubutu@jlufe_10.128 "
    sudo rm -rf /var/www/agendaedu-web/*
    sudo cp -r /var/www/agendaedu-web.backup.YYYYMMDD_HHMMSS/* /var/www/agendaedu-web/
"
```

## 总结

通过修改部署策略，使用临时目录作为中转，可以完美解决权限问题。修复后的脚本更加安全、可靠，并且包含了完整的备份和验证机制。

**推荐使用修复后的 `scripts/deploy-static.sh` 脚本进行部署。**
