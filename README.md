<img src="core/public/images/logo.png"/>
<h1>SSRF Detector</h1>

This is the application source code for the SSRF Detector website.  The website has been EOL as of April 7th 2017, but the code has been updated to be run on a local machine.  This documentation is a little touch-and-go as there is a lot of configuration for Nginx, SSL, etc... but for a local instance it can be run as-is.

## Setup
Setting up the application is pretty easy.  The following things will be needed:
* Mailgun API key
* Google Recaptcha site/private keys
* Blinkie API key (create this yourself and set in core/Dockerfile as well as blinkie/.creds/apiKey.json)
* Session secret (any >24 character random string)

These will be set in core/Dockerfile as environmental variables.

For the actual website these variables were set at runtime, as it is not secure to store these in files.  These were fed in at runtime using [RancherOS](http://rancher.com/clustering-a-node-js-application-with-mongo-docker-and-rancher/) which is a great container management platform (among other things).  RancherOS also helped secure the databases, that is why there is no DB auth set up in this instance.

### Nginx
I used Nginx as a personal preference, but any web server will do.  Nginx was used to route the proper domain names to the ports.  This app works best when set up with Nginx server blocks to forward ssrfdetector.com:80/443 -> localhost:3000 and blinkie.xyz:80/443 -> localhost:3001.  Otherwise the lack of hostnames can cause issues sometimes.

### Ports
IP Tables rules will need to be made to forward a range of ports to the Blinkie application, so that it can detect requests outside of just ports 80 and 443. There currently is no DNS detection, but I would love if someone made a pull request to add that.  Be careful when opening ports, MongoDB is run on port 27017 and **should not** be open to the public.

### Ratelimiting
There will need to be a cronjob set up to run the blinkie/resetRateLimits.js NodeJS file.  This can be set up [easily](https://help.ubuntu.com/community/CronHowto) and I ran it once a day to reset the ratelimits.

### Local use
For local use add an entry into the /etc/hosts file for '127.0.0.1 a.blinkie.xyz' and register 'a' as the subdomain.  Then http://a.blinkie.xyz:3001 can be used to trigger a request.  The 3001 can be left off if a proper Nginx file is setup.

## Running
Install [docker-compose](https://docs.docker.com/compose/install/) then run `docker-compose build; docker-compose up;`.  The `up` command may have to be run twice, as docker-compose sometimes launches the NodeJS app before Mongo is done initializing.  In that case run `docker-compose down; docker-compose up`;

The SSRF Detector website will be hosted on http://localhost:3000 and the Blinkie server will be run on http://localhost:3001.  Note: the Blinkie server needs to be accessed by a domain name, otherwise it will not know which subdomain to report for.

## Thanks!
Thanks for checking out SSRF Detector, it's been a fun project to help me learn more about Docker and MongoDB.  If you find any issues or have any questions please feel free to create an Issue, or email me at jreynoldsdev@gmail.com.
