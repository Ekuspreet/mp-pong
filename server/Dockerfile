FROM node:22
WORKDIR /app
COPY shared/ ./shared/
COPY server/ ./server/
RUN npm ci --prefix shared && npm ci --prefix server
RUN npm run build --prefix server
WORKDIR /app/server
EXPOSE 3000
CMD ["npm", "start"]
