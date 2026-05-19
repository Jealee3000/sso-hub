FROM node:24-alpine AS build
WORKDIR /app
COPY packages/web/package.json ./
RUN npm install
COPY packages/web/tsconfig.json packages/web/tsconfig.app.json packages/web/tsconfig.node.json packages/web/vite.config.ts ./
COPY packages/web/index.html ./
COPY packages/web/public/ public/
COPY packages/web/src/ src/
RUN npm run build

FROM alpine:3.21
COPY --from=build /app/dist /dist
CMD ["cp", "-r", "/dist/.", "/output/"]
