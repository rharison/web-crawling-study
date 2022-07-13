import puppeteer from 'puppeteer';

async function collectData(page) {
  console.log('Collecting relateds...');

  const selectorAllLinksWithDataVed = 'a[data-ved]';
  const textFromLinkRelateds = 'Pesquisas relacionadas'

  await page.evaluate((selectorAllLinksWithDataVed, textFromLinkRelateds) => {
    const allLinksWithDataVed = document.querySelectorAll(selectorAllLinksWithDataVed);
    const linkFromRelatedFiltered = Array.from(allLinksWithDataVed).filter(el => el.innerText === textFromLinkRelateds);

    if(linkFromRelatedFiltered.length) {
      const linkFromRelated = linkFromRelatedFiltered[0];
      linkFromRelated.click();
    }
  }, selectorAllLinksWithDataVed, textFromLinkRelateds)

  await page.waitForNavigation();

  const selectorContainerRelateds = '#extabar';
  const selectorRelateds = 'a[data-entityname]';

  const relateds = await page.evaluate((selectorContainerRelateds, selectorRelateds) => {
    const elementContainerRelateds = document.querySelector(selectorContainerRelateds);
    if(elementContainerRelateds) {
      const elementsRelateds = elementContainerRelateds.querySelectorAll(selectorRelateds)
      const relateds = Array.from(elementsRelateds).map(el => el.textContent)

      return relateds;
    }
    return [];
  }, selectorContainerRelateds, selectorRelateds)


  return relateds;

}

function getUrlForCrawling(type, query) {
  const urls = {
    search: `https://www.google.com/search?q=${query}`
  }

  return urls[type];
}

async function startCrawling() {
  const browser = await puppeteer.launch();
  console.log('Service of crawling started...');
  const page = await browser.newPage();
  const url = getUrlForCrawling('search', 'Hot+Park');
  await page.goto(url);

  const collectedData = await collectData(page);

  console.log(JSON.stringify(collectedData, null, 2));
  
  await browser.close();
}

(async () => {
  startCrawling();
})()