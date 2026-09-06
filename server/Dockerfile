FROM node:22-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY shared/ ./shared/
COPY server/ ./server/
RUN npm ci --prefix shared && npm ci --prefix server
RUN npm run build --prefix shared
WORKDIR /app/server
EXPOSE 3000
CMD ["npm", "start"]
