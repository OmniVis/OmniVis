FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY 404.html /usr/share/nginx/html/404.html
COPY feedback.html /usr/share/nginx/html/feedback.html
COPY status.html /usr/share/nginx/html/status.html
COPY 50x.html /usr/share/nginx/html/50x.html
COPY static /usr/share/nginx/html
COPY nginx_launchpad.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
