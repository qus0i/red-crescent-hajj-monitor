# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built output and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Create uploads directory for file uploads
RUN mkdir -p public/uploads

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]
