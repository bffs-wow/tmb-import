FROM node:18-alpine

WORKDIR /app

# Install git and other dependencies
RUN apk add --no-cache git openssh-client

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p temp

CMD ["sh", "entrypoint.sh"]