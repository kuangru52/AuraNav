FROM node:20-alpine

WORKDIR /app

# Only copy package.json to provide "type": "module" configuration for server.js
# No npm install is needed because server.js only uses Node.js built-in modules
COPY package.json ./

COPY dist ./dist
COPY server.js ./

EXPOSE 5173

CMD ["node", "server.js"]
