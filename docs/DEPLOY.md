# 部署指南

本项目是**前后端一体化应用**：Express 同时提供 API、SSE 实时推送和前端静态页面，因此**只需部署一个服务**即可获得完整功能（含实时同步）。

> ⚠️ 为什么不建议用 GitHub Pages？
> Pages 只能托管静态文件，无法运行 Express 服务与 SSE 长连接。前端页面虽能打开，但榜单数据、管理后台、实时同步全部失效。

---

## 方案一：Render 一键部署（推荐，含免费数据库）

1. 把代码推到 GitHub（本仓库已就绪）。
2. 打开 [render.com](https://render.com) → **New** → **Blueprint**。
3. 选择本仓库，Render 会自动读取 `render.yaml`，创建：
   - Web 服务（Docker 构建，自动注入 `DATABASE_URL`）
   - 免费 PostgreSQL 实例
4. 首次部署时按提示填写 `ADMIN_PASSWORD`（管理后台密码）。
5. 部署完成，访问 `https://<你的服务名>.onrender.com` 即可。

> Render 免费实例空闲一段时间会休眠，首次访问需等待约 30 秒冷启动。

## 方案二：任意支持 Docker 的平台

适用于 Railway / Fly.io / Zeabur / 自建服务器等。

```bash
# 本地构建并运行（需自备 PostgreSQL）
docker build -t peiwan-rank .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db" \
  -e JWT_SECRET="your-strong-secret" \
  -e ADMIN_PASSWORD="your-admin-password" \
  peiwan-rank
```

访问 `http://localhost:3000` —— 前端、API、SSE 全部由该端口提供。

## 方案三：传统服务器（Node + Nginx）

```bash
# 1. 构建前端
cd frontend && npm install && npm run build

# 2. 构建并启动后端（会自动托管 ../frontend/dist）
cd ../backend && npm install && npm run build
NODE_ENV=production DATABASE_URL="..." JWT_SECRET="..." npm start
```

Nginx 反向代理时**必须关闭 SSE 缓冲**，否则实时同步会延迟或失效：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 3600s;
}

location /api/events {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;        # 关键：关闭缓冲，SSE 才能实时推送
    proxy_cache off;
    chunked_transfer_encoding off;
    proxy_read_timeout 3600s;
}
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串，云端通常需带 `?sslmode=require` |
| `JWT_SECRET` | ✅ | 管理后台登录令牌密钥，请使用长随机串 |
| `ADMIN_USERNAME` | | 管理员账号，默认 `admin` |
| `ADMIN_PASSWORD` | ✅ | 管理员密码，默认 `admin123`，**上线前务必修改** |
| `PORT` | | 服务端口，多数平台自动注入 |
| `CORS_ORIGIN` | | 一体化部署保持 `*`；前后端分离时填前端域名 |

参考模板见 [`.env.production.example`](.env.production.example)。

## 部署后自检

```bash
curl https://<你的域名>/api/health      # 健康检查
curl https://<你的域名>/api/players     # 榜单数据
curl -N https://<你的域名>/api/events   # 应持续输出 connected 事件（SSE 正常）
```

打开页面后，右下角/导航栏出现 **LIVE** 指示即表示实时同步已连通；此时在 `/admin` 后台修改任意陪玩信息，前台约 1 秒内自动刷新。
