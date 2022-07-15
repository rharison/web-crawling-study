import puppeteer from 'puppeteer';

async function getRelateds(page) {
  console.log('Collecting relateds...');

  const selectorAllLinksWithDataVed = 'a[data-ved]';
  const textFromLinkRelateds = 'Pesquisas relacionadas'
  const teste = page.$

    await page.waitForSelector(selectorAllLinksWithDataVed, {timeout: 5000})
    .catch(err => {
      console.log('JAMIIIIIIIIIIIIIIKL')
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
      const relateds = Array.from(elementsRelateds).map(el => el.textContent)

      return relateds;
    }
    return [];
  }, selectorContainerRelateds, selectorRelateds)


  return relateds;

}

async function collectData(page, initialMainName) {
  let BDrelateds = {}
  const relateds = await getRelateds(page);
  BDrelateds[initialMainName] = relateds;
  for (let x=0; x <= 10; x++) {
    const queryForSearch = relateds[x].replace(/ /g,'+');
    const url = getUrlForCrawling('search', queryForSearch);
    await page.goto(url);
    const relatedData = await getRelateds(page);
    BDrelateds[relateds[x]] = relatedData;
  }

  console.log(BDrelateds)
  return {
    relateds
  }
}

function getUrlForCrawling(type, query) {
  const urls = {
    search: `https://www.google.com/search?q=${query}`
  }

  return urls[type];
}

async function startCrawling() {
  const browser = await puppeteer.launch({headless: false});
  console.log('Service of crawling started...');
  const page = await browser.newPage();
  const initialMainName = 'Hot Park';
  const queryForSearch = initialMainName.replace(/ /g,'+');
  const url = getUrlForCrawling('search', queryForSearch);
  await page.goto(url);

  const collectedData = await collectData(page, initialMainName);

  console.log(JSON.stringify(collectedData, null, 2));

  await browser.close();
}


startCrawling();