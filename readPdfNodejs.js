import PdfReader from 'pdfreader';
import fs from "fs";
import path, {dirname}  from 'path';
import puppeteer from 'puppeteer-core';
import converter from 'convert-array-to-csv';

//joining path of directory 
const directoryPath = path.join(dirname('./'), 'read');
const directoryPath2 = path.join(dirname('./'), 'isRead');

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
const keywords = [];
const isLive = [];
const linkWorks = [];
const csvDataHeader = ['URL', 'Keyword', 'isLive', 'linkWorks', 'Landing Page'];
const csvData = [];

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
        let csvFileName = "./"+directoryPath2+"/"+file+'.csv';
        new PdfReader.PdfReader().parseFileItems("./"+directoryPath+"/"+file, (err, item) => {
            if (err) console.error("error:", err);
            else if (!item) {
                console.warn("end of file");
                for(let i = 0; i < urls.length; i++){
                    var data = [];
                    console.log(urls[i]); // do something here with puppeteer
                    (async () => {
                        const browser = await puppeteer.launch(
                            {
                                headless:  false,
                                ignoreHTTPSErrors: true,
                                executablePath: 'C:\\Program Files\\chrome-win\\chrome.exe',
                                timeout: 0
                            }
                        );
                        const page = await browser.newPage();
                        await page.setDefaultNavigationTimeout(0);
                        const navigationPromise = page.waitForNavigation({waitUntil: "domcontentloaded"});
                        var base = getBaseUrl(urls[i]);
                        let url = new URL(urls[i].replace(/"/g,""), base);
                        data.push(url);
                        await page.goto(url).catch(e => console.error('Error on Page: ' + e));
                        navigationPromise;
                        //console.log(url);
                        await page.content();
                        const edgeUrl = 'a[href*="theedgetreatment"]';
                        const k = await page.waitForSelector(edgeUrl, { timeout: 0 });
                        const jsHandle = await k.getProperty('innerHTML');
                        const keyword = await jsHandle.jsonValue();
                        data.push(keyword);
                        const link = await page.$(edgeUrl);
                        console.log(url.href);
                        if(keyword) {
                            console.log(keyword);
                            console.log('isLive: Yes')
                            keywords.push(keyword);
                            isLive.push('Y');
                            data.push('Y');
                        }
                        else {
                            console.log('none');
                            console.log('isLive: No')
                            keywords.push('none');
                            isLive.push('N');
                            data.push('N');
                        }
                        if(link) {
                            console.log('Link Works: Yes');
                            await link.click({button: 'middle'});
                            linkWorks.push('Y');
                            data.push('Y');
                        }
                        else {
                            console.log('Link Works: No')
                            linkWorks.push('N');
                            data.push('N');
                        }
                        for(var j = 0; j < data.length; j++){
                            csvData.push(data[i]);
                        }
                        await browser.close();
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




