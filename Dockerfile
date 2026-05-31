FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/server/database/migrations /app/migrations

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV MIGRATIONS_PATH=/app/migrations

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
