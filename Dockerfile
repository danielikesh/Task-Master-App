# Use official Node.js image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the rest of the app
COPY . .

# Expose port 3000
EXPOSE 3000

# Run as root to avoid SQLite permission issues
USER root

# Start the app
CMD ["node", "server.js"]
