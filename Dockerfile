FROM node:20-alpine

WORKDIR /app

# Only copy package.json to provide "type": "module" configuration for server.js
COPY package.json ./

COPY dist ./dist
COPY src ./src
COPY server.js ./

EXPOSE 5173

CMD ["node", "server.js"]
