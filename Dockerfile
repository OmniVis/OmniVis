FROM node:20.19.0-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Install dependencies
# --mount=type=cache: pnpm store survives across builds (eliminates reused:0)
# package-import-method=copy: avoids hardlink overhead on overlay2 filesystems
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts \
    --config.package-import-method=copy

# Copy application files
COPY . .

# Set environment variable to make SvelteKit attach URLs correctly for the proxy
ARG BASE_PATH=/graphi
ENV BASE_PATH=${BASE_PATH}

# Build the application
RUN pnpm build

FROM nginx:alpine
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built site into the subdirectory corresponding to the BASE_PATH
# This ensures that assets are resolved correctly when requested via /graphi/
COPY --from=builder /app/docs /usr/share/nginx/html/graphi

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
