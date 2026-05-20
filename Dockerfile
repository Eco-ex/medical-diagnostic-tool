# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Run as a non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Next.js standalone output: a self-contained server with only the
# node_modules it actually needs. `public` and `.next/static` are copied
# separately because standalone does not bundle them.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
