# docker/node/Dockerfile
# See https://github.com/nodejs/docker-node#dockerfile
FROM node:6

ENV NPM_CONFIG_LOGLEVEL info

EXPOSE 4000

USER node

# set the working directory
RUN mkdir /home/node/app
WORKDIR /home/node/app

# delete existing modules and re-install dependencies
RUN rm -rf node_modules
RUN npm install

# launch the app
CMD  ["/bin/sh"]