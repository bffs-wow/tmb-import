const puppeteer = require("puppeteer");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

// Load configuration
const configPath = path.resolve(__dirname, "..", "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

// Helper function for timestamped logging
const log = (msg) => {
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  console.log(`[${now}] ${msg}`);
};

(async () => {
  log("🚀 Starting TMB Import (Persistent Session Mode)...");

  // Force the process to exit if it hangs for more than 5 minutes
  const timeoutId = setTimeout(() => {
    log("⏰ ERROR: Script timed out after 5 minutes. Force closing...");
    process.exit(1);
  }, 300000);

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: "new",
    userDataDir: "./user_data",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ],
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await page.evaluateOnNewDocument(() => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      get: () => originalLocalStorage,
      configurable: false,
      enumerable: true,
    });
  });

  log("🌐 Checking Discord session...");
  await page.goto("https://discord.com/login", { waitUntil: "networkidle2" });

  const isLoginPage = page.url().includes("login");

  if (isLoginPage) {
    log("💉 Session expired or not found. Injecting Token...");
    await page.evaluate((token) => {
      localStorage.clear();
      localStorage.setItem("token", `"${token}"`);
    }, config.DISCORD_TOKEN);

    await new Promise((r) => setTimeout(r, 2000));
    await page.reload({ waitUntil: "networkidle2" });
  } else {
    log("✅ Already logged in via persistent user_data.");
  }

  log("🎯 Navigating to ThatsMyBis...");
  await page.goto("https://thatsmybis.com/", { waitUntil: "networkidle2" });

  const discordBtn = await page.$("img.discord-link");
  if (discordBtn) {
    log("🖱 Clicking Discord Login...");
    await discordBtn.click();
  }

  try {
    await page.waitForSelector('button[type="button"]', { timeout: 5000 });
    const buttons = await page.$$('button[type="button"]');
    for (let button of buttons) {
      const text = await page.evaluate((el) => el.textContent, button);
      if (text.includes("Authorize")) {
        log("✅ Clicking Discord 'Authorize'...");
        await button.click();
        break;
      }
    }
  } catch (e) {
    log("ℹ️ No 'Authorize' button - proceeding.");
  }

  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

  if (config.EXPORT_DATA_URL) {
    log(`📥 Fetching Data: ${config.EXPORT_DATA_URL}`);
    await page.goto(config.EXPORT_DATA_URL, { waitUntil: "networkidle2" });
    const dataBody = await page.$("body");
    const dataJson = await page.evaluate((el) => el.innerText, dataBody);

    try {
      const jsonObj = JSON.parse(dataJson);
      fs.writeFileSync(
        "temp/tmb-data.json",
        JSON.stringify({
          data: jsonObj,
          imported: new Date().toISOString(),
        }),
      );
      log("💾 saved tmb-data.json");
    } catch (err) {
      await page.screenshot({ path: "temp/error-debug.png" });
      log("❌ Failed to parse JSON. Check temp/error-debug.png");
      throw err;
    }
  }

  if (config.EXPORT_ITEMS_URL) {
    log("📥 Fetching Items CSV...");
    await page.goto(config.EXPORT_ITEMS_URL, { waitUntil: "networkidle2" });
    const itemsBody = await page.$("body");
    const itemsCsv = await page.evaluate((el) => el.innerText, itemsBody);
    fs.writeFileSync("temp/tmb-items.csv", itemsCsv);
    log("💾 saved tmb-items.csv");
  }

  log("🏁 Done. Closing browser.");

  // Clean up
  await browser.close();
  clearTimeout(timeoutId);

  log("👋 Process finished successfully.");
  process.exit(0); // Force exit to prevent hanging on the watchdog
})();
