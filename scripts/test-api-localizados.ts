import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("https://desaparecidosterremotovenezuela.com/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(async () => {
    try {
      const token = await new Promise((resolve) => {
        (window as any).grecaptcha.ready(() => {
          (window as any).grecaptcha.execute('6LeBfDUtAAAAAMw1Wtkd58bst6vEnLOi3_NAjGD0', {action: 'submit'}).then(resolve);
        });
      });

      // Try with estado=localizado
      const res = await fetch(`https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=2&page=1&estado=localizado`, {
        headers: {
          'x-recaptcha-token': token as string,
          'accept': 'application/json'
        }
      });
      return await res.json();
    } catch (err: any) {
      return { error: err.message };
    }
  });

  console.log("Total items with estado=localizado:", data.totalItems);
  console.log(JSON.stringify(data.items.slice(0, 2), null, 2));
  await browser.close();
}
run();
