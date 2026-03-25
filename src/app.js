const puppeteer = require("puppeteer");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

// Load configuration from config.yaml
const configPath = path.resolve(__dirname, "..", "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://discord.com/");

  // evaluate will run the function in the page context
  await page.evaluate(async (token) => {
    // this will be executed within the page, that was loaded before
    function login(token) {
      // Use a trick to log into discord with a token
      return new Promise((resolve, reject) => {
        setInterval(() => {
          document.body.appendChild(
            document.createElement`iframe`,
          ).contentWindow.localStorage.token = `"${token}"`;
        }, 50);
        setTimeout(() => {
          resolve();
        }, 2500);
      });
    }

    return await login(token);
  }, config.DISCORD_TOKEN);
  await page.reload();
  // The logged in discord session above will carry over to TMB
  await page.goto("https://thatsmybis.com/");
  await page.click("img.discord-link");
  await page.waitForNavigation();
  if (config.EXPORT_DATA_URL) {
    // Access the export data page
    await page.goto(config.EXPORT_DATA_URL);
    await page.screenshot({ path: "temp/tmb-data.png" });
    // Save the JSON contents from the body to a local file
    const dataBody = await page.$("body");
    const dataJson = await page.evaluate((el) => el.innerText, dataBody);
    const jsonObj = JSON.parse(dataJson);
    const finalData = {
      data: jsonObj,
      // Add the current date to the json data so the app can render it
      imported: new Date().toISOString(),
    };
    fs.writeFileSync("temp/tmb-data.json", JSON.stringify(finalData));
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
