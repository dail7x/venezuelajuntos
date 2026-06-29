import { chromium } from 'playwright';
async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://desaparecidosterremotovenezuela.com/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const data = await page.evaluate(async () => {
    const token = await new Promise((resolve) => {
      (window as any).grecaptcha.ready(() => {
        (window as any).grecaptcha.execute('6LeBfDUtAAAAAMw1Wtkd58bst6vEnLOi3_NAjGD0', {action: 'submit'}).then(resolve);
      });
    });
    const res = await fetch(`https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=1&page=1`, { headers: { 'x-recaptcha-token': token as string } });
    return await res.json();
  });
  console.log(JSON.stringify(data.items[0], null, 2));
  await browser.close();
}
run().catch(console.error);
