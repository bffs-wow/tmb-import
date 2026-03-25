FROM node:18-alpine

# 1. Install system dependencies
# We need git/ssh for your loot repo, and chromium + deps for Puppeteer
RUN apk add --no-cache \
    git \
    openssh-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 2. Set environment variables for Puppeteer
# This tells Puppeteer NOT to download its own Chrome and where to find the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# 3. Install Node dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of your code (tmb-import logic)
COPY . .

# 5. Ensure the temp directory exists for exports
RUN mkdir -p temp

# 6. Final launch command
CMD ["sh", "entrypoint.sh"]