FROM node:20-alpine

WORKDIR /app

COPY  package*.json ./
RUN npm i

COPY . .

RUN npm run build

EXPOSE 3000

RUN npm i -g serve

CMD ["serve", "-s", "dist"]