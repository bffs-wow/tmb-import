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
  // Access the export page
  await page.goto(process.env.EXPORT_URL);
  await page.screenshot({ path: "temp/tmb-1.png" });
  // Save the JSON contents from the body to a local file
  const body = await page.$("body");
  const json = await page.evaluate((el) => el.innerText, body);
  fs.writeFileSync("temp/tmb-data.json", json);

  await browser.close();
})();
