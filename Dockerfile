# ---- build stage: compile the client and the server ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
COPY public ./public

RUN npm run build
RUN npx tsc -p server/tsconfig.json --noEmit

# ---- run stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server

EXPOSE 8080

# tsx is a devDependency; install it explicitly for the runtime instead.
RUN npm i tsx@^4 --no-save

CMD ["npx", "tsx", "server/src/index.ts"]
