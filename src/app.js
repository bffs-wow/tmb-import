const puppeteer = require("puppeteer");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

// Load configuration
const configPath = path.resolve(__dirname, "..", "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

(async () => {
  console.log("🚀 Starting TMB Import (Persistent Session Mode)...");

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: "new",
    // --- PERSISTENCE: This saves your login so Discord doesn't see a 'New Login' every 15m ---
    userDataDir: "./user_data",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      // --- STEALTH: Hide the fact that this is a bot ---
      "--disable-blink-features=AutomationControlled",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ],
  });

  const page = await browser.newPage();

  // Extra Stealth: patch the navigator.webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // Setup localStorage protection (only needed if we aren't already logged in)
  await page.evaluateOnNewDocument(() => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      get: () => originalLocalStorage,
      configurable: false,
      enumerable: true,
    });
  });

  console.log("🌐 Checking Discord session...");
  await page.goto("https://discord.com/login", { waitUntil: "networkidle2" });

  // Check if we are already logged in from a previous session
  const isLoginPage = page.url().includes("login");

  if (isLoginPage) {
    console.log("💉 Session expired or not found. Injecting Token...");
    await page.evaluate((token) => {
      localStorage.clear();
      localStorage.setItem("token", `"${token}"`);
    }, config.DISCORD_TOKEN);

    await new Promise((r) => setTimeout(r, 2000));
    await page.reload({ waitUntil: "networkidle2" });
  } else {
    console.log("✅ Already logged in via persistent user_data.");
  }

  console.log("🎯 Navigating to ThatsMyBis...");
  await page.goto("https://thatsmybis.com/", { waitUntil: "networkidle2" });

  const discordBtn = await page.$("img.discord-link");
  if (discordBtn) {
    console.log("🖱 Clicking Discord Login...");
    await discordBtn.click();
  }

  try {
    // Wait for either the Authorize button OR the redirect back to TMB
    await page.waitForSelector('button[type="button"]', { timeout: 5000 });
    const buttons = await page.$$('button[type="button"]');
    for (let button of buttons) {
      const text = await page.evaluate((el) => el.textContent, button);
      if (text.includes("Authorize")) {
        console.log("✅ Clicking Discord 'Authorize'...");
        await button.click();
        break;
      }
    }
  } catch (e) {
    console.log("ℹ️ No 'Authorize' button - proceeding.");
  }

  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

  if (config.EXPORT_DATA_URL) {
    console.log(`📥 Fetching Data: ${config.EXPORT_DATA_URL}`);
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
      console.log("💾 saved tmb-data.json");
    } catch (err) {
      await page.screenshot({ path: "temp/error-debug.png" });
      console.error("❌ Failed to parse JSON. Check temp/error-debug.png");
      throw err;
    }
  }

  // Handle Items URL if present
  if (config.EXPORT_ITEMS_URL) {
    console.log("📥 Fetching Items CSV...");
    await page.goto(config.EXPORT_ITEMS_URL, { waitUntil: "networkidle2" });
    const itemsBody = await page.$("body");
    const itemsCsv = await page.evaluate((el) => el.innerText, itemsBody);
    fs.writeFileSync("temp/tmb-items.csv", itemsCsv);
    console.log("💾 saved tmb-items.csv");
  }

  console.log("🏁 Done. Closing browser.");
  await browser.close();
})();
