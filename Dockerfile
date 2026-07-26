# STEP 1: Berbasis Image Node.js resmi yang ringan
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# STEP 2: Salin source code dan jalankan kompilasi Next.js production build
COPY . .
RUN npx prisma generate
RUN npm run build

# STEP 3: Setup runtime environment untuk menghemat ukuran container (Production Stage)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/next.config.js ./
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
