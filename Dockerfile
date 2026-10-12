# ---------- 构建阶段 ----------
FROM node:22-alpine AS builder
WORKDIR /app

# 前端依赖与构建
COPY frontend/package*.json ./frontend/
RUN cd frontend && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund)
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 后端依赖与编译
COPY backend/package*.json ./backend/
RUN cd backend && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund)
COPY backend/ ./backend/
RUN cd backend && npm run build

# ---------- 运行阶段 ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev --no-audit --no-fund || cd backend && npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
