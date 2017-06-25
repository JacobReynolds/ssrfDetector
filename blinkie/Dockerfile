FROM node:6
MAINTAINER Jacob Reynolds <jreynoldsdev@gmail.com>

RUN mkdir -p /blinkie
COPY . /blinkie
WORKDIR /blinkie
RUN npm install --production

RUN apt-get update && apt-get -y install cron
ADD crontab /etc/cron.d/resetRates
RUN chmod 0644 /etc/cron.d/resetRates
ADD start.sh /start.sh
RUN chmod +x start.sh
#The core server location, where requests should be sent
ENV SSRF_HOST core
ENV SSRF_HOST_PORT 3000
#Sync this with the core/Dockerfile
ENV BLINKIE_KEY XXXXXXXXXXXXXXXXXXXXXXXXXXX
ENV PORT 3001
EXPOSE  $PORT

CMD ["./start.sh"]
