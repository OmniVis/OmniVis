FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:20-slim AS builder
WORKDIR /app
ARG NEXT_BASE_PATH=/slidi
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install Python 3 + pip for the MarkItDown file-conversion bridge
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    pip3 install --no-cache-dir "markitdown[all]" --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the Python converter script so the API route can find it at runtime
COPY --from=builder /app/src/server/converter/convert.py ./scripts/convert.py

EXPOSE 3000
CMD ["node", "server.js"]
