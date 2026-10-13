const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  const readStreaks = () => page.evaluate(() => localStorage.getItem('stim_daily_streaks'));

  console.log('BEFORE streaks:', await readStreaks());

  const links = page.getByTestId('home-lineup').getByRole('link');
  const count = await links.count();
  console.log('lineup link count:', count);
  const firstHref = await links.first().getAttribute('href');
  const firstText = await links.first().textContent();
  console.log('first link href:', firstHref, '| text:', (firstText||'').replace(/\s+/g,' ').trim());

  await links.first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  console.log('URL after click:', page.url());
  console.log('AFTER streaks:', await readStreaks());

  await browser.close();
})();
