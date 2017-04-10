FROM node:6
MAINTAINER Jacob Reynolds <jreynoldsdev@gmail.com>

RUN mkdir -p /usr/api
COPY . /usr/api
WORKDIR /usr/api
RUN npm install --production

# Please feed these tokens in at runtime if using this in a real environment, never keep them here
#API key for mailgun for sending notification emails
ENV MAILGUN_API XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
#Google recaptcha secret key
ENV RECAPTCHA_SECRET_KEY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ENV RECAPTCHA_SITE_KEY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
#Blinkie_key is the API token to verify requests coming from Blinkie
#Generate this and make it >24 characters long
ENV BLINKIE_KEY XXXXXXXXXXXXXXXXXXXXXXXXXXX
#Session secret is used for seeding the session token
ENV SESSION_SECRET XXXXXXXXXXXXXXXXXXXXXXXX
ENV PORT 3000
EXPOSE  $PORT

CMD ["npm", "start"]
