#react build stage

FROM node:20-alpine as build

WORKDIR /app

COPY  package*.json ./
RUN npm i

COPY . .

RUN npm run build

#production stage

FROM nginx:1.21-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]