import { chromium } from "playwright";

const URL = "https://www.csas.cz";
const TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 10000;

async function checkChat() {
  const results = {
    page: false,
    chatButton: false,
    chatOpen: false,
    welcomeMessage: false,
  };
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });

    console.log("1. Loading page...");
    await page.goto(URL, { waitUntil: "networkidle", timeout: TIMEOUT });
    results.page = true;
    console.log("   OK - page loaded");

    try {
      await page.click('button:has-text("Souhlasím")', { timeout: 5000 });
    } catch {
      // cookie dialog did not appear
    }

    console.log('2. Waiting for "Chat" button...');
    const chatButton = page.locator(".webchat.minimized .teaser");
    await chatButton.waitFor({ state: "visible", timeout: TIMEOUT });
    results.chatButton = true;
    console.log('   OK - "Chat" button is visible');

    console.log("3. Opening chat...");
    await chatButton.click();
    const chatContainer = page.locator(".webchat.expanded .chat-container");
    await chatContainer.waitFor({ state: "visible", timeout: TIMEOUT });
    results.chatOpen = true;
    console.log("   OK - chat window opened");

    console.log("4. Waiting for welcome message...");
    const botMessage = page.locator(".event--bot .event-content__text");
    await botMessage.first().waitFor({ state: "visible", timeout: TIMEOUT });
    const text = await botMessage.first().textContent();
    results.welcomeMessage = true;
    console.log(`   OK - welcome message: "${text.trim().substring(0, 80)}..."`);
  } catch (err) {
    console.error(`   ERROR: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

async function checkChatWithRetry() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n--- Attempt ${attempt}/${MAX_RETRIES} ---\n`);

    const results = await checkChat();
    const allOk = Object.values(results).every(Boolean);

    console.log("\n=== RESULTS ===");
    console.log(`Page loaded:          ${status(results.page)}`);
    console.log(`Chat button:          ${status(results.chatButton)}`);
    console.log(`Chat opened:          ${status(results.chatOpen)}`);
    console.log(`Welcome message:      ${status(results.welcomeMessage)}`);

    if (allOk) {
      console.log("\nOverall status: CHAT IS WORKING");
      process.exit(0);
    }

    if (attempt < MAX_RETRIES) {
      console.log(`\nRetrying in ${RETRY_INTERVAL / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    }
  }

  console.log("\nOverall status: PROBLEM DETECTED (all retries exhausted)");
  process.exit(1);
}

function status(ok) {
  return ok ? "OK" : "FAIL";
}

checkChatWithRetry();
