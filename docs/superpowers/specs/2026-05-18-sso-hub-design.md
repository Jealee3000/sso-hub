# SSO Hub 设计文档

## 概述

SSO Hub 是一个企业级单点登录认证中心，实现 OAuth 2.0 + OpenID Connect 标准协议，支持 GitHub OAuth 和 Web3 钱包两种登录方式。配套两个 BFF（Backend For Frontend）演示项目展示 SSO 集成能力。全部 Docker Compose 编排，部署到 2 核 2G 轻量服务器。

## 技术栈

| 组件 | 技术 |
|---|---|
| 认证中心 | NestJS + TypeScript |
| BFF | Fastify + TypeScript |
| 数据库 | PostgreSQL |
| 缓存 | Redis（分库隔离：DB0=SSO, DB1=BFF-A, DB2=BFF-B） |
| 网关 | Traefik（路由 + Let's Encrypt HTTPS） |
| 部署 | Docker Compose（7 容器） |

## 系统架构

```
Traefik (:80/:443)
├── sso-hub.localhost  → SSO 认证中心 (NestJS :3000)
├── app-a.localhost    → BFF A (Fastify :3001)
└── app-b.localhost    → BFF B (Fastify :3002)

内网网络（不对外）:
├── PostgreSQL :5432（仅 SSO 访问）
└── Redis :6379（全部后端可访问，分库隔离）
```

**容器清单：** traefik + sso-hub + bff-a + bff-b + postgres + redis + (预留)

**内存预估：** ~1.3GB，2GB 服务器可运行。

## 登录方式

| 方式 | 说明 |
|---|---|
| GitHub OAuth | 标准 OAuth 2.0 授权码流程，拿到 GitHub 用户数字 ID 作为唯一标识 |
| Web3 钱包 | 服务端生成 nonce → 钱包签名 → 服务端验签，EIP-4361 格式 |

## 数据模型

### users
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| email | VARCHAR | 可选，GitHub 登录时填充 |
| display_name | VARCHAR | 可选，昵称 |
| avatar_url | VARCHAR | 可选，头像 |
| is_admin | BOOL | 默认 false，手动赋值 |
| created_at | TIMESTAMP | |

### user_identities
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | FK→users | |
| provider | VARCHAR | "github" 或 "wallet" |
| provider_user_id | VARCHAR | GitHub 数字 ID 或钱包地址 |
| provider_data | JSONB | 原始返回数据 |
| created_at | TIMESTAMP | |

同一用户可绑定多个身份，email 相同的自动合并。

### oauth_clients
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | VARCHAR | 应用名称 |
| client_id | VARCHAR(UUID) | 公开标识 |
| client_secret | VARCHAR | bcrypt 哈希，创建时返回一次原文 |
| redirect_uris | JSONB | 允许的回调地址列表 |
| grants | JSONB | 授权模式 |
| scopes | JSONB | 允许的权限范围 |
| is_active | BOOL | 默认 true |
| created_at / updated_at | TIMESTAMP | |

### refresh_tokens（PostgreSQL + Redis 双写）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| token | VARCHAR | bcrypt 哈希 |
| client_id | FK→oauth_clients | |
| user_id | FK→users | |
| scopes | JSONB | |
| expires_at | TIMESTAMP | 7 天 |
| revoked | BOOL | 默认 false |
| created_at | TIMESTAMP | |

### audit_logs
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | FK→users | 可空 |
| action | VARCHAR | 操作标识 |
| ip_address | VARCHAR | |
| client_id | FK→oauth_clients | 可空 |
| details | JSONB | 操作详情 |
| created_at | TIMESTAMP | |

只追加，不删不改。

## Redis 数据结构

| Key Pattern | DB | 内容 | TTL |
|---|---|---|---|
| auth_code:{code} | 0(SSO) | { client_id, user_id, scopes, redirect_uri } | 5 min |
| nonce:{nonce} | 0(SSO) | { wallet_address, created_at } | 5 min |
| rate_limit:{ip}:{action} | 0(SSO) | counter（滑动窗口） | 窗口长度 |
| refresh_token:{token_hash} | 0(SSO) | { client_id, user_id, scopes, expires_at } | 7 day |
| session:{session_id} | 1(BFF A) / 2(BFF B) | { userId, access_token, id_token, expires_at } | 24 h |

auth_code 和 nonce 消费即删；refresh_token 吊销时删。

## OAuth 2.0 / OIDC 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /authorize | 授权入口，校验参数 → 展示登录页或直接签发 code |
| POST | /token | auth_code 换 access_token + id_token + refresh_token |
| POST | /introspect | token 有效性校验（BFF 也可本地验 JWT） |
| POST | /revoke | 吊销 refresh_token |
| GET/POST | /userinfo | OIDC 用户身份信息 |
| GET | /.well-known/openid-configuration | OIDC Discovery 元数据 |
| GET | /.well-known/jwks.json | JWT 签名公钥 |

## 登录端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /login | 登录页面（HTML），展示 GitHub / 钱包按钮 |
| GET | /login/github | 重定向到 GitHub 授权 |
| GET | /login/github/callback | GitHub 回调 → 创建/查找用户 → 签发 auth_code |
| POST | /login/wallet/nonce | 获取签名用 nonce |
| POST | /login/wallet/verify | 提交签名 → 验签 → 签发 auth_code |
| GET | /logout | 清除 session，吊销 refresh_token |

## 管理后台 API（需 admin session）

| 方法 | 路径 | 说明 |
|---|---|---|
| CRUD | /admin/clients | OAuth 应用管理 |
| CRUD | /admin/users | 用户管理 |
| GET | /admin/audit-logs | 审计日志查询 |

## JWT 令牌

| 令牌 | 格式 | 有效期 | 内容 |
|---|---|---|---|
| access_token | JWT (RS256) | 15 min | { sub, client_id, scopes, iat, exp, iss } |
| id_token | JWT (RS256) | 15 min | { sub, email?, name?, avatar_url?, iat, exp, iss, aud } |
| refresh_token | opaque | 7 天 | 随机字符串，Redis+PG 双写 |

BFF 本地验 JWT 签名，无需每次调 SSO。

## BFF 集成模式

每个 BFF（Fastify）只需 3 个模块：

1. **登录守卫（中间件）** — 检查 session cookie → 有效则放行，无效则 302 到 SSO /authorize
2. **回调路由（/callback）** — 收到 code → 服务端 POST /token 换令牌 → 存 session
3. **受保护页面** — 从 session 取 id_token 展示用户信息

业务前端页面为纯 HTML + 少量 JS，由 Fastify 直接 serve，不依赖前端框架。

## 登录流程

```
用户访问 app-a.com
  → BFF A 无 session
  → 302 sso-hub.com/authorize?client_id=bff-a&redirect_uri=app-a.com/callback&state=xxx
  → SSO 展示登录页

GitHub 分支:
  → 302 github.com/login/oauth/authorize
  → 用户授权 → 回调 SSO → 获取 GitHub 用户信息
  → 查找/创建 user + user_identity(provider=github)

Web3 钱包分支:
  → POST /login/wallet/nonce 获取 nonce
  → 钱包签名 nonce
  → POST /login/wallet/verify 提交签名
  → 验签通过 → 查找/创建 user + user_identity(provider=wallet)

汇合：
  → SSO 生成 auth_code 写入 Redis
  → 302 app-a.com/callback?code=xxx&state=xxx

BFF A 回调：
  → 校验 state
  → POST sso-hub.com/token { code, client_id, client_secret }
  → 得到 { access_token, id_token, refresh_token }
  → 生成 session_id，写入 Redis DB1
  → Set-Cookie: session_id=xxx

后续请求：
  → 浏览器带 cookie → BFF 从 Redis 取 session → 有效 → 放行
```

## 安全措施

- authorization_code 一次性使用，5 分钟过期
- redirect_uri 必须与注册时的精确匹配
- client_secret 仅存 bcrypt 哈希
- /token 仅接受服务端调用
- session cookie: httpOnly + Secure + SameSite=Lax
- JWT 签名使用非对称密钥（RS256），BFF 持有公钥验签
- refresh_token 双写 Redis+PG，Redis 宕机时可从 PG 恢复
- 登录/换 token 端点限流（滑动窗口）
- state 参数防 CSRF
- nonce 签名验证，钱包私钥不离开用户设备

## 目录结构

```
sso-hub/
├── packages/
│   ├── sso-server/     # NestJS 认证中心
│   │   ├── src/        # 业务逻辑
│   │   ├── public/     # 登录页 + 管理后台静态页面
│   │   └── Dockerfile
│   ├── bff-a/          # Fastify 业务 A
│   │   ├── src/
│   │   ├── public/     # 业务 A 前端页面
│   │   └── Dockerfile
│   └── bff-b/          # Fastify 业务 B
│       ├── src/
│       ├── public/     # 业务 B 前端页面
│       └── Dockerfile
├── traefik/
│   └── traefik.yml     # 动态配置
├── docker-compose.yml          # 生产：全套 + Traefik
├── docker-compose.dev.yml      # 模式一：仅 PG + Redis
├── docker-compose.dev-full.yml # 模式二：全套 - Traefik
└── docs/superpowers/
    └── specs/
```

## 本地开发

本地开发分两种模式，按需选择：

### 模式一：轻量开发（日常使用）

基础设施 Docker 跑，应用本地跑（享受热更新）。

```
docker-compose.dev.yml:
├── PostgreSQL :5432
└── Redis :6379

本地进程（npm run dev）:
├── SSO NestJS   → localhost:3000
├── BFF A        → localhost:3001
└── BFF B        → localhost:3002
```

**启动步骤：**

```bash
# 1. 启动基础设施
docker compose -f docker-compose.dev.yml up -d

# 2. 三个终端分别启动应用
cd packages/sso-server && npm run dev    # :3000
cd packages/bff-a && npm run dev         # :3001
cd packages/bff-b && npm run dev         # :3002
```

### 模式二：全量 Docker（不含 Traefik）

适用于验证 Dockerfile、测试容器间网络通信。去除 Traefik，服务端口直接暴露到宿主机。

```
docker-compose.dev-full.yml:
├── SSO NestJS   → localhost:3000
├── BFF A        → localhost:3001
├── BFF B        → localhost:3002
├── PostgreSQL   → localhost:5432
└── Redis        → localhost:6379
```

```bash
# 构建 + 启动全部容器
docker compose -f docker-compose.dev-full.yml up -d --build
```

### 两种模式通用注意事项

| 问题 | 解决方案 |
|---|---|
| 域名用 localhost | 回调地址统一配 `http://localhost:PORT` |
| GitHub OAuth 回调 | 在 GitHub 额外注册 dev OAuth App，callback 填 `http://localhost:3000/login/github/callback` |
| Web3 钱包 | MetaMask 原生支持 localhost，无需 HTTPS |
| cookie SameSite | 本地用 Lax，允许同站 localhost 携带 |
| redis-cli 调试 | `docker compose -f docker-compose.dev.yml exec redis redis-cli` |

## 线上部署

1. 配置环境变量（GitHub OAuth App 生产凭据、JWT 密钥对）
2. 服务器 clone 代码，`docker compose up -d`
3. Traefik 自动申请 Let's Encrypt 证书
4. 首次登录的用户需手动在 DB 设置 is_admin=true 以访问管理后台
