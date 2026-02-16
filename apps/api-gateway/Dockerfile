FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public
COPY config ../../config
RUN mkdir -p /data/uploads /data/indexing

ENV NODE_ENV=production
EXPOSE 3005
CMD ["node","src/index.js"]
