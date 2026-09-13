FROM node:24-alpine

WORKDIR /app

# Install dependencies first for efficient docker caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code and data
COPY . .

# Expose HTTP healthcheck port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "index.js"]
