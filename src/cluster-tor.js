 const puppeteer = require('puppeteer');

 function getUrlForCrawling(type, query) {
  const urls = {
    search: `https://www.google.com/search?q=${query}`
  }

  return urls[type];
}

 async function main(urlParam) {
  const url = urlParam || getUrlForCrawling('search', 'Water Park')

  try{
    await open(url)
  }catch(err){   
    err.close();
    main(url)
  }

 }

 async function open(url) {

  return new Promise(async (resolve, reject) => {

    const ports = [
      'http://177.141.99.50:8080',
     

      
    ];
    const port = Math.floor(Math.random() * ports.length);

    const browser = await puppeteer.launch({
       headless: false,
       args: [`--proxy-server=http://34.171.113.206:3128`,
       "--incognito",
       "--disable-gpu",
       "--disable-dev-shm-usage",
       "--disable-setuid-sandbox",
       "--no-first-run",
       "--no-sandbox",
       "--no-zygote"]
     });
     browser.createIncognitoBrowserContext()
     const page = await browser.newPage();
     await page.goto(url);

   let isBlock = await page.evaluate(() => {
      console.log('JAMIIIL')
        const url = window.location.href;
        if(url.includes('sorry')) {
          return true
        }
        return false
     })

     if (!isBlock) {
      console.log('isBlock')
      resolve(browser);
    }else{
      console.log('IsLivre')
      reject(browser);
    }


    
  })

 }

 main();