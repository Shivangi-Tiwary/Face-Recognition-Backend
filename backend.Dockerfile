# =============================================
# Dockerfile - Node.js Backend
# Place this file at the ROOT of your project
# =============================================
FROM node:18-alpine

WORKDIR /app

# package.json is at ROOT level (not inside backend/)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the backend folder
COPY backend/ ./backend/

# Expose port (update to match your app's port)
EXPOSE 5000

# ⚠️ Update this to your actual entry point file
CMD ["node", "backend/server.js"]
