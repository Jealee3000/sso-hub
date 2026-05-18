FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/bff-a/package.json ./packages/bff-a/
RUN npm ci
COPY packages/bff-a/tsconfig.json ./packages/bff-a/
COPY packages/bff-a/src/ ./packages/bff-a/src/
RUN npm run build --workspace=packages/bff-a

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/packages/bff-a/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/bff-a/package*.json ./
COPY packages/bff-a/public/ public/
EXPOSE 3001
CMD ["node", "dist/index.js"]
