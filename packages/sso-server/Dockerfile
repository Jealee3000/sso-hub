FROM node:24-alpine AS build
WORKDIR /app
COPY packages/sso-server/package.json ./
RUN npm install
COPY tsconfig.base.json /tsconfig.base.json
COPY packages/sso-server/tsconfig.json packages/sso-server/nest-cli.json ./
COPY packages/sso-server/src/ ./src/
RUN npx nest build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY packages/sso-server/package.json ./
COPY packages/sso-server/public/ public/
EXPOSE 3000
CMD ["node", "dist/main"]
