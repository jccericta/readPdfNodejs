import PdfReader from 'pdfreader';
import fs from "fs";
import path, {dirname}  from 'path';
import puppeteer from 'puppeteer-core';
import converter from 'convert-array-to-csv';
import { TimeoutError } from 'puppeteer';

// Set node max listeners to 0 or infinity
process.setMaxListeners(0);

//joining path of directory 
const directoryPath = path.join(dirname('./'), 'read');
const directoryPath2 = path.join(dirname('./'), 'isRead');

// gets the domain name
function getBaseUrl(url){
    var path = url.replace(/"/g, "").split('/');
    var protocol = path[0];
    var host = path[2];
    var base = protocol + '//' + host;
    base = new URL(base);
    return base;
}

// checks to see if the string is a valid url
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
const csvDataHeader = ['URL', 'Keyword', 'isLive', 'linkWorks', 'Landing Page', 'DA', 'DR'];
const csvData = [];
csvData.push(csvDataHeader);
let s = ''; // temp string
let href = 'theforgerecovery'; // change this per site for bulk audits

/* 
    Function: read all files in the directory ./read.
    For each file create an instance of the pdf reader and read through the contents.
    Scan for variable href and exclude from urls array but include the rest of the urls.

    At EOF, create an instance of puppeteer to spawn a Chromium browser and wait for the a selector to appear with the target href as variable href.
    Get the neccessary information such as the backlink title, the backlink, and etc. Click on the selector to make sure it works. On timeout I'm assuming
    that the link containing the backlinks is either a 404 or timeouts. Either way this means there is no backlink.

    This is an async function that returns the promise of performing a site crawl to each url found in the pdfs.
*/

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
            else if (!item) { // eof
                console.warn("end of file");
                let count = 0;
                for(let i = 0; i < urls.length; i++){
                    console.log(urls[i]); // do something here with puppeteer
                    try {
                        (async () => {
                            let data = [];
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
                            const base = getBaseUrl(urls[i]);
                            const url = new URL(urls[i].replace(/"/g,""), base).href;
                            data.push(url);
                            await page.goto(url).catch(e => console.error('Error Going to Page: ' + e));
                            navigationPromise;
                            await page.content();
                            const targetUrl = 'a[href*="'+href+'"]';
                            try { // try catch on waitForSelector because node breaks on a puppeteer timeout error
                                const k = await page.waitForSelector(targetUrl); // returns a Element handle    
                                const jsHandle = await k.getProperty('innerHTML'); // returns a JSHandle
                                const keyword = await jsHandle.jsonValue(); // return value of the property
                                data.push(keyword);
                                const link = await page.$(targetUrl);
                                const lJsHandle = await link.getProperty('href');
                                const l = await lJsHandle.jsonValue();
                                console.log('');
                                console.log('URL: ' + url);
                                if(keyword) {
                                    console.log('Keyword: ' + keyword);
                                    console.log('Is Live: Yes')
                                    keywords.push(keyword);
                                    isLive.push('Y');
                                    data.push('Y');
                                }
                                else {
                                    console.log('Keyword: ');
                                    console.log('Is Live: No')
                                    keywords.push('none');
                                    isLive.push('N');
                                    data.push('N');
                                }
                                if(link) {
                                    console.log('Link Works: Yes');
                                    await link.click({button: 'middle'});
                                    linkWorks.push('Y');
                                    data.push('Y');
                                    data.push(l);
                                }
                                else {
                                    console.log('Link Works: No');
                                    linkWorks.push('N');
                                    data.push('N');
                                    data.push('');
                                }
                                console.log('');
                                csvData.push(data);
                                //console.log(JSON.stringify(csvData));
                                await browser.close();
                            }
                            catch(e) {
                                if(e instanceof TimeoutError) {
                                    const keyword = '';
                                    const link = '';
                                    data.push(keyword);
                                    console.log('');
                                    console.log('URL: ' + url);
                                    console.log('Keyword: ');
                                    console.log('Is Live: No')
                                    keywords.push('none');
                                    isLive.push('N');
                                    data.push('N');
                                    console.log('Link Works: No');
                                    linkWorks.push('N');
                                    data.push('N');
                                    data.push('');
                                    console.log('');
                                    csvData.push(data);
                                    //console.log(JSON.stringify(csvData));
                                    await browser.close();
                                }
                            }    
                        })().then(
                            function(){
                                count++;
                                if(count === urls.length) {
                                    console.log(JSON.stringify(csvData));
                                    const csvDataString = converter.convertArrayToCSV(csvData, csvDataHeader, ',');
                                    fs.writeFile(csvFileName, csvDataString, 'utf8', function(err){
                                        if(err){
                                            console.log('Error writing to file: ' + csvFileName + ' >> ' + err);
                                        }
                                        else {
                                            console.log(csvFileName + ' has been saved');
                                        }
                                    });
                                }
                            }
                        );
                    }
                    catch(err) {
                        console.log('Error on puppeteer async function: ' + err);
                        throw err;
                    }
                }
            }
            else if (item.text) { // pdfreader is stil reading in texts
                if(isValidHttpUrl(item.text)){
                    if(item.text.search(href) < 0) {
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




