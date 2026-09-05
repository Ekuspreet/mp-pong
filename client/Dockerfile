FROM node:22
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
