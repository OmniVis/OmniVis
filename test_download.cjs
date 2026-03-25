const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const downloadPath = path.resolve('./downloads_test');
  
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  } else {
    fs.readdirSync(downloadPath).forEach(f => fs.unlinkSync(path.join(downloadPath, f)));
  }

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  console.log('Navigating...');
  await page.goto('http://localhost:3001/', {waitUntil: 'networkidle0'});
  
  console.log('Page loaded. Wait 2s for Svelte stores...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Clicking Download SVG...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid=\"download-SVG\"]');
    if (btn) btn.click();
    else console.log('SVG button not found');
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  if (fs.existsSync(downloadPath)) {
    console.log('DOWNLOADED FILES:', fs.readdirSync(downloadPath));
  } else {
    console.log('NO DOWNLOADS FOLDER');
  }
  
  await browser.close();
  process.exit(0);
})();
