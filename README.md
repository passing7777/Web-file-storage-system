# Web文件存储系统

基于NestJS + Vue 3 + PostgreSQL + MinIO的现代化私有文件存储与管理系统。

## 📋 项目概述

- **用户认证**：注册、登录、JWT认证
- **文件管理**：上传、下载、删除、重命名、回收站
- **分享功能**：创建分享链接、密码保护、访问次数限制
- **安全访问**：HTTPS加密传输、文件类型验证、存储空间配额
- **容器化部署**：Docker Compose一键部署

## 🛠️ 技术栈

### 后端
- **框架**：NestJS 10.x
- **ORM**：Prisma 5.x
- **数据库**：PostgreSQL 17
- **对象存储**：MinIO
- **认证**：JWT + Passport
- **密码加密**：bcrypt

### 前端
- **框架**：Vue 3 + TypeScript
- **UI组件**：Element Plus
- **状态管理**：Pinia
- **路由**：Vue Router
- **HTTP客户端**：Axios
- **构建工具**：Vite

### 基础设施
- **容器编排**：Docker Compose
- **反向代理**：Nginx
- **SSL证书**：Let's Encrypt

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 部署步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd web-file-storage-system
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件，修改敏感配置（数据库密码、JWT密钥等）
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **查看服务状态**
```bash
docker-compose ps
```

5. **访问应用**
- 前端应用：https://localhost
- MinIO控制台：http://localhost:9001

### 开发模式

#### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 初始化数据库
npm run prisma:generate
npm run prisma:migrate

# 启动开发服务器
npm run start:dev
```

#### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📁 项目结构

```
web-file-storage-system/
├── backend/                # 后端应用
│   ├── prisma/            # Prisma数据库模型
│   ├── src/
│   │   ├── common/        # 公共模块（装饰器、过滤器、守卫、拦截器）
│   │   ├── modules/       # 功能模块（auth、files、shares、users）
│   │   ├── storage/       # MinIO存储服务
│   │   └── prisma/        # Prisma服务
│   ├── Dockerfile
│   └── package.json
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── api/          # API接口
│   │   ├── components/   # 组件
│   │   ├── layout/       # 布局
│   │   ├── router/       # 路由
│   │   ├── stores/       # 状态管理
│   │   ├── types/        # TypeScript类型
│   │   ├── utils/        # 工具函数
│   │   └── views/        # 页面
│   ├── Dockerfile
│   └── package.json
├── nginx/                # Nginx配置
│   ├── nginx.conf
│   └── ssl/             # SSL证书目录
├── scripts/             # 脚本
│   ├── backup-postgres.sh
│   └── backup-minio.sh
├── backup/              # 备份目录
│   ├── postgres/
│   └── minio/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| POSTGRES_USER | PostgreSQL用户名 | postgres |
| POSTGRES_PASSWORD | PostgreSQL密码 | postgres123 |
| POSTGRES_DB | 数据库名 | file_storage |
| MINIO_ROOT_USER | MinIO访问密钥 | minioadmin |
| MINIO_ROOT_PASSWORD | MinIO秘密密钥 | minioadmin123 |
| JWT_SECRET | JWT密钥 | - |
| JWT_EXPIRES_IN | JWT过期时间 | 24h |
| CORS_ORIGIN | CORS源 | http://localhost |
| FILE_MAX_SIZE | 最大文件大小（字节） | 524288000 (500MB) |
| USER_STORAGE_LIMIT | 用户存储配额（字节） | 5368709120 (5GB) |

### SSL证书配置

1. **使用Let's Encrypt申请证书**
```bash
# 安装certbot
apt-get install certbot

# 申请证书
certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

2. **自动续期**
```bash
# 添加Cron任务
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

## 💾 备份与恢复

### PostgreSQL备份

```bash
# 手动备份
docker exec file-storage-postgres /backup/backup-postgres.sh

# 自动备份（Cron）
0 2 * * * docker exec file-storage-postgres /backup/backup-postgres.sh
```

### MinIO备份

```bash
# 手动备份
docker exec file-storage-minio /backup/backup-minio.sh

# 自动备份（Cron）
0 2 * * * docker exec file-storage-minio /backup/backup-minio.sh
```

### 数据恢复

#### PostgreSQL恢复
```bash
gunzip -c backup/postgres/postgres_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker exec -i file-storage-postgres psql -U postgres -d file_storage
```

#### MinIO恢复
```bash
tar -xzf backup/minio/minio_backup_YYYYMMDD_HHMMSS.tar.gz -C /tmp/minio_restore
docker cp /tmp/minio_restore/. file-storage-minio:/data/
```

## 📊 监控与日志

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f minio
```

### 健康检查

```bash
# 后端健康检查
curl http://localhost:3001/api/v1/health

# MinIO健康检查
curl http://localhost:9000/minio/health/live
```

## 🔒 安全特性

- ✅ JWT令牌认证
- ✅ bcrypt密码加密
- ✅ HTTPS强制跳转
- ✅ 文件类型白名单验证
- ✅ 文件大小限制
- ✅ 用户存储空间配额
- ✅ 文件所有权验证
- ✅ 分享链接密码保护
- ✅ 分享链接过期时间
- ✅ 分享链接访问次数限制

## 📝 API文档

### 认证接口

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/profile` - 获取用户信息

### 文件接口

- `POST /api/v1/files/upload` - 上传文件
- `GET /api/v1/files/download/:id` - 下载文件
- `GET /api/v1/files/list` - 文件列表
- `DELETE /api/v1/files/:id` - 删除文件
- `PUT /api/v1/files/:id/rename` - 重命名文件
- `GET /api/v1/files/trash` - 回收站列表
- `POST /api/v1/files/trash/:id/restore` - 恢复文件
- `DELETE /api/v1/files/trash/:id` - 永久删除文件

### 分享接口

- `POST /api/v1/shares` - 创建分享链接
- `GET /api/v1/shares/:shareCode` - 访问分享链接
- `GET /api/v1/shares/:shareCode/download` - 下载分享文件
- `GET /api/v1/shares` - 分享列表
- `DELETE /api/v1/shares/:id` - 删除分享链接

## 🤝 贡献

欢迎提交Issue和Pull Request。

## 📄 许可证

MIT License