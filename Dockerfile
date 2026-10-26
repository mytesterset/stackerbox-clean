FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=optional
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
USER node
CMD ["node", "build/index.js"]