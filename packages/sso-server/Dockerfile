FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/sso-server/package.json ./packages/sso-server/
RUN npm install
COPY tsconfig.base.json ./
COPY packages/sso-server/tsconfig.json packages/sso-server/nest-cli.json ./packages/sso-server/
COPY packages/sso-server/src/ ./packages/sso-server/src/
RUN npm run build --workspace=packages/sso-server

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/packages/sso-server/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/sso-server/package*.json ./
COPY packages/sso-server/public/ public/
EXPOSE 3000
CMD ["node", "dist/main"]
