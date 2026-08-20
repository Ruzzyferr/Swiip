# Çok aşamalı derleme: üretim imajında kaynak kod ve geliştirme bağımlılığı yok.
FROM node:22-alpine AS derleyici
WORKDIR /uygulama

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
RUN npm ci

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/core packages/core
COPY packages/api packages/api
RUN npm run typecheck

FROM node:22-alpine AS calistirici
WORKDIR /uygulama
ENV NODE_ENV=production

RUN addgroup -S made2fit && adduser -S made2fit -G made2fit

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=derleyici /uygulama/packages/shared/src packages/shared/src
COPY --from=derleyici /uygulama/packages/core/src packages/core/src
COPY --from=derleyici /uygulama/packages/api/src packages/api/src
COPY --from=derleyici /uygulama/packages/api/gocler packages/api/gocler
COPY tsconfig.base.json ./

USER made2fit
EXPOSE 3000

# tsx ile çalıştırma: derleme adımını sadeleştirir, tek geliştirici için dağıtımı kırılgan yapmaz.
CMD ["node", "--import", "tsx", "packages/api/src/sunucu.ts"]
