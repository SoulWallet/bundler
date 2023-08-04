# Stage 1: Build and Webpack
FROM node:16 as build
WORKDIR /app/
COPY . .
RUN yarn && yarn preprocess
RUN cd dockers/bundler && npx webpack

# Stage 2: Create the final image
FROM node:16-buster-slim
WORKDIR /app/
COPY --from=build /app/dockers/bundler/dist/bundler.js /app/
COPY deploy/bundler.config.json /app/workdir/
COPY deploy/run.sh /app/
RUN chmod +rx /app/run.sh

ENV STAGE="PROD" \
  DEBUG="aa.rpc,aa.exec.bundle" \
  BUNDLER_PARAM_MNEMONIC_PHRASE="/bundler/dev/mnemonic" \
  BUNDLER_PARAM_BENEFICIARY="/bundler/dev/beneficiary" \
  BUNDLER_PARAM_ENTRYPOINT="/bundler/dev/entrypoint/06" \
  BUNDLER_PARAM_NETWORK="/bundler/arb/goerli/dev/network"

ENTRYPOINT [ "/app/run.sh" ]