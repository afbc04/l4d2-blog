FROM node:20

WORKDIR /l4d2api

COPY package.json ./
COPY app.js ./

RUN npm install

EXPOSE 8989

CMD ["npm", "start"]