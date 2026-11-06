FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production API_HOST=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY skills ./skills
COPY agents ./agents
COPY config ./config
COPY db ./db
RUN mkdir data && chown node:node data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
