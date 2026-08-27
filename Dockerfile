# Build from the repo root:  docker compose up -d --build
#
# ZollEvents is a zero-dependency Node ESM app, so there is no npm install or
# build step — the image just carries the source and runs the public server.
FROM node:22-bookworm-slim
WORKDIR /app

# PORT + data dir are overridable; the per-event overlay (booth/hall/handle,
# links, the Instagram bio template) lives on the mounted /data volume so it
# survives image rebuilds.
ENV NODE_ENV=production \
    PORT=4300 \
    ZOLLEVENTS_DATA_DIR=/data

COPY package.json ./
COPY src ./src

RUN mkdir -p /data
EXPOSE 4300
VOLUME /data
CMD ["node", "src/server.js"]
