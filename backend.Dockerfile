# Use Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

RUN npm install -g pnpm && pnpm install

COPY prisma .

COPY . .

RUN pnpx prisma generate

# Expose the app port
EXPOSE 8032

# Command to run the app
CMD ["node", "index.js"]