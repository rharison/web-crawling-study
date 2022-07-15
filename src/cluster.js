import { Cluster } from 'puppeteer-cluster'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import UserAgent from 'user-agents';
import fs from 'fs'
let BD = {}

function getUserAgent() {
  const userAgent = new UserAgent({
    deviceCategory: 'desktop',
  });
  return userAgent.toString();
}

async function clearBrowser (page) {
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache');
}

async function preparePage(page) {
  console.log('Preparing page...');
  await clearBrowser(page);
  await page.setUserAgent(getUserAgent())
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);
}

async function getRelateds({ page, data: { url, name } }) {
  if (BD[name]) {
    console.log('Already crawled ===> ', name)
    return
  }

  await preparePage(page)
  await page.goto(url, { waitUntil: 'networkidle2' })

  console.log('Collecting relateds...');
  const selectorAllLinksWithDataVed = 'a[data-ved]';
  const textFromLinkRelateds = 'Pesquisas relacionadas'

    await page.waitForSelector(selectorAllLinksWithDataVed, {timeout: 5000})
    .catch((err) => {
      console.log('Timeout for selectorAllLinksWithDataVed --- Error: ', err);
      return [];
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
  fs.writeFileSync('./json/bd5.json', JSON.stringify(BD, null, 2));
  startCrawling(relateds);
}

function getUrlForCrawling(type, query) {
  const urls = {
    search: `https://www.google.com.br/search?q=${query}`
  }

  return urls[type];
}

let cluster

async function getClustes(){
  puppeteer.use(StealthPlugin())

  if(cluster){
    return cluster
  }
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 1,
    puppeteer,
    puppeteerOptions: {
      headless: false,
      args: [
        //`--proxy-server=http://34.95.227.42:3128`,
      ]
    },
  })

  return cluster
}

async function startCrawling(data) {
  console.log('Data: ', data)
  const pid = process.pid
  try {
    cluster = await getClustes()
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