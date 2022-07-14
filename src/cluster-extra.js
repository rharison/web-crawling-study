
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
let BD = {}
puppeteer.use(StealthPlugin())
const randomUseragent = require('random-useragent');

async function getRelateds(page, url, name) {
  if (BD[name]) return
  await page.goto(url, { waitUntil: 'networkidle2' })
  console.log('Collecting relateds...');

  const selectorAllLinksWithDataVed = 'a[data-ved]';
  const textFromLinkRelateds = 'Pesquisas relacionadas'

    await page.waitForSelector(selectorAllLinksWithDataVed, {timeout: 5000})
    .catch(err => {
      return []
    })

  const isClicked = await page.evaluate((selectorAllLinksWithDataVed, textFromLinkRelateds) => {
    const allLinksWithDataVed = document.querySelectorAll(selectorAllLinksWithDataVed);
    const linkFromRelatedFiltered = Array.from(allLinksWithDataVed).filter(el => el.innerText === textFromLinkRelateds);

    if(linkFromRelatedFiltered.length) {
      const linkFromRelated = linkFromRelatedFiltered[0];
      linkFromRelated.click();
      return true
    }

    return false
  }, selectorAllLinksWithDataVed, textFromLinkRelateds)

  if(isClicked) {
    await page.waitForNavigation();
  }

  const selectorContainerRelateds = '#extabar';
  const selectorRelateds = 'a[data-entityname]';

  const relateds = await page.evaluate((selectorContainerRelateds, selectorRelateds) => {
    const elementContainerRelateds = document.querySelector(selectorContainerRelateds);
    if(elementContainerRelateds) {
      const elementsRelateds = elementContainerRelateds.querySelectorAll(selectorRelateds)
      const allRelateds = Array.from(elementsRelateds).map(el => el.textContent)
      const cleanRelateds = allRelateds.filter(Boolean)

      return cleanRelateds;
    }
    return [];
  }, selectorContainerRelateds, selectorRelateds)

  BD[name] = relateds;
  fs.writeFileSync('./json/bd4.json', JSON.stringify(BD, null, 2));
  startCrawling(relateds);
}

function getUrlForCrawling(type, query) {
  const urls = {
    search: `https://www.google.com/search?q=${query}`
  }

  return urls[type];
}

async function startCrawling() {
  const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
  const browser = await puppeteer.launch(
    { headless: false, executablePath: process.env.CHROME_BIN || null, args: [
      '--no-sandbox', '--disable-setuid-sandbox'
    ], ignoreHTTPSErrors: true, dumpio: false}
  );
  const page = await browser.newPage();
  const userAgent = randomUseragent.getRandom();
  const UA = userAgent || USER_AGENT;
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 3000 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: false,
    isMobile: false,
  });
  await page.setUserAgent(UA);
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);

  const url = getUrlForCrawling('search', 'Hot Park')
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForTimeout(1000000)
  await page.screenshot({ path: 'testresult.png', fullPage: true })
  await browser.close()
  console.log(`All done, check the screenshot. ✨`)

}

startCrawling();