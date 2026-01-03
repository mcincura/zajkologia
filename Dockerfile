# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Expose the backend port (change if your backend uses a different port)
EXPOSE 3001

# Set environment variables (override in docker run or compose as needed)
# ENV NODE_ENV=production

# Start the backend
CMD ["node", "index.js"]
