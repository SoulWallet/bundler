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
ENTRYPOINT [ "/app/run.sh" ]