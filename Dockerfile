FROM node:26-alpine

LABEL org.opencontainers.image.title="ForkWise Static Analysis Runner" \
      org.opencontainers.image.description="Static-only, evidence-first public GitHub repository reviewer" \
      org.opencontainers.image.source="https://github.com/yashumani/open-source-reviewer-app"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    FORKWISE_DATA_DIR=/data

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node server ./server
COPY --chown=node:node scripts ./scripts

RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 8787
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
