<img src="core/public/images/logo.png"/>
<h1>SSRF Detector</h1>

This is the application source code for the SSRF Detector website.  The website has been EOL as of April 7th 2017, but the code has been updated to be run on a local machine.

## Setup
Setting up the application is pretty easy.  The following things will be needed:
* Mailgun API key
* Google Recaptcha site/private keys

These will be set in core/Dockerfile as environmental variables alongside the following variables:
* Blinkie API key (create this yourself and set in core/Dockerfile as well as blinkie/.creds/apiKey.json)
* Session secret (any >24 character random string)

For the actual website these variables were set at runtime, as it is not secure to store these in files.  These were fed in at runtime using [RancherOS](http://rancher.com/clustering-a-node-js-application-with-mongo-docker-and-rancher/) which is a great container management platform (among other things).  RancherOS also helped secure the databases, that is why there is no DB auth set up in this instance.

## Running
Install [docker-compose](https://docs.docker.com/compose/install/) then run `docker-compose build; docker-compose up;`.  The `up` command may have to be run twice, as docker-compose sometimes launches the NodeJS app before Mongo is done initializing.  In that case run `docker-compose down; docker-compose up`;

The SSRF Detector website will be hosted on http://localhost:3000 and the Blinkie server will be run on http://localhost:3001.  It is best to set up Nginx to handle the domain names for these and point the public-facing ports 80/443 to these ports.
