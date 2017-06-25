#!/bin/sh

cron

sleep 5;
node /blinkie/resetRateLimits.js
npm start
