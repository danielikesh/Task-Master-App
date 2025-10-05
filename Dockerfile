# Base Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Run as root to allow SQLite write
USER root

# Start the server
CMD ["node", "server.js"]
