FROM node:alpine
ENV NODE_ENV=production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ["package.json","package-lock.json", "./"]

RUN npm install --$NODE_ENV

COPY . .

#CMD npm run serve