# Use the official Node.js image as base
FROM node:latest

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server files
COPY ../../server/server.js ./
COPY ../../server/server/ ./server

# Copy client files
COPY ../../client/ ./client

# Expose port 3000
EXPOSE 3000

# Command to run the server
CMD ["node", "server.js"]