const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();

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
            document.createElement`iframe`
          ).contentWindow.localStorage.token = `"${token}"`;
        }, 50);
        setTimeout(() => {
          resolve();
        }, 2500);
      });
    }

    return await login(token);
  }, process.env.DISCORD_TOKEN);
  await page.reload();
  // The logged in discord session above will carry over to TMB
  await page.goto("https://thatsmybis.com/");
  await page.click("img.discord-link");
  await page.waitForNavigation();
  // Access the export data page
  await page.goto(process.env.EXPORT_DATA_URL);
  await page.screenshot({ path: "temp/tmb-data.png" });
  // Save the JSON contents from the body to a local file
  const dataBody = await page.$("body");
  const dataJson = await page.evaluate((el) => el.innerText, dataBody);
  fs.writeFileSync("temp/tmb-data.json", dataJson);
  // Access the export items page
  await page.goto(process.env.EXPORT_ITEMS_URL);
  await page.screenshot({ path: "temp/tmb-items.png" });
  // Save the JSON contents from the body to a local file
  const itemsBody = await page.$("body");
  const itemsCsv = await page.evaluate((el) => el.innerText, itemsBody);
  fs.writeFileSync("temp/tmb-items.csv", itemsCsv);

  await browser.close();
})();
