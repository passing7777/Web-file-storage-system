FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    python3 \
    make \
    g++ \
    libc-dev

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

CMD ["sh", "./start.sh"]