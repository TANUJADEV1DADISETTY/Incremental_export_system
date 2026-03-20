# Use official Node.js 20 LTS Alpine image for a smaller footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies strictly
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure output directory exists and has appropriate permissions
RUN mkdir -p output && chown -R node:node output

# Run application as non-root user
USER node

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["npm", "start"]
