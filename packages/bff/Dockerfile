FROM node:24-alpine AS build
WORKDIR /app
COPY packages/bff/package.json ./
RUN npm install
COPY packages/bff/tsconfig.json ./
COPY packages/bff/src/ ./src/
RUN npx tsc

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY packages/bff/package.json ./
COPY packages/bff/public/ public/
CMD ["node", "dist/index.js"]
