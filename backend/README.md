# Web文件存储系统后端服务

基于NestJS + Prisma + PostgreSQL + MinIO的私有文件存储与管理系统后端服务。

## 技术栈

- **框架**: NestJS 10.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 17
- **对象存储**: MinIO
- **认证**: JWT + Passport
- **密码加密**: bcrypt

## 项目结构

```
backend/
├── prisma/
│   └── schema.prisma          # Prisma数据库模型定义
├── src/
│   ├── common/                # 公共模块
│   │   ├── decorators/        # 自定义装饰器
│   │   ├── filters/           # 异常过滤器
│   │   ├── guards/            # 认证守卫
│   │   └── interceptors/      # 拦截器
│   ├── modules/               # 功能模块
│   │   ├── auth/              # 用户认证模块
│   │   ├── files/             # 文件管理模块
│   │   ├── shares/            # 分享功能模块
│   │   ├── users/             # 用户信息模块
│   │   └── system/            # 系统模块
│   ├── prisma/                # Prisma服务
│   ├── storage/               # MinIO存储服务
│   ├── app.module.ts          # 应用主模块
│   └── main.ts                # 应用入口
├── .env                       # 环境变量配置
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制`.env.example`为`.env`并修改配置：

```bash
cp .env.example .env
```

主要配置项：
- `DATABASE_URL`: PostgreSQL数据库连接字符串
- `JWT_SECRET`: JWT密钥
- `MINIO_*`: MinIO对象存储配置

### 3. 初始化数据库

```bash
# 生成Prisma Client
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate
```

### 4. 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

## API接口

### 认证接口

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/profile` - 获取用户信息

### 文件接口

- `POST /api/v1/files/upload` - 上传文件
- `GET /api/v1/files/download/:id` - 下载文件
- `GET /api/v1/files/list` - 文件列表
- `DELETE /api/v1/files/:id` - 删除文件（软删除）
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

### 健康检查

- `GET /api/v1/health` - 健康检查接口

## 数据库模型

### User（用户表）
- id: 用户ID
- username: 用户名
- passwordHash: 密码哈希
- email: 邮箱
- status: 账户状态
- storageLimit: 存储空间限制
- createdAt: 创建时间
- updatedAt: 更新时间

### File（文件表）
- id: 文件ID
- userId: 所属用户ID
- fileName: 文件名
- fileSize: 文件大小
- fileType: 文件类型
- storagePath: MinIO存储路径
- deletedAt: 删除时间（软删除）
- createdAt: 创建时间
- updatedAt: 更新时间

### Share（分享表）
- id: 分享ID
- fileId: 文件ID
- userId: 用户ID
- shareCode: 分享码
- password: 分享密码
- maxViews: 最大访问次数
- viewCount: 已访问次数
- expiresAt: 过期时间
- createdAt: 创建时间

## 开发命令

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 单元测试
npm run test

# 测试覆盖率
npm run test:cov

# Prisma Studio
npm run prisma:studio
```

## 安全特性

- JWT令牌认证
- bcrypt密码加密
- 文件类型白名单验证
- 文件大小限制
- 用户存储空间配额
- 文件所有权验证
- HTTPS强制跳转（需配置Nginx）

## 许可证

UNLICENSED