import PdfReader from 'pdfreader';
import fs from "fs";
import path, {dirname}  from 'path';
import puppeteer from 'puppeteer-core';

//joining path of directory 
const directoryPath = path.join(dirname('./'), 'read');
//console.log(directoryPath);

// fs.readFile("read/detoxnearme.com_February2022_OutReachFrog_SEOReport_.pptx.pdf", (err, pdfBuffer) => {
//     // pdfBuffer contains the file content
//     new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
//       if (err) console.error("error:", err);
//       else if (!item) console.warn("end of buffer");
//       else if (item.text) {
//         if(item.text.search('detoxnearme') < 0 && item.text.search('https') > 0) {
//             console.log(item.text);
//         }
//       }
//     });
//   });

// function displayValue (item) {
//     console.log(item);
// }

// const processItem = Rule.makeItemProcessor([
//     Rule.on(/^(http|https)/)
//       .extractRegexpValues()
//       .then(displayValue)
//     // Rule.on(/^c1$/).parseTable(3).then(displayTable),
//     // Rule.on(/^Values\:/)
//     //   .accumulateAfterHeading()
//     //   .then(displayValue)
//   ]);

function getBaseUrl(url){
    var path = url.replace(/"/g, "").split('/');
    var protocol = path[0];
    var host = path[2];
    var base = protocol + '//' + host;
    base = new URL(base);
    return base;
}

function isValidHttpUrl(string) {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

const urls = [];
let s = '';

fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        //console.log(file);
        new PdfReader.PdfReader().parseFileItems("./"+directoryPath+"/"+file, (err, item) => {
            if (err) console.error("error:", err);
            else if (!item) {
                console.warn("end of file");
                for(let i = 0; i < urls.length; i++){
                    console.log(urls[i]); // do something here with puppeteer
                    (async () => {
                        const browser = await puppeteer.launch(
                            {
                                headless: false,
                                ignoreHTTPSErrors: true,
                                executablePath: 'C:\\Program Files\\chrome-win\\chrome.exe',
                                args:['--start-maximized' ],
                                timeout: 0
                            }
                        );
                        const page = await browser.newPage();
                        const navigationPromise = page.waitForNavigation({waitUntil: "domcontentloaded"})
                        var base = getBaseUrl(urls[i]);
                        let url = new URL(urls[i].replace(/"/g,""), base);
                        await page.goto(url);
                        navigationPromise;
                        //console.log(url);
                        await page.content();
                        const edgeUrl = 'a[href*="theedgetreatment"]';
                        await page.waitForSelector(edgeUrl, { timeout: 0 });
                        await page.click(edgeUrl);
                      })();
                }
            }
            else if (item.text) {
                if(isValidHttpUrl(item.text)){
                    if(item.text.search('theedgetreatment') < 0) {
                        s = item.text;
                        //console.log('URL : ' + item.text);
                    }
                }
                else {
                    if(s){
                        urls.push(JSON.stringify(s+item.text));
                        s = '';
                    }
                }
            }
        }); 
    });
});




