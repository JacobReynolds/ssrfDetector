FROM node:6
MAINTAINER Jacob Reynolds <jreynoldsdev@gmail.com>

RUN mkdir -p /blinkie
COPY . /blinkie
WORKDIR /blinkie
RUN npm install --production

#The core server location, where requests should be sent
ENV SSRF_HOST core
ENV SSRF_HOST_PORT 3000
#Sync this with the core/Dockerfile
ENV BLINKIE_KEY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ENV PORT 3001
EXPOSE  $PORT

CMD ["npm", "start"]
