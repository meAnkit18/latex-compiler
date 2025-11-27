# Base image with Node
FROM node:20-bookworm

# Install LaTeX (this is heavy)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    texlive-full \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

RUN npm install

# Copy rest of the app
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (for local info; Render uses PORT env)
EXPOSE 10000

# Start command
CMD ["npm", "start"]
