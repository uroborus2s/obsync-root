# 临时取消限流的nginx配置补丁
# 用于验证限流是503错误的根本原因

# 备份原始限流配置（注释掉）
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
# limit_req_zone $binary_remote_addr zone=static_limit:10m rate=500r/s;
# limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/s;

# 创建宽松的限流配置用于测试
limit_req_zone $binary_remote_addr zone=test_limit:10m rate=1000r/s;

# 在location块中使用：
# location /api/ {
#     limit_req zone=test_limit burst=2000 nodelay;
#     ...
# }

echo "========================================="
echo "临时解决503错误的步骤："
echo "========================================="
echo "1. SSH到生产服务器"
echo "2. 备份当前nginx配置："
echo "   sudo cp /etc/nginx/sites-enabled/kwps.jlufe.edu.cn /tmp/kwps.backup"
echo ""
echo "3. 临时修改限流配置，将API限流提高到1000r/s："
echo "   sudo nano /etc/nginx/sites-enabled/kwps.jlufe.edu.cn"
echo "   找到 'limit_req_zone.*api_limit' 行"
echo "   改为：limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=1000r/s;"
echo ""
echo "4. 测试配置："
echo "   sudo nginx -t"
echo ""
echo "5. 如果测试通过，重新加载："
echo "   sudo systemctl reload nginx"
echo ""
echo "6. 重新运行压测验证"
echo "========================================"