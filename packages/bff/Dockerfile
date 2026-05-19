FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/bff/package.json ./packages/bff/
RUN npm install
COPY packages/bff/tsconfig.json ./packages/bff/
COPY packages/bff/src/ ./packages/bff/src/
RUN npm run build --workspace=packages/bff

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/packages/bff/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/bff/package*.json ./
COPY packages/bff/public/ public/
EXPOSE 3000
CMD ["node", "dist/index.js"]
