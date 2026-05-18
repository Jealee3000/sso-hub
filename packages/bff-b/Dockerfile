FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/bff-b/package.json ./packages/bff-b/
RUN npm ci
COPY packages/bff-b/tsconfig.json ./packages/bff-b/
COPY packages/bff-b/src/ ./packages/bff-b/src/
RUN npm run build --workspace=packages/bff-b

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/packages/bff-b/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/bff-b/package*.json ./
COPY packages/bff-b/public/ public/
EXPOSE 3002
CMD ["node", "dist/index.js"]
