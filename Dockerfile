# nest-api Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./dist/assets
COPY --from=builder /app/src/mail/templates ./dist/mail/templates
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
CMD ["node", "dist/main.js"]