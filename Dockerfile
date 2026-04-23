# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies before copying source to leverage layer caching.
# --ignore-scripts skips the postinstall prisma generate because the schema
# doesn't exist yet; we run it explicitly below.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

COPY . .

RUN yarn prisma generate --schema=apps/wav-api/prisma/schema.prisma

RUN yarn nx build wav-api --configuration=production

# ---- Runner ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Copy the webpack bundle and generated package.json
COPY --from=builder /app/dist/apps/wav-api ./dist/apps/wav-api

# Copy node_modules so externalized requires resolve at runtime.
# .prisma is included here – it holds the compiled query engine binaries.
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/apps/wav-api/main.js"]