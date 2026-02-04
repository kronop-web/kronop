# Use Node.js 18 LTS for better performance and compatibility
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install production dependencies only (faster, smaller image)
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories for uploads and HLS processing
RUN mkdir -p uploads hls

# Set environment to production
ENV NODE_ENV=production
ENV PORT=10000

# Expose port (Render uses port 10000)
EXPOSE 10000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]
