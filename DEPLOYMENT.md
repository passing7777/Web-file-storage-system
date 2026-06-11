# Web文件存储系统 - 完整部署指南

> 本文档详细阐述将本地开发环境中的项目部署到远程服务器的完整流程与操作指南。

---

## 📋 目录

1. [部署概述](#部署概述)
2. [服务器环境搭建](#服务器环境搭建)
3. [项目代码传输](#项目代码传输)
4. [项目依赖安装与启动](#项目依赖安装与启动)
5. [部署常见问题排查](#部署常见问题排查)
6. [安全策略建议](#安全策略建议)
7. [不同项目类型部署差异](#不同项目类型部署差异)
8. [生产环境优化建议](#生产环境优化建议)

---

## 一、部署概述

### 1.1 部署方式选择

本项目支持两种部署方式：

| 部署方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| **Docker容器化部署** | 生产环境、团队协作 | 环境一致性、快速部署、易于扩展 | 需要Docker知识、资源开销略大 |
| **传统部署** | 开发环境、简单场景 | 资源占用小、调试方便 | 环境配置复杂、依赖冲突风险 |

**推荐：生产环境使用Docker容器化部署**

### 1.2 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户请求                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Nginx (443端口)                       │
│              HTTPS终止 + 反向代理                        │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Frontend    │ │   Backend    │ │    MinIO     │
│  (Vue.js)    │ │  (NestJS)    │ │  (对象存储)   │
│   80端口     │ │   3001端口   │ │  9000端口    │
└──────────────┘ └──────┬───────┘ └──────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │  PostgreSQL  │
                 │   (数据库)    │
                 │   5432端口   │
                 └──────────────┘
```

---

## 二、服务器环境搭建

### 2.1 服务器要求

#### 硬件要求

| 配置项 | 最低要求 | 推荐配置 | 说明 |
|--------|---------|---------|------|
| CPU | 1核 | 2核+ | 支持多用户并发 |
| 内存 | 1GB | 2GB+ | PostgreSQL + MinIO需要较多内存 |
| 磁盘 | 20GB | 100GB+ | 根据文件存储需求调整 |
| 带宽 | 1Mbps | 10Mbps+ | 影响文件上传下载速度 |

#### 软件要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| 操作系统 | Ubuntu 24.04 LTS | 推荐64位系统 |
| Docker | 20.10+ | 容器运行环境 |
| Docker Compose | 2.0+ | 容器编排工具 |
| Git | 2.0+ | 代码版本管理 |

### 2.2 服务器环境搭建步骤

#### 步骤1：连接服务器

```bash
# 使用SSH连接服务器（替换为您的服务器IP）
ssh root@your-server-ip

# 或使用密钥连接
ssh -i ~/.ssh/your-key.pem root@your-server-ip
```

#### 步骤2：系统更新

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y

# 安装常用工具
sudo apt install -y curl wget git vim htop net-tools
```

#### 步骤3：安装Docker

```bash
# 安装Docker依赖
sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置Docker稳定版仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证Docker安装
docker --version
docker compose version

# 将当前用户添加到docker组（可选，避免每次使用sudo）
sudo usermod -aG docker $USER
```

#### 步骤4：配置防火墙

```bash
# 安装UFW防火墙
sudo apt install -y ufw

# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 开放必要端口
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status verbose
```

#### 步骤5：配置系统参数（可选）

```bash
# 编辑系统参数配置文件
sudo vim /etc/sysctl.conf

# 添加或修改以下参数
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10

# 应用配置
sudo sysctl -p
```

### 2.3 本地环境一致性配置

#### Docker环境一致性

```bash
# 本地开发环境
# 确保本地Docker版本与服务器一致
docker --version

# 使用相同的docker-compose.yml配置
# 避免硬编码配置，使用环境变量
```

#### 环境变量管理

```bash
# 本地开发环境
# .env.development
DATABASE_URL="postgresql://postgres:password@localhost:5432/file_storage_dev"
JWT_SECRET="dev-secret-key"
MINIO_ENDPOINT="localhost"

# 生产环境
# .env.production
DATABASE_URL="postgresql://postgres:strong-password@postgres:5432/file_storage"
JWT_SECRET="production-secret-key-change-this"
MINIO_ENDPOINT="minio"
```

---

## 三、项目代码传输

### 3.1 传输方式选择

| 传输方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| **Git克隆** | 推荐方式 | 版本控制、易于更新 | 需要Git仓库 |
| **SCP传输** | 小型项目 | 简单直接 | 不支持增量更新 |
| **Rsync同步** | 大型项目 | 增量同步、断点续传 | 需要配置rsync |
| **Docker镜像** | 容器化项目 | 环境完全一致 | 需要镜像仓库 |

### 3.2 Git克隆方式（推荐）

#### 方式1：从Git仓库克隆

```bash
# 在服务器上执行
cd /opt

# 克隆项目代码
git clone https://github.com/your-username/web-file-storage-system.git

# 或使用SSH方式（需配置SSH密钥）
git clone git@github.com:your-username/web-file-storage-system.git

# 进入项目目录
cd web-file-storage-system
```

#### 方式2：从本地推送到服务器

```bash
# 在本地开发机器上执行

# 方式A：使用Git推送
# 1. 先将代码推送到Git仓库
git add .
git commit -m "Prepare for deployment"
git push origin main

# 2. 然后在服务器上拉取
ssh root@your-server-ip
cd /opt/web-file-storage-system
git pull origin main

# 方式B：使用Git直接推送到服务器（需配置）
# 在服务器上创建裸仓库
git init --bare /opt/web-file-storage-system.git

# 在本地添加远程仓库
git remote add server ssh://root@your-server-ip/opt/web-file-storage-system.git

# 推送到服务器
git push server main

# 在服务器上检出代码
ssh root@your-server-ip
git clone /opt/web-file-storage-system.git /opt/web-file-storage-system
```

### 3.3 SCP传输方式

```bash
# 在本地开发机器上执行

# 传输整个项目目录
scp -r /path/to/web-file-storage-system root@your-server-ip:/opt/

# 或传输压缩包
tar -czf project.tar.gz web-file-storage-system
scp project.tar.gz root@your-server-ip:/opt/

# 在服务器上解压
ssh root@your-server-ip
cd /opt
tar -xzf project.tar.gz
```

### 3.4 Rsync同步方式（推荐用于大文件）

```bash
# 在本地开发机器上执行

# 同步项目文件（增量同步）
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'coverage' \
  /path/to/web-file-storage-system/ \
  root@your-server-ip:/opt/web-file-storage-system/

# 参数说明：
# -a: 归档模式，保留权限、时间戳等
# -v: 显示详细信息
# -z: 压缩传输
# --progress: 显示传输进度
# --exclude: 排除不需要传输的文件
```

### 3.5 Docker镜像传输方式

```bash
# 方式1：使用Docker Hub

# 在本地构建并推送镜像
docker build -t your-username/web-file-storage:latest ./backend
docker push your-username/web-file-storage:latest

# 在服务器上拉取镜像
ssh root@your-server-ip
docker pull your-username/web-file-storage:latest

# 方式2：直接传输镜像文件

# 在本地导出镜像
docker save -o backend-image.tar your-username/web-file-storage:latest

# 传输到服务器
scp backend-image.tar root@your-server-ip:/tmp/

# 在服务器上导入镜像
ssh root@your-server-ip
docker load -i /tmp/backend-image.tar
```

---

## 四、项目依赖安装与启动

### 4.1 Docker容器化部署（推荐）

#### 步骤1：配置环境变量

```bash
# 在服务器上执行
cd /opt/web-file-storage-system

# 复制环境变量模板
cp .env.example .env

# 编辑环境变量配置
vim .env
```

**修改以下关键配置：**

```bash
# PostgreSQL配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-strong-password-here  # 修改为强密码
POSTGRES_DB=file_storage

# MinIO配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-minio-password-here  # 修改为强密码

# JWT配置
JWT_SECRET=your-jwt-secret-key-change-this  # 修改为随机字符串
JWT_EXPIRES_IN=24h

# CORS配置
CORS_ORIGIN=https://your-domain.com  # 修改为您的域名

# 文件配置
FILE_MAX_SIZE=524288000
USER_STORAGE_LIMIT=5368709120
```

#### 步骤2：配置SSL证书

**方式A：使用Let's Encrypt（推荐）**

```bash
# 安装Certbot
sudo apt install -y certbot

# 申请SSL证书（先停止Nginx）
docker-compose stop nginx

# 申请证书（替换为您的域名）
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 设置证书权限
sudo chown -R $USER:$USER nginx/ssl/
chmod 600 nginx/ssl/*.pem
```

**方式B：使用自签名证书（仅用于测试）**

```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# 设置权限
chmod 600 nginx/ssl/*.pem
```

**配置证书自动续期：**

```bash
# 添加Cron任务
sudo crontab -e

# 添加以下行（每月1号凌晨2点续期）
0 2 1 * * certbot renew --quiet --post-hook "docker-compose restart nginx"
```

#### 步骤3：构建并启动服务

```bash
# 构建Docker镜像
docker-compose build

# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 步骤4：验证服务

```bash
# 检查服务健康状态
curl http://localhost:3001/api/v1/health

# 检查MinIO健康状态
curl http://localhost:9000/minio/health/live

# 检查PostgreSQL连接
docker exec -it file-storage-postgres psql -U postgres -d file_storage -c "SELECT version();"

# 检查所有容器状态
docker ps -a
```

#### 步骤5：配置域名解析

```bash
# 在域名服务商控制台添加A记录
# 主机记录: @
# 记录类型: A
# 记录值: your-server-ip

# 主机记录: www
# 记录类型: A
# 记录值: your-server-ip

# 验证DNS解析
nslookup your-domain.com
dig your-domain.com
```

### 4.2 传统部署方式（不推荐用于生产环境）

#### 步骤1：安装Node.js

```bash
# 安装Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version

# 安装PM2进程管理器
sudo npm install -g pm2
```

#### 步骤2：安装PostgreSQL

```bash
# 添加PostgreSQL官方仓库
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 导入GPG密钥
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# 安装PostgreSQL 17
sudo apt update
sudo apt install -y postgresql-17

# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE file_storage;
CREATE USER postgres WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE file_storage TO postgres;
\q
```

#### 步骤3：安装MinIO

```bash
# 下载MinIO服务器
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# 创建MinIO数据目录
sudo mkdir -p /data/minio
sudo chown -R $USER:$USER /data/minio

# 创建MinIO服务文件
sudo vim /etc/systemd/system/minio.service
```

**MinIO服务配置：**

```ini
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
Type=simple
User=root
Environment="MINIO_ROOT_USER=minioadmin"
Environment="MINIO_ROOT_PASSWORD=your-minio-password"
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# 启动MinIO服务
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio
```

#### 步骤4：部署后端应用

```bash
# 进入后端目录
cd /opt/web-file-storage-system/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
vim .env  # 修改配置

# 生成Prisma Client
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 构建生产版本
npm run build

# 使用PM2启动应用
pm2 start dist/main.js --name "file-storage-backend"

# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs file-storage-backend

# 设置开机自启
pm2 startup
pm2 save
```

#### 步骤5：部署前端应用

```bash
# 进入前端目录
cd /opt/web-file-storage-system/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 将构建产物复制到Nginx目录
sudo mkdir -p /var/www/file-storage
sudo cp -r dist/* /var/www/file-storage/
```

#### 步骤6：配置Nginx

```bash
# 安装Nginx
sudo apt install -y nginx

# 创建Nginx配置文件
sudo vim /etc/nginx/sites-available/file-storage
```

**Nginx配置：**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 500M;

    # 前端静态文件
    location / {
        root /var/www/file-storage;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点配置
sudo ln -s /etc/nginx/sites-available/file-storage /etc/nginx/sites-enabled/

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 五、部署常见问题排查

### 5.1 Docker相关问题

#### 问题1：容器无法启动

```bash
# 查看容器日志
docker-compose logs backend

# 常见原因：
# 1. 环境变量配置错误
# 2. 端口冲突
# 3. 依赖服务未就绪

# 解决方案：
# 检查环境变量
cat .env

# 检查端口占用
sudo netstat -tlnp | grep :3001

# 重启单个服务
docker-compose restart backend
```

#### 问题2：数据库连接失败

```bash
# 检查PostgreSQL容器状态
docker-compose ps postgres

# 检查PostgreSQL日志
docker-compose logs postgres

# 进入PostgreSQL容器
docker exec -it file-storage-postgres bash

# 测试数据库连接
psql -U postgres -d file_storage

# 常见原因：
# 1. 数据库密码错误
# 2. 数据库未创建
# 3. 网络连接问题

# 解决方案：
# 重新配置DATABASE_URL
vim .env
docker-compose restart backend
```

#### 问题3：MinIO连接失败

```bash
# 检查MinIO容器状态
docker-compose ps minio

# 检查MinIO日志
docker-compose logs minio

# 测试MinIO连接
curl http://localhost:9000/minio/health/live

# 常见原因：
# 1. MinIO密钥错误
# 2. Bucket未创建
# 3. 权限问题

# 解决方案：
# 检查MinIO配置
vim .env
docker-compose restart minio backend
```

### 5.2 网络相关问题

#### 问题1：无法访问服务

```bash
# 检查防火墙状态
sudo ufw status

# 开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 检查端口监听
sudo netstat -tlnp

# 检查Nginx配置
sudo nginx -t

# 检查SELinux（如果启用）
sudo setenforce 0  # 临时关闭
```

#### 问题2：域名无法解析

```bash
# 检查DNS解析
nslookup your-domain.com
dig your-domain.com

# 检查本地hosts文件
cat /etc/hosts

# 测试直接IP访问
curl http://your-server-ip
```

#### 问题3：SSL证书问题

```bash
# 检查证书文件
ls -la nginx/ssl/

# 检查证书有效期
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# 测试SSL连接
openssl s_client -connect your-domain.com:443

# 续期证书
sudo certbot renew
docker-compose restart nginx
```

### 5.3 性能相关问题

#### 问题1：内存不足

```bash
# 查看内存使用
free -h
docker stats

# 解决方案：
# 1. 增加Swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. 限制Docker容器内存
# 编辑docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

#### 问题2：磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理Docker未使用资源
docker system prune -a

# 清理旧备份文件
find /backup -type f -mtime +30 -delete

# 查看大文件
du -sh /* | sort -rh | head -10
```

### 5.4 应用相关问题

#### 问题1：文件上传失败

```bash
# 检查Nginx配置
grep client_max_body_size /etc/nginx/nginx.conf

# 检查后端配置
grep FILE_MAX_SIZE .env

# 检查存储空间
df -h /data

# 检查MinIO存储
docker exec -it file-storage-minio ls -la /data
```

#### 问题2：JWT认证失败

```bash
# 检查JWT配置
grep JWT_SECRET .env

# 检查系统时间
date

# 同步系统时间
sudo timedatectl set-ntp true

# 重启后端服务
docker-compose restart backend
```

---

## 六、安全策略建议

### 6.1 服务器安全

#### 系统安全

```bash
# 1. 更新系统补丁
sudo apt update && sudo apt upgrade -y

# 2. 禁用root SSH登录
sudo vim /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no

# 3. 配置SSH密钥登录
ssh-keygen -t rsa -b 4096
ssh-copy-id user@your-server-ip

# 4. 安装Fail2Ban防暴力破解
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 5. 配置自动安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### 防火墙安全

```bash
# 配置UFW防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 仅开放必要端口
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# 限制SSH访问频率
sudo ufw limit 22/tcp

# 启用防火墙
sudo ufw enable
```

### 6.2 应用安全

#### 密码安全

```bash
# 生成强密码（32位随机字符串）
openssl rand -base64 32

# 修改默认密码
vim .env
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
```

#### 数据库安全

```bash
# 1. 使用强密码
# 2. 限制远程访问
# 3. 定期备份
# 4. 使用SSL连接

# PostgreSQL配置
sudo vim /etc/postgresql/17/main/postgresql.conf
listen_addresses = 'localhost'  # 仅本地访问

# 重启PostgreSQL
sudo systemctl restart postgresql
```

#### 文件上传安全

```bash
# 1. 限制文件类型（已在代码中实现）
# 2. 限制文件大小
# 3. 文件名消毒
# 4. 病毒扫描（可选）

# 配置文件大小限制
vim .env
FILE_MAX_SIZE=524288000  # 500MB
```

### 6.3 网络安全

#### HTTPS配置

```nginx
# Nginx SSL配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
add_header Strict-Transport-Security "max-age=31572000; includeSubDomains" always;
```

#### 安全响应头

```nginx
# 添加安全响应头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

### 6.4 数据安全

#### 定期备份

```bash
# 配置自动备份Cron任务
sudo crontab -e

# 每天凌晨2点备份数据库
0 2 * * * docker exec file-storage-postgres /backup/backup-postgres.sh

# 每天凌晨3点备份MinIO
0 3 * * * docker exec file-storage-minio /backup/backup-minio.sh

# 每周日凌晨4点清理旧备份
0 4 * * 0 find /backup -type f -mtime +7 -delete
```

#### 数据加密

```bash
# 1. 传输加密：使用HTTPS
# 2. 存储加密：使用加密文件系统（可选）
# 3. 密码加密：使用bcrypt（已实现）
```

---

## 七、不同项目类型部署差异

### 7.1 静态网页部署

#### 特点

- 无需后端服务器
- 无需数据库
- 部署简单、成本低
- 适合展示型网站、博客、文档站点

#### 部署方式

**方式1：Nginx静态托管**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

**方式2：对象存储 + CDN**

```bash
# 上传静态文件到对象存储（如阿里云OSS、腾讯云COS）
# 配置CDN加速
# 绑定自定义域名
```

**方式3：GitHub Pages / Vercel / Netlify**

```bash
# 推送代码到GitHub
git push origin main

# 在GitHub Pages设置中启用静态站点
# 或使用Vercel/Netlify自动部署
```

#### 适用场景

- 个人博客、作品集
- 产品展示页面
- 技术文档站点
- 单页应用（SPA）前端

---

### 7.2 动态Web应用部署

#### 特点

- 需要后端服务器运行时
- 需要数据库存储数据
- 部署相对复杂
- 适合交互型应用、管理系统

#### 部署方式

**方式1：传统部署（PM2 + Nginx）**

```bash
# 后端：使用PM2管理Node.js进程
pm2 start app.js --name "my-app"

# 前端：构建静态文件，Nginx托管
npm run build
# 将dist目录部署到Nginx

# 数据库：独立安装PostgreSQL/MySQL
```

**方式2：应用服务器部署**

```bash
# Java应用：Tomcat / Spring Boot
# Python应用：Gunicorn / uWSGI
# PHP应用：PHP-FPM

# 示例：Python Flask应用
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

**方式3：云平台部署（PaaS）**

```bash
# Heroku / Railway / Render
# 直接推送代码，平台自动构建部署

# 示例：Heroku部署
heroku create my-app
git push heroku main
```

#### 适用场景

- 内容管理系统（CMS）
- 电子商务平台
- 社交网络应用
- 企业管理系统

---

### 7.3 容器化应用部署

#### 特点

- 环境完全一致
- 部署简单快速
- 易于扩展迁移
- 适合微服务架构

#### 部署方式

**方式1：Docker Compose（单机部署）**

```bash
# 编排多个容器
docker-compose up -d

# 适合小型项目、开发环境
```

**方式2：Docker Swarm（集群部署）**

```bash
# 初始化Swarm集群
docker swarm init

# 部署服务栈
docker stack deploy -c docker-compose.yml my-stack

# 适合中型项目、高可用需求
```

**方式3：Kubernetes（大规模集群）**

```bash
# 编写Kubernetes配置文件
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# 适合大型项目、企业级应用
```

#### 适用场景

- 微服务架构应用
- 需要快速扩展的应用
- 多环境一致性要求
- CI/CD自动化部署

---

### 7.4 部署方式对比总结

| 项目类型 | 部署复杂度 | 运维成本 | 扩展性 | 适用场景 |
|---------|-----------|---------|--------|---------|
| 静态网页 | ⭐ | 低 | 高 | 展示型网站、文档站点 |
| 动态Web应用 | ⭐⭐⭐ | 中 | 中 | 交互型应用、管理系统 |
| 容器化应用 | ⭐⭐ | 中 | 高 | 微服务、企业级应用 |

---

## 八、生产环境优化建议

### 8.1 性能优化

#### Nginx优化

```nginx
# nginx.conf配置优化
worker_processes auto;
worker_connections 2048;

# 启用Gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1k;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;

# 连接优化
keepalive_timeout 65;
client_body_buffer_size 128k;
```

#### 数据库优化

```sql
-- PostgreSQL配置优化
-- 编辑postgresql.conf

-- 连接池
max_connections = 200

-- 内存配置
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB

-- 查询优化
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### 应用优化

```bash
# Node.js优化
# 1. 启用集群模式
pm2 start app.js -i max

# 2. 内存限制
pm2 start app.js --max-memory-restart 500M

# 3. 日志管理
pm2 install pm2-logrotate
```

### 8.2 监控告警

#### 日志监控

```bash
# 安装ELK Stack（可选）
# Elasticsearch + Logstash + Kibana

# 或使用轻量级方案
# Docker日志收集
docker logs -f container-name

# Nginx访问日志分析
goaccess /var/log/nginx/access.log -o report.html
```

#### 性能监控

```bash
# 安装Prometheus + Grafana（推荐）

# 或使用云监控服务
# 阿里云监控、腾讯云监控、AWS CloudWatch
```

#### 告警配置

```bash
# 配置告警规则
# 1. CPU使用率 > 80%
# 2. 内存使用率 > 85%
# 3. 磁盘使用率 > 90%
# 4. 服务不可用

# 告警通知方式
# 邮件、短信、钉钉、企业微信
```

### 8.3 自动化运维

#### CI/CD配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/web-file-storage-system
            git pull origin main
            docker-compose build
            docker-compose up -d
```

#### 自动化备份

```bash
# 备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec file-storage-postgres pg_dump -U postgres file_storage | gzip > /backup/db_$DATE.sql.gz
find /backup -name "db_*.sql.gz" -mtime +7 -delete
```

---

## 九、总结

### 9.1 部署流程总结

```
1. 服务器环境搭建
   └─ 安装Docker、配置防火墙、系统优化

2. 项目代码传输
   └─ Git克隆 / SCP传输 / Rsync同步

3. 环境配置
   └─ 配置环境变量、SSL证书、域名解析

4. 服务启动
   └─ Docker Compose启动、健康检查

5. 验证测试
   └─ 功能测试、性能测试、安全测试

6. 监控运维
   └─ 日志监控、性能监控、告警配置
```

### 9.2 最佳实践建议

1. **使用Docker容器化部署**：确保环境一致性
2. **配置HTTPS安全访问**：保护数据传输安全
3. **定期备份数据**：防止数据丢失
4. **监控服务状态**：及时发现并解决问题
5. **自动化部署流程**：提高部署效率
6. **文档化运维流程**：便于团队协作

### 9.3 常用命令速查

```bash
# Docker相关
docker-compose up -d              # 启动服务
docker-compose down              # 停止服务
docker-compose logs -f           # 查看日志
docker-compose restart backend   # 重启服务
docker ps -a                     # 查看容器

# 系统相关
sudo ufw status                  # 查看防火墙
sudo systemctl status nginx      # 查看服务状态
df -h                            # 查看磁盘空间
free -h                          # 查看内存使用

# 日志相关
tail -f /var/log/nginx/access.log  # Nginx访问日志
docker logs -f container-name      # Docker容器日志
pm2 logs app-name                  # PM2应用日志
```

---

**部署指南文档完成！** 🎉

如有疑问或需要进一步帮助，请参考项目README.md或联系技术支持。