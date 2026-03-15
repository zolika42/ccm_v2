# @fileoverview Node image for the frontend dev server; also ensures documentation hooks can run during npm install.
FROM node:20-bookworm

WORKDIR /var/www/html/apps/web

COPY Makefile /var/www/html/Makefile
COPY README.md /var/www/html/README.md
COPY docs /var/www/html/docs
COPY scripts/docs /var/www/html/scripts/docs
COPY apps/api/public/openapi.yaml /var/www/html/apps/api/public/openapi.yaml
COPY apps/web/package*.json ./
RUN npm install

EXPOSE 5173
