# Use Node.js 20 (LTS)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package-railway.json package.json

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY railway-server.js .
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p public api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start command
CMD ["node", "railway-server.js"] 