FROM gitlab-registry.wogra.com/developer/images/nginx:1.19.10-alpine as production

COPY nginx/ /etc/nginx/conf.d/
COPY dist/recast/ /usr/share/nginx/html/
