FROM node:13-buster-slim
COPY dist/bundler.js app/
COPY workdir/bundler.config.json /app/workdir/bundler.config.json
WORKDIR /app/
ENTRYPOINT ["node", "--no-deprecation", "bundler.js"]
CMD []