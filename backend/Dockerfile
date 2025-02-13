FROM node:16
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all backend files
COPY . .

EXPOSE 8080
CMD ["node", "index.js"]