FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the pre-built SPA artifacts into the subpath that matches BASE_PATH=/graphi.
# The target/ directory is produced by the build-app CI stage and passed into this
# job's workspace as a GitLab CI artifact — no Node.js build step needed here.
COPY target /usr/share/nginx/html/graphi

# SPA-aware nginx config:
# - try_files serves static assets (JS/CSS) directly with the correct MIME type
# - Unmatched paths fall back to 404.html so SvelteKit's client-side router
#   handles navigation instead of nginx returning its own text/html error page
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
