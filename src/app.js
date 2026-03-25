const puppeteer = require("puppeteer");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

// Load configuration from config.yaml
const configPath = path.resolve(__dirname, "..", "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser", // Match the path in the Dockerfile
    headless: "new", // Use the modern headless mode
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Important: prevents memory crashes in Docker
    ],
  });
  const page = await browser.newPage();

  // --- ADD THIS BLOCK ---
  // This prevents Discord from overriding localStorage and allows our token to stay
  await page.evaluateOnNewDocument(() => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      get: () => originalLocalStorage,
      configurable: false,
      enumerable: true,
    });
  });
  // ----------------------

  await page.goto("https://discord.com/login");

  // evaluate will run the function in the page context
  await page.evaluate((token) => {
    // Clear any existing session and set the new one
    localStorage.clear();
    localStorage.setItem("token", `"${token}"`);
  }, config.DISCORD_TOKEN);

  // Important: Give Discord a second to "digest" the token before reloading
  await new Promise((r) => setTimeout(r, 1000));
  await page.reload({ waitUntil: "networkidle2" });
  // The logged in discord session above will carry over to TMB
  await page.goto("https://thatsmybis.com/", { waitUntil: "networkidle2" });

  // Click the login button
  await page.click("img.discord-link");

  // Discord might show an "Authorize" button if it's the first time
  // We wait for either the TMB dashboard OR the Discord Authorize button
  try {
    await page.waitForSelector('button[type="button"]', { timeout: 5000 }); // Look for Discord's 'Authorize' button
    const buttons = await page.$$('button[type="button"]');
    for (let button of buttons) {
      const text = await page.evaluate((el) => el.textContent, button);
      if (text.includes("Authorize")) {
        await button.click();
        break;
      }
    }
  } catch (e) {
    // If no authorize button appears, we might already be logged in/redirected
    console.log("No authorization button needed or found.");
  }

  // Final wait to ensure we are back on TMB and logged in
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  if (config.EXPORT_DATA_URL) {
    await page.goto(config.EXPORT_DATA_URL);
    const dataBody = await page.$("body");
    const dataJson = await page.evaluate((el) => el.innerText, dataBody);

    try {
      const jsonObj = JSON.parse(dataJson);
      const finalData = {
        data: jsonObj,
        imported: new Date().toISOString(),
      };
      fs.writeFileSync("temp/tmb-data.json", JSON.stringify(finalData));
    } catch (parseError) {
      await page.screenshot({ path: "temp/error-debug.png" });
      console.error(
        "FAILED TO PARSE JSON. Check temp/error-debug.png to see what page loaded instead.",
      );
      throw parseError;
    }
  }
  if (config.EXPORT_ITEMS_URL) {
    // Access the export items page
    await page.goto(config.EXPORT_ITEMS_URL);
    await page.screenshot({ path: "temp/tmb-items.png" });
    // Save the JSON contents from the body to a local file
    const itemsBody = await page.$("body");
    const itemsCsv = await page.evaluate((el) => el.innerText, itemsBody);
    fs.writeFileSync("temp/tmb-items.csv", itemsCsv);
  }
  await browser.close();
})();
