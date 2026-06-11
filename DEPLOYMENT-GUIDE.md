# Web文件存储系统 - 实战部署指南

> 本指南基于当前项目实际情况，提供详细的部署操作步骤。

---

## 📋 目录

1. [部署前准备](#部署前准备)
2. [Docker容器化部署](#docker容器化部署)
3. [主流部署方式对比](#主流部署方式对比)
4. [部署后验证](#部署后验证)
5. [运维管理](#运维管理)

---

## 一、部署前准备

### 1.1 服务器信息确认

**请确认以下服务器信息：**

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务器IP | `your-server-ip` | 替换为实际IP地址 |
| SSH端口 | `22` | 默认SSH端口 |
| 用户名 | `root` | 或其他有sudo权限的用户 |
| 操作系统 | `Ubuntu 24.04 LTS` | 推荐64位系统 |
| 域名 | `your-domain.com` | 如有域名请替换 |

### 1.2 本地项目文件确认

**当前项目结构：**

```
web1/
├── backend/                 # NestJS后端
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── src/
│   ├── Dockerfile          # 后端Docker配置
│   ├── package.json
│   └── .env.example
├── frontend/                # Vue3前端
│   ├── src/
│   ├── Dockerfile          # 前端Docker配置
│   ├── package.json
│   └── vite.config.ts
├── nginx/                   # Nginx配置
│   └── nginx.conf
├── scripts/                 # 备份脚本
│   ├── backup-postgres.sh
│   └── backup-minio.sh
├── docker-compose.yml       # Docker编排配置
├── .env.example            # 环境变量模板
├── README.md               # 项目文档
└── DEPLOYMENT.md           # 部署指南
```

### 1.3 本地环境检查

**在本地开发机器上执行：**

```bash
# 检查Docker是否安装
docker --version
# 期望输出：Docker version 20.10+ 或更高

# 检查Docker Compose是否安装
docker compose version
# 期望输出：Docker Compose version 2.0+ 或更高

# 检查Git是否安装
git --version

# 检查项目文件完整性
ls -la
```

---

## 二、Docker容器化部署（推荐）

### 2.1 方式一：Git仓库部署（推荐）

#### 步骤1：将项目推送到Git仓库

**在本地开发机器上执行：**

```bash
# 进入项目目录
cd D:\storage\Work_Files\华为项目\web1

# 初始化Git仓库（如果还没有）
git init

# 添加.gitignore文件
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
.DS_Store
Thumbs.db
coverage/
*.tsbuildinfo
backup/
nginx/ssl/*.pem
EOF

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: Web file storage system"

# 添加远程仓库（替换为您的Git仓库地址）
git remote add origin https://github.com/your-username/web-file-storage.git

# 推送到远程仓库
git push -u origin main
```

#### 步骤2：连接服务器并安装Docker

**SSH连接服务器：**

```bash
# 连接服务器（替换为您的服务器IP）
ssh root@your-server-ip

# 或使用密钥连接
ssh -i ~/.ssh/your-key.pem root@your-server-ip
```

**安装Docker：**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker依赖
sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release curl

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置Docker仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version

# 将当前用户添加到docker组（可选）
sudo usermod -aG docker $USER
```

#### 步骤3：克隆项目代码

```bash
# 创建项目目录
sudo mkdir -p /opt/webapps
cd /opt/webapps

# 克隆项目代码（替换为您的Git仓库地址）
git clone https://github.com/your-username/web-file-storage.git

# 进入项目目录
cd web-file-storage

# 查看项目文件
ls -la
```

#### 步骤4：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量配置
vim .env
```

**修改以下配置（按`i`进入编辑模式，修改后按`ESC`然后输入`:wq`保存）：**

```bash
# PostgreSQL配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrongPassword123!  # 修改为强密码
POSTGRES_DB=file_storage

# MinIO配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=YourMinIOPassword123!  # 修改为强密码

# JWT配置
JWT_SECRET=YourJWTSecretKeyChangeThisToRandomString123!  # 修改为随机字符串
JWT_EXPIRES_IN=24h

# CORS配置
CORS_ORIGIN=https://your-domain.com  # 修改为您的域名或http://your-server-ip

# 文件配置
FILE_MAX_SIZE=524288000
USER_STORAGE_LIMIT=5368709120
```

**生成强密码的方法：**

```bash
# 生成32位随机密码
openssl rand -base64 32

# 生成64位JWT密钥
openssl rand -base64 64
```

#### 步骤5：配置SSL证书

**方式A：使用Let's Encrypt免费证书（推荐）**

```bash
# 安装Certbot
sudo apt install -y certbot

# 创建SSL证书目录
mkdir -p nginx/ssl

# 临时停止可能占用80端口的服务
docker compose down 2>/dev/null || true

# 申请SSL证书（替换为您的域名）
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 设置证书权限
sudo chown -R $USER:$USER nginx/ssl/
chmod 600 nginx/ssl/*.pem

# 配置证书自动续期
sudo crontab -e
# 添加以下行（每月1号凌晨2点续期）
0 2 1 * * certbot renew --quiet --post-hook "cd /opt/webapps/web-file-storage && docker compose restart nginx"
```

**方式B：使用自签名证书（仅用于测试）**

```bash
# 创建SSL证书目录
mkdir -p nginx/ssl

# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# 设置权限
chmod 600 nginx/ssl/*.pem
```

#### 步骤6：启动Docker服务

```bash
# 构建Docker镜像
docker compose build

# 启动所有服务（后台运行）
docker compose up -d

# 查看服务状态
docker compose ps

# 期望输出：
# NAME                    STATUS    PORTS
# file-storage-backend    running   0.0.0.0:3001->3001/tcp
# file-storage-frontend   running   0.0.0.0:80->80/tcp
# file-storage-minio      running   0.0.0.0:9000-9001->9000-9001/tcp
# file-storage-nginx      running   0.0.0.0:443->443/tcp
# file-storage-postgres   running   0.0.0.0:5432->5432/tcp

# 查看服务日志
docker compose logs -f

# 按Ctrl+C退出日志查看
```

#### 步骤7：验证服务运行

```bash
# 检查后端健康状态
curl http://localhost:3001/api/v1/health
# 期望输出：{"status":"ok","timestamp":"...","version":"1.0.0"}

# 检查MinIO健康状态
curl http://localhost:9000/minio/health/live

# 检查PostgreSQL连接
docker exec -it file-storage-postgres psql -U postgres -d file_storage -c "SELECT version();"

# 检查所有容器状态
docker ps -a

# 查看容器资源使用
docker stats
```

#### 步骤8：配置防火墙

```bash
# 安装UFW防火墙
sudo apt install -y ufw

# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status verbose
```

#### 步骤9：配置域名解析

**在域名服务商控制台添加DNS记录：**

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | your-server-ip | 600 |
| A | www | your-server-ip | 600 |

**验证DNS解析：**

```bash
# 验证域名解析
nslookup your-domain.com
dig your-domain.com

# 测试域名访问
curl https://your-domain.com
```

---

### 2.2 方式二：SCP直接传输部署

#### 步骤1：打包项目文件

**在本地开发机器上执行：**

```bash
# 进入项目目录
cd D:\storage\Work_Files\华为项目\web1

# 删除不需要的文件
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf backend/dist frontend/dist
rm -rf .git

# 打包项目文件
tar -czf web-file-storage.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.log' \
  .

# 查看打包文件大小
ls -lh web-file-storage.tar.gz
```

#### 步骤2：传输文件到服务器

```bash
# 传输压缩包到服务器
scp web-file-storage.tar.gz root@your-server-ip:/tmp/

# 或使用WinSCP、FileZilla等工具传输
```

#### 步骤3：在服务器上解压并部署

**SSH连接服务器：**

```bash
ssh root@your-server-ip
```

**解压并部署：**

```bash
# 创建项目目录
sudo mkdir -p /opt/webapps/web-file-storage

# 解压项目文件
cd /opt/webapps/web-file-storage
tar -xzf /tmp/web-file-storage.tar.gz

# 删除压缩包
rm /tmp/web-file-storage.tar.gz

# 按照方式一的步骤4-9继续操作
# 配置环境变量 -> 配置SSL证书 -> 启动服务 -> 验证 -> 配置防火墙
```

---

### 2.3 方式三：Rsync增量同步部署

**适用于频繁更新的项目**

#### 步骤1：首次同步

**在本地开发机器上执行：**

```bash
# 同步项目文件到服务器
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'coverage' \
  --exclude '*.log' \
  --exclude '.env' \
  -e ssh \
  D:/storage/Work_Files/华为项目/web1/ \
  root@your-server-ip:/opt/webapps/web-file-storage/
```

#### 步骤2：后续增量同步

```bash
# 增量同步（仅传输修改的文件）
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  -e ssh \
  D:/storage/Work_Files/华为项目/web1/ \
  root@your-server-ip:/opt/webapps/web-file-storage/

# 参数说明：
# --delete: 删除服务器上本地已删除的文件
# -a: 归档模式，保留权限和时间戳
# -v: 显示详细信息
# -z: 压缩传输
```

---

## 三、主流部署方式对比

### 3.1 部署方式对比表

| 部署方式 | 复杂度 | 环境一致性 | 扩展性 | 适用场景 | 推荐度 |
|---------|--------|-----------|--------|---------|--------|
| **Docker Compose** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 单服务器生产环境 | ⭐⭐⭐⭐⭐ |
| **Docker Swarm** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 多服务器集群 | ⭐⭐⭐⭐ |
| **Kubernetes** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 大规模企业级应用 | ⭐⭐⭐ |
| **传统部署** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 开发测试环境 | ⭐⭐ |
| **云平台PaaS** | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 快速原型开发 | ⭐⭐⭐ |

### 3.2 Docker Compose部署（当前项目采用）

**优势：**
- ✅ 环境完全一致，避免"在我机器上能运行"问题
- ✅ 一键部署，操作简单
- ✅ 服务隔离，互不影响
- ✅ 易于扩展和迁移
- ✅ 支持服务编排和依赖管理

**劣势：**
- ❌ 需要Docker知识
- ❌ 资源开销略大（每个容器独立运行时）
- ❌ 调试相对复杂

**适用场景：**
- 单服务器生产环境
- 开发环境快速搭建
- CI/CD自动化部署
- 微服务架构应用

**当前项目Docker架构：**

```
┌─────────────────────────────────────────────────┐
│                 Docker Host                     │
│                                                 │
│  ┌──────────────┐      ┌──────────────┐       │
│  │   Nginx      │─────▶│  Frontend    │       │
│  │  (443端口)   │      │  (Vue.js)    │       │
│  └──────┬───────┘      └──────────────┘       │
│         │                                       │
│         │                                       │
│  ┌──────▼───────┐      ┌──────────────┐       │
│  │   Backend    │─────▶│  PostgreSQL  │       │
│  │  (NestJS)    │      │  (数据库)     │       │
│  └──────┬───────┘      └──────────────┘       │
│         │                                       │
│         │                                       │
│  ┌──────▼───────┐                              │
│  │    MinIO     │                              │
│  │  (对象存储)  │                              │
│  └──────────────┘                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.3 Docker Swarm集群部署

**适用场景：** 多服务器高可用集群

**部署步骤：**

```bash
# 在主节点初始化Swarm
docker swarm init --advertise-addr your-server-ip

# 获取加入令牌
docker swarm join-token worker

# 在工作节点加入集群
docker swarm join --token SWMTKN-1-xxx your-server-ip:2377

# 部署服务栈
docker stack deploy -c docker-compose.yml file-storage

# 查看服务状态
docker service ls

# 扩展服务
docker service scale file-storage_backend=3
```

### 3.4 Kubernetes部署

**适用场景：** 大规模企业级应用

**需要额外创建Kubernetes配置文件：**

- `k8s/deployment.yaml` - 部署配置
- `k8s/service.yaml` - 服务配置
- `k8s/ingress.yaml` - 入口配置
- `k8s/configmap.yaml` - 配置映射
- `k8s/secret.yaml` - 密钥配置

**部署步骤：**

```bash
# 应用Kubernetes配置
kubectl apply -f k8s/

# 查看部署状态
kubectl get pods
kubectl get services

# 扩展副本
kubectl scale deployment backend --replicas=3
```

### 3.5 传统部署（不推荐用于生产）

**适用场景：** 开发测试环境

**部署步骤：**

```bash
# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装PostgreSQL
sudo apt install -y postgresql-17

# 安装MinIO（手动下载）

# 部署后端
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start dist/main.js --name backend

# 部署前端
cd frontend
npm install
npm run build
# 将dist目录部署到Nginx
```

**劣势：**
- ❌ 环境配置复杂
- ❌ 依赖冲突风险
- ❌ 难以扩展和迁移
- ❌ 服务管理复杂

### 3.6 云平台PaaS部署

**适用场景：** 快速原型开发、无运维需求

**主流云平台：**

| 平台 | 特点 | 适用场景 |
|------|------|---------|
| **Heroku** | 简单易用、免费额度 | 小型项目、原型开发 |
| **Railway** | 现代化界面、快速部署 | 中小型项目 |
| **Render** | 免费SSL、自动部署 | 静态站点、Web应用 |
| **Vercel** | 前端优化、边缘部署 | 前端应用、Next.js |
| **阿里云/腾讯云** | 国内访问快、生态完善 | 企业级应用 |

**部署示例（Heroku）：**

```bash
# 安装Heroku CLI
npm install -g heroku

# 登录Heroku
heroku login

# 创建应用
heroku create your-app-name

# 添加PostgreSQL插件
heroku addons:create heroku-postgresql

# 部署应用
git push heroku main

# 查看应用日志
heroku logs --tail
```

---

## 四、部署后验证

### 4.1 功能验证

#### 验证1：访问前端页面

```bash
# 浏览器访问
https://your-domain.com

# 或使用IP访问
http://your-server-ip

# 期望结果：
# - 显示登录页面
# - 可以注册新用户
# - 可以登录系统
```

#### 验证2：用户注册登录

```bash
# 1. 点击"立即注册"
# 2. 填写用户名、密码、邮箱
# 3. 点击"注册"按钮
# 4. 注册成功后跳转到登录页面
# 5. 使用注册的账号登录
# 6. 登录成功后跳转到文件管理页面
```

#### 验证3：文件上传下载

```bash
# 1. 点击"上传文件"按钮
# 2. 选择一个测试文件（如test.pdf）
# 3. 等待上传完成
# 4. 在文件列表中查看上传的文件
# 5. 点击"下载"按钮
# 6. 验证下载的文件内容完整
```

#### 验证4：文件分享功能

```bash
# 1. 点击文件的"分享"按钮
# 2. 设置分享参数（密码、过期时间）
# 3. 点击"创建分享"
# 4. 复制分享链接
# 5. 在新浏览器窗口打开分享链接
# 6. 验证可以下载分享的文件
```

### 4.2 性能验证

#### 验证1：响应时间

```bash
# 测试API响应时间
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3001/api/v1/health

# 期望结果：< 0.1s
```

#### 验证2：并发能力

```bash
# 安装ab工具
sudo apt install -y apache2-utils

# 测试并发请求
ab -n 100 -c 10 http://localhost:3001/api/v1/health

# 期望结果：
# - Requests per second: > 100 [#/sec]
# - Time per request: < 100 [ms]
```

#### 验证3：资源使用

```bash
# 查看容器资源使用
docker stats

# 期望结果：
# - CPU使用率: < 50%
# - 内存使用: < 1GB
```

### 4.3 安全验证

#### 验证1：HTTPS访问

```bash
# 测试HTTPS访问
curl -I https://your-domain.com

# 期望结果：
# HTTP/2 200
# strict-transport-security: max-age=31572000; includeSubDomains
```

#### 验证2：HTTP自动跳转

```bash
# 测试HTTP跳转
curl -I http://your-domain.com

# 期望结果：
# HTTP/1.1 301 Moved Permanently
# Location: https://your-domain.com/
```

#### 验证3：未认证访问拒绝

```bash
# 测试未认证访问受保护接口
curl http://localhost:3001/api/v1/files/list

# 期望结果：
# {"statusCode":401,"message":"Unauthorized"}
```

---

## 五、运维管理

### 5.1 日常运维命令

#### 服务管理

```bash
# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart backend

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 停止并删除服务
docker compose down

# 重新构建并启动
docker compose up -d --build
```

#### 数据库管理

```bash
# 进入PostgreSQL容器
docker exec -it file-storage-postgres bash

# 连接数据库
psql -U postgres -d file_storage

# 查看所有表
\dt

# 查看用户表数据
SELECT * FROM users;

# 退出数据库
\q

# 退出容器
exit
```

#### MinIO管理

```bash
# 访问MinIO控制台
# 浏览器打开：http://your-server-ip:9001

# 登录信息：
# Username: minioadmin
# Password: YourMinIOPassword123! (在.env中配置的)

# 查看存储桶
# 在控制台中可以看到file-storage桶

# 查看文件
# 进入file-storage桶，可以看到上传的文件
```

### 5.2 数据备份

#### 自动备份配置

```bash
# 编辑Cron任务
sudo crontab -e

# 添加以下任务
# 每天凌晨2点备份数据库
0 2 * * * docker exec file-storage-postgres /backup/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1

# 每天凌晨3点备份MinIO
0 3 * * * docker exec file-storage-minio /backup/backup-minio.sh >> /var/log/backup-minio.log 2>&1

# 每周日凌晨4点清理旧备份（保留7天）
0 4 * * 0 find /opt/webapps/web-file-storage/backup -type f -mtime +7 -delete

# 保存并退出
```

#### 手动备份

```bash
# 手动备份数据库
docker exec file-storage-postgres /backup/backup-postgres.sh

# 手动备份MinIO
docker exec file-storage-minio /backup/backup-minio.sh

# 查看备份文件
ls -lh backup/postgres/
ls -lh backup/minio/
```

#### 数据恢复

```bash
# 恢复PostgreSQL数据库
gunzip -c backup/postgres/postgres_backup_20240101_020000.sql.gz | \
  docker exec -i file-storage-postgres psql -U postgres -d file_storage

# 恢复MinIO数据
tar -xzf backup/minio/minio_backup_20240101_030000.tar.gz -C /tmp/minio_restore
docker cp /tmp/minio_restore/. file-storage-minio:/data/
docker compose restart minio
```

### 5.3 监控告警

#### 日志监控

```bash
# 实时查看所有日志
docker compose logs -f --tail=100

# 查看错误日志
docker compose logs | grep -i error

# 查看访问日志
docker compose logs nginx | grep "GET\|POST"

# 日志文件位置
# Nginx: /var/log/nginx/
# Backend: docker logs file-storage-backend
# PostgreSQL: docker logs file-storage-postgres
```

#### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看系统资源使用
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
netstat -tlnp
```

#### 告警配置（示例）

```bash
# 安装监控工具（可选）
# Prometheus + Grafana

# 或使用云监控服务
# 阿里云监控、腾讯云监控

# 配置告警规则：
# 1. CPU使用率 > 80% 持续5分钟
# 2. 内存使用率 > 85% 持续5分钟
# 3. 磁盘使用率 > 90%
# 4. 服务不可用
# 5. 响应时间 > 3秒
```

### 5.4 更新部署

#### 方式1：Git拉取更新

```bash
# SSH连接服务器
ssh root@your-server-ip

# 进入项目目录
cd /opt/webapps/web-file-storage

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose down
docker compose build
docker compose up -d

# 查看服务状态
docker compose ps
```

#### 方式2：Rsync增量更新

```bash
# 在本地执行
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  -e ssh \
  D:/storage/Work_Files/华为项目/web1/ \
  root@your-server-ip:/opt/webapps/web-file-storage/

# 在服务器上重新构建
ssh root@your-server-ip
cd /opt/webapps/web-file-storage
docker compose down
docker compose build
docker compose up -d
```

### 5.5 故障排查

#### 问题1：服务无法启动

```bash
# 查看服务状态
docker compose ps

# 查看错误日志
docker compose logs backend

# 常见原因：
# 1. 端口冲突
sudo netstat -tlnp | grep :3001

# 2. 环境变量错误
cat .env

# 3. 依赖服务未就绪
docker compose ps postgres minio

# 解决方案：
docker compose restart backend
```

#### 问题2：数据库连接失败

```bash
# 检查PostgreSQL状态
docker compose ps postgres

# 检查数据库日志
docker compose logs postgres

# 测试数据库连接
docker exec -it file-storage-postgres psql -U postgres -d file_storage

# 解决方案：
# 1. 检查密码配置
grep POSTGRES_PASSWORD .env

# 2. 重启数据库
docker compose restart postgres

# 3. 等待数据库就绪后重启后端
sleep 10
docker compose restart backend
```

#### 问题3：文件上传失败

```bash
# 检查MinIO状态
docker compose ps minio

# 检查MinIO日志
docker compose logs minio

# 检查存储空间
df -h

# 检查文件大小限制
grep FILE_MAX_SIZE .env

# 解决方案：
# 1. 检查MinIO配置
grep MINIO .env

# 2. 重启MinIO
docker compose restart minio backend
```

---

## 六、快速部署脚本

### 6.1 一键部署脚本

**创建部署脚本：**

```bash
# 在服务器上创建部署脚本
vim /opt/deploy.sh
```

**脚本内容：**

```bash
#!/bin/bash

# Web文件存储系统一键部署脚本

set -e

PROJECT_DIR="/opt/webapps/web-file-storage"
BACKUP_DIR="/opt/backups"

echo "========================================="
echo "Web文件存储系统部署脚本"
echo "========================================="

# 检查是否在项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误：项目目录不存在"
    exit 1
fi

cd $PROJECT_DIR

# 备份当前版本
echo "1. 备份当前版本..."
if [ -d "backup" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p $BACKUP_DIR
    tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz backup/
    echo "备份完成：$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
fi

# 拉取最新代码
echo "2. 拉取最新代码..."
git pull origin main

# 停止服务
echo "3. 停止服务..."
docker compose down

# 构建镜像
echo "4. 构建Docker镜像..."
docker compose build

# 启动服务
echo "5. 启动服务..."
docker compose up -d

# 等待服务就绪
echo "6. 等待服务就绪..."
sleep 10

# 健康检查
echo "7. 健康检查..."
if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    docker compose logs backend
    exit 1
fi

if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO服务正常"
else
    echo "❌ MinIO服务异常"
    docker compose logs minio
    exit 1
fi

echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo "访问地址："
echo "  - 前端：https://your-domain.com"
echo "  - MinIO控制台：http://your-server-ip:9001"
echo ""
echo "查看日志："
echo "  docker compose logs -f"
echo ""
echo "查看状态："
echo "  docker compose ps"
```

**设置执行权限：**

```bash
chmod +x /opt/deploy.sh
```

**执行部署：**

```bash
/opt/deploy.sh
```

---

## 七、总结

### 7.1 部署流程总结

```
┌─────────────────────────────────────────────────────────┐
│                    部署流程图                            │
└─────────────────────────────────────────────────────────┘

1. 准备阶段
   ├─ 确认服务器信息
   ├─ 安装Docker环境
   └─ 配置防火墙

2. 代码传输
   ├─ Git克隆（推荐）
   ├─ SCP传输
   └─ Rsync同步

3. 配置阶段
   ├─ 配置环境变量
   ├─ 配置SSL证书
   └─ 配置域名解析

4. 部署阶段
   ├─ 构建Docker镜像
   ├─ 启动服务
   └─ 验证服务

5. 运维阶段
   ├─ 监控日志
   ├─ 定期备份
   └─ 故障排查
```

### 7.2 关键配置清单

| 配置项 | 文件位置 | 说明 |
|--------|---------|------|
| 环境变量 | `.env` | 数据库密码、JWT密钥等 |
| Docker编排 | `docker-compose.yml` | 服务配置、网络、卷 |
| Nginx配置 | `nginx/nginx.conf` | 反向代理、HTTPS |
| SSL证书 | `nginx/ssl/` | HTTPS证书文件 |
| 备份脚本 | `scripts/` | 数据库和MinIO备份 |

### 7.3 常用命令速查

```bash
# 服务管理
docker compose up -d          # 启动服务
docker compose down          # 停止服务
docker compose restart       # 重启服务
docker compose logs -f       # 查看日志
docker compose ps            # 查看状态

# 数据库管理
docker exec -it file-storage-postgres psql -U postgres -d file_storage

# 备份恢复
docker exec file-storage-postgres /backup/backup-postgres.sh
docker exec file-storage-minio /backup/backup-minio.sh

# 监控
docker stats                 # 资源使用
htop                         # 系统监控
df -h                        # 磁盘使用
```

### 7.4 最佳实践建议

1. ✅ **使用Docker容器化部署**：确保环境一致性
2. ✅ **配置HTTPS安全访问**：保护数据传输
3. ✅ **定期备份数据**：防止数据丢失
4. ✅ **监控服务状态**：及时发现并解决问题
5. ✅ **使用Git管理代码**：便于版本控制和回滚
6. ✅ **配置防火墙**：限制不必要的访问
7. ✅ **文档化运维流程**：便于团队协作

---

**部署指南完成！** 🎉

**下一步操作：**
1. 按照指南步骤部署到服务器
2. 验证所有功能正常
3. 配置监控和备份
4. 享受您的私有文件存储系统！

如有问题，请参考`DEPLOYMENT.md`详细指南或查看项目`README.md`。