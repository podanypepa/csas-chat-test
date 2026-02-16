FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        nodejs npm \
        libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
        libpango-1.0-0 libcairo2 libasound2t64 libxshmfence1 libx11-xcb1 \
        fonts-liberation xdg-utils wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir robotframework robotframework-browser \
    && rfbrowser init

COPY check-chat.robot ./

CMD ["robot", "--outputdir", "/app/results", "check-chat.robot"]
