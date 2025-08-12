# 部署文件夹说明

这个文件夹包含了服务器部署所需的核心文件，不包含文档和说明文件。

## 文件结构

```
deploy/
├── README.md                        # 本说明文件
├── .env.example                     # 环境变量配置示例
├── docker-compose.server-1.yml     # Server-1 Docker配置
├── docker-compose.server-2.yml     # Server-2 Docker配置
├── healthcheck.sh                   # 健康检查脚本
├── logrotate.conf                   # 日志轮转配置
└── nginx/
    ├── server-1-nginx.conf          # Server-1 Nginx配置
    ├── server-2-nginx.conf          # Server-2 Nginx配置
    ├── STAR_jlufe_edu_cn.pem        # SSL证书
    └── STAR_jlufe_edu_cn.key        # SSL私钥
```

## 部署说明

1. 将此文件夹复制到服务器的 `/opt/obsync/` 目录
2. 根据实际环境配置 `.env` 文件
3. 执行相应的 docker-compose 命令启动服务

## 注意事项

- SSL证书文件需要根据实际情况替换
- 环境变量需要根据实际环境配置
- 健康检查脚本权限需要设置为可执行
