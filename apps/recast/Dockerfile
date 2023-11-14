FROM nginx:stable-alpine as production

COPY nginx/ /etc/nginx/conf.d/
COPY dist/recast/ /usr/share/nginx/html/
