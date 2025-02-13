FROM node:16 AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all frontend files
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]