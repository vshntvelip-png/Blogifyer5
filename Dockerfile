FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Give permissions to node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

# Start command
CMD ["node", "app.js"]
