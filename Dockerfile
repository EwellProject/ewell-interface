FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check GitHub - nodejs/docker-node at b4117f9333da4138b03a546ec926ef50a31506c3 to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi


# Rebuild the source code only when needed
FROM base AS builder
ARG REACT_APP_HTML_TITLE
ARG REACT_APP_ICON_FONT_URL
ARG REACT_APP_S3_IDENTITY_POOL_ID
ARG REACT_APP_S3_BUCKET
ARG REACT_APP_NETWORK_KEY
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_EWELL_CONTRACT_ADDRESS
ARG REACT_APP_WHITELIST_CONTRACT_ADDRESS
ENV REACT_APP_HTML_TITLE=${REACT_APP_HTML_TITLE}
ENV REACT_APP_ICON_FONT_URL=${REACT_APP_ICON_FONT_URL}
ENV REACT_APP_S3_IDENTITY_POOL_ID=${REACT_APP_S3_IDENTITY_POOL_ID}
ENV REACT_APP_S3_BUCKET=${REACT_APP_S3_BUCKET}
ENV REACT_APP_NETWORK_KEY=${REACT_APP_NETWORK_KEY}
ENV REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN}
ENV REACT_APP_EWELL_CONTRACT_ADDRESS=${REACT_APP_EWELL_CONTRACT_ADDRESS}
ENV REACT_APP_WHITELIST_CONTRACT_ADDRESS=${REACT_APP_WHITELIST_CONTRACT_ADDRESS}


WORKDIR /app
#COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then  npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Production image, copy all the files and run next
FROM nginx:1.27.2-alpine AS runner

COPY --from=builder /app/build  /usr/share/nginx/html