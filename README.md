# Web Chat Monitor

Automated availability check for the chat widget on [csas.cz](https://www.csas.cz). The test launches a headless browser, navigates to the website, and verifies that the chat is fully functional — from page load to receiving a welcome message from the bot.

Two implementations are available:

| Variant | File | Technology |
|---------|------|------------|
| JavaScript | `check-chat.js` | Node.js + Playwright |
| Robot Framework | `check-chat.robot` | Python + Browser library (Playwright) |

Both implementations perform the same 4 verification steps:

1. **Load page** — navigate to csas.cz and wait for the page to fully load
2. **Chat button** — wait for the minimized chat teaser to appear
3. **Open chat** — click the teaser and wait for the chat window to expand
4. **Welcome message** — wait for the bot's first message and verify it is not empty

## Prerequisites

- **Git** (to clone the repository)
- **Node.js** v18+ (for the JavaScript variant)
- **Python** 3.9+ (for the Robot Framework variant)

## JavaScript variant

### Installation

```bash
# Install Node.js dependencies (includes Playwright and Chromium)
npm install
```

Playwright automatically downloads the Chromium browser during `npm install`. If it doesn't, run:

```bash
npx playwright install chromium
```

### Running the test

```bash
node check-chat.js
```

or using the npm script:

```bash
npm run check
```

### Output

The script prints step-by-step progress to the console and exits with code `0` if all checks pass, or `1` if any check fails:

```
1. Loading page...
   OK - page loaded
2. Waiting for "Chat" button...
   OK - "Chat" button is visible
3. Opening chat...
   OK - chat window opened
4. Waiting for welcome message...
   OK - welcome message: "Hi, I'm a virtual assistant..."

=== RESULTS ===
Page loaded:          OK
Chat button:          OK
Chat opened:          OK
Welcome message:      OK

Overall status: CHAT IS WORKING
```

## Robot Framework variant

### Installation

1. Create and activate a Python virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

2. Install Robot Framework and the Browser library:

```bash
pip install robotframework robotframework-browser
```

3. Initialize the Browser library (downloads Playwright and browser binaries):

```bash
rfbrowser init
```

### Running the test

```bash
robot check-chat.robot
```

### Output

Robot Framework generates three report files in the current directory after each run:

| File | Description |
|------|-------------|
| `report.html` | High-level summary with pass/fail status |
| `log.html` | Detailed step-by-step execution log |
| `output.xml` | Machine-readable results (for CI integration) |

Open `report.html` in a browser to see the results, or `log.html` for a detailed breakdown of each step.

To specify a custom output directory:

```bash
robot --outputdir results check-chat.robot
```

## Project structure

```
webmonitor/
  check-chat.js       # JavaScript implementation (Node.js + Playwright)
  check-chat.robot    # Robot Framework implementation (Browser library)
  package.json        # Node.js project config and dependencies
  Dockerfile          # Docker image for the JS variant
  Dockerfile.robot    # Docker image for the Robot Framework variant
  .dockerignore       # Files excluded from Docker build
```

## Running with Docker

Docker is the easiest way to run the tests anywhere without installing dependencies manually.

### JavaScript variant

```bash
# Build
docker build -t webmonitor .

# Run
docker run --rm webmonitor
```

### Robot Framework variant

```bash
# Build
docker build -f Dockerfile.robot -t webmonitor-robot .

# Run (reports saved to ./results on the host)
docker run --rm -v $(pwd)/results:/app/results webmonitor-robot
```

The `-v` flag mounts a local directory so you can access `report.html`, `log.html`, and `output.xml` after the run.

## Running on a Debian/Ubuntu server

A headless server has no display, so Playwright needs a few system libraries that are normally provided by a desktop environment.

### System dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 libx11-xcb1 \
    fonts-liberation xdg-utils wget ca-certificates
```

Alternatively, Playwright can install all required dependencies automatically:

```bash
# Node.js variant
npx playwright install-deps chromium

# Robot Framework variant (after rfbrowser init)
npx playwright install-deps chromium
```

### JavaScript variant on Debian

```bash
# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and set up the project
git clone <repository-url> /opt/webmonitor
cd /opt/webmonitor
npm install
npx playwright install-deps chromium

# Run the test
node check-chat.js
```

### Robot Framework variant on Debian

```bash
# Install Python
sudo apt-get install -y python3 python3-venv python3-pip

# Clone and set up the project
git clone <repository-url> /opt/webmonitor
cd /opt/webmonitor
python3 -m venv venv
source venv/bin/activate
pip install robotframework robotframework-browser
rfbrowser init
npx playwright install-deps chromium

# Run the test
robot check-chat.robot
```

### Quick cron example

To run the check every 15 minutes and log results:

```bash
crontab -e
```

```cron
# JavaScript variant
*/15 * * * * cd /opt/webmonitor && node check-chat.js >> /var/log/webmonitor.log 2>&1

# Robot Framework variant
*/15 * * * * cd /opt/webmonitor && /opt/webmonitor/venv/bin/robot --outputdir /opt/webmonitor/results check-chat.robot >> /var/log/webmonitor.log 2>&1
```

## Automation in the cloud

Running cron on a VM works, but you pay for a server that sits idle most of the time. Cloud-native scheduling is more cost-effective — you only pay for actual test execution.

### Option 1: GitHub Actions (recommended for simplicity)

The easiest way to schedule the test. No infrastructure to manage, free for public repositories.

Create `.github/workflows/check-chat.yml`:

```yaml
name: Chat availability check

on:
  schedule:
    - cron: "*/15 * * * *"   # every 15 minutes
  workflow_dispatch:          # allow manual trigger

jobs:
  check-chat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install
      - run: npx playwright install --with-deps chromium
      - run: node check-chat.js
```

| Pros | Cons |
|------|------|
| Zero infrastructure | Minimum interval ~5 minutes |
| Free for public repos | Shared runners (variable performance) |
| Built-in notifications | Requires GitHub |
| Test reports as artifacts | |

### Option 2: Azure Container Apps Jobs (recommended for Azure)

The best Azure-native option. Runs the test in a Docker container on a schedule — serverless, pay-per-execution.

1. Use the existing `Dockerfile` from this repository.

2. Build and push to Azure Container Registry:

```bash
az acr build --registry <registry-name> --image webmonitor:latest .
```

3. Create a scheduled Container Apps Job:

```bash
az containerapp job create \
    --name webmonitor-job \
    --resource-group <resource-group> \
    --environment <environment-name> \
    --image <registry-name>.azurecr.io/webmonitor:latest \
    --trigger-type Schedule \
    --cron-expression "*/15 * * * *" \
    --cpu 1.0 --memory 2Gi \
    --replica-timeout 120
```

| Pros | Cons |
|------|------|
| Pay only when running (~$0.00001/s) | Requires Container Registry |
| Full control over environment | More initial setup |
| Down to 1-minute intervals | Azure account needed |
| No browser binary size limits | |

### Option 3: Azure DevOps Pipeline

Good if you already use Azure DevOps. Add a scheduled trigger to a pipeline:

```yaml
trigger: none

schedules:
  - cron: "*/30 * * * *"
    displayName: "Every 30 minutes"
    branches:
      include: [main]
    always: true

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"

  - script: npm install
  - script: npx playwright install --with-deps chromium
  - script: node check-chat.js
```

| Pros | Cons |
|------|------|
| Free tier available | Max ~1000 runs/pipeline/week |
| Built-in test reporting | Primarily a CI/CD tool |
| Easy Azure integration | Less flexible scheduling |

### Comparison

| | GitHub Actions | Azure Container Apps | Azure DevOps |
|-|----------------|---------------------|---------------|
| Setup effort | Low | Medium | Medium |
| Cost | Free (public) | ~$0.00001/s | Free tier |
| Min interval | ~5 min | 1 min | ~30 min |
| Infrastructure | None | Container Registry | None |
| Best for | Simple monitoring | Production Azure | Azure DevOps users |

## Troubleshooting

### Browser download issues

If Playwright fails to download the browser, check your network/proxy settings. You can specify a custom download path:

```bash
# Node.js
PLAYWRIGHT_BROWSERS_PATH=./browsers npx playwright install chromium

# Robot Framework
PLAYWRIGHT_BROWSERS_PATH=./browsers rfbrowser init
```

### Timeout errors

Both implementations use a 30-second timeout for each step. If the website is slow, the test may fail with a timeout error. This usually indicates a real performance problem, but you can adjust the timeout:

- **JavaScript** — change the `TIMEOUT` constant in `check-chat.js`
- **Robot Framework** — change `timeout=30s` in the `*** Settings ***` section of `check-chat.robot`

### Cookie consent dialog

The test automatically dismisses the cookie consent dialog. If the dialog text changes on the website, update the selector `button:has-text("Souhlasím")` in both files.
