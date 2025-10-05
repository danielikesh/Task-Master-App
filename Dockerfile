<<<<<<< HEAD
# Base Node image
FROM node:20-alpine

# Set working directory
=======
# Use official Node.js image
FROM node:20-alpine

# Set working directory inside container
>>>>>>> 33de035
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the rest of the app
COPY . .

<<<<<<< HEAD
# Expose port
EXPOSE 3000

# Run as root to allow SQLite write
USER root

# Start the server
=======
# Expose port 3000
EXPOSE 3000

# Run as root to avoid SQLite permission issues
USER root

# Start the app
>>>>>>> 33de035
CMD ["node", "server.js"]
