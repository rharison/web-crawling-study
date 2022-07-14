import { Cluster } from 'puppeteer-cluster'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import randomUseragent from 'random-useragent'
import fs from 'fs'
let BD = {}

async function clearBrowser (page) {
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache');
}

async function getRelateds({ page, data: { url, name } }) {
  if (BD[name]) return
  await clearBrowser(page);
  const userAgent = randomUseragent.getRandom();
  await page.setUserAgent(userAgent)
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 3000 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: false,
    isMobile: false,
  });
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);
  await page.goto(url, { waitUntil: 'networkidle2' })
  await page.waitForTimeout(1000000)
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
    search: `https://www.google.com.br/search?q=${query}`
  }

  return urls[type];
}

async function startCrawling(data) {
  console.log('Data: ', data)
  const pid = process.pid
  try {
    puppeteer.use(StealthPlugin())
    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 1,
      puppeteer,
      puppeteerOptions: {
        headless: false,
        args: [
          `--proxy-server=http://34.171.113.206:3128`,
        ]
      },
    })
    await cluster.task(getRelateds)

    if(data?.length) {
      data.forEach(name => {
        const queryForSearch = name.replace(/ /g,'+');
        const url = getUrlForCrawling('search', queryForSearch);
        cluster.queue({ url, name })
      })
    }

    await cluster.idle()
    await cluster.close()

  } catch(error) {
    console.error(`${pid} has broken! ${error.stack}`)
  }
}

startCrawling(['Hot Park']);