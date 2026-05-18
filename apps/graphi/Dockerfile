FROM node:22-alpine

WORKDIR /app

# Copy package files first for caching
COPY package.json pnpm-lock.yaml ./

# Enable corepack and install production dependencies
RUN corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy the built app
COPY target/ ./

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", "index.js"]
