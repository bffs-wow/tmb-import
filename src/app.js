const puppeteer = require("puppeteer");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const configPath = path.resolve(__dirname, "..", "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

(async () => {
  console.log("🚀 Starting TMB Import...");
  console.log(
    `🔑 Using Token: ${config.DISCORD_TOKEN.substring(0, 10)}... (truncated)`,
  );

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  // Setup localStorage protection
  await page.evaluateOnNewDocument(() => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      get: () => originalLocalStorage,
      configurable: false,
      enumerable: true,
    });
  });

  console.log("🌐 Navigating to Discord Login page...");
  await page.goto("https://discord.com/login", { waitUntil: "networkidle2" });

  console.log("💉 Injecting Discord Token...");
  await page.evaluate((token) => {
    localStorage.clear();
    localStorage.setItem("token", `"${token}"`);
    console.log("Internal Log: Token set in localStorage.");
  }, config.DISCORD_TOKEN);

  await new Promise((r) => setTimeout(r, 1500));

  console.log("🔄 Reloading Discord to confirm session...");
  await page.reload({ waitUntil: "networkidle2" });

  // Debug: Verify if we are actually logged in
  const localStorageToken = await page.evaluate(() =>
    localStorage.getItem("token"),
  );
  console.log(`Verify: localStorage token exists? ${!!localStorageToken}`);

  console.log("🎯 Navigating to ThatsMyBis...");
  await page.goto("https://thatsmybis.com/", { waitUntil: "networkidle2" });

  console.log("🖱 Clicking Discord Login button on TMB...");
  const discordBtn = await page.$("img.discord-link");
  if (discordBtn) {
    await discordBtn.click();
  } else {
    console.error("❌ Could not find Discord login image/button!");
    await page.screenshot({ path: "temp/missing-btn.png" });
  }

  try {
    console.log("⏳ Waiting for potential Discord Authorization...");
    await page.waitForSelector('button[type="button"]', { timeout: 8000 });
    const buttons = await page.$$('button[type="button"]');
    for (let button of buttons) {
      const text = await page.evaluate((el) => el.textContent, button);
      if (text.includes("Authorize")) {
        console.log("✅ Found and Clicking 'Authorize' button.");
        await button.click();
        break;
      }
    }
  } catch (e) {
    console.log(
      "ℹ️ No 'Authorize' button found - assuming auto-redirect or already logged in.",
    );
  }

  console.log("⌛ Waiting for TMB redirect to settle...");
  await page
    .waitForNavigation({ waitUntil: "networkidle2" })
    .catch(() => console.log("Navigation wait timed out/settled early."));

  console.log(`📍 Current URL: ${page.url()}`);

  if (config.EXPORT_DATA_URL) {
    console.log(`📥 Fetching Data Export: ${config.EXPORT_DATA_URL}`);
    await page.goto(config.EXPORT_DATA_URL, { waitUntil: "networkidle2" });
    const dataBody = await page.$("body");
    const dataJson = await page.evaluate((el) => el.innerText, dataBody);

    try {
      console.log("🧩 Attempting to parse JSON data...");
      const jsonObj = JSON.parse(dataJson);
      const finalData = {
        data: jsonObj,
        imported: new Date().toISOString(),
      };
      fs.writeFileSync("temp/tmb-data.json", JSON.stringify(finalData));
      console.log("💾 Successfully saved tmb-data.json");
    } catch (parseError) {
      console.error("❌ PARSE ERROR: The content received was not valid JSON.");
      console.log(`📄 Snippet of content: "${dataJson.substring(0, 50)}..."`);
      await page.screenshot({ path: "temp/error-debug.png" });
      console.log("📸 Saved error-debug.png for visual inspection.");
      throw parseError;
    }
  }

  if (config.EXPORT_ITEMS_URL) {
    console.log(`📥 Fetching Items Export: ${config.EXPORT_ITEMS_URL}`);
    await page.goto(config.EXPORT_ITEMS_URL, { waitUntil: "networkidle2" });
    const itemsBody = await page.$("body");
    const itemsCsv = await page.evaluate((el) => el.innerText, itemsBody);
    fs.writeFileSync("temp/tmb-items.csv", itemsCsv);
    console.log("💾 Successfully saved tmb-items.csv");
  }

  console.log("🏁 Process complete. Closing browser.");
  await browser.close();
})();
