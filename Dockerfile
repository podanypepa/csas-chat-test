FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npx playwright install chromium

COPY check-chat.js ./

CMD ["node", "check-chat.js"]
