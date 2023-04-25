const puppeteer = require('puppeteer');
const queryString = require('querystring');
const fs = require('fs');
const { parse } = require('json2csv');
const asyncPool = require('tiny-async-pool');
const config = require('./config.json');


/**
 * Perform actions on the page
 * @param {Object} page - Puppeteer page object
 * @param {Array} actions - List of actions to perform
 */
async function performActions(page, actions) {
    for (const action of actions) {
        const { type, selector, next, waitFor, callback } = action;

        if (type === 'evaluate') {
            await page.evaluate(callback);
        } else if (type === 'click') {
            await page.click(selector);
            if (next) {
                await page.waitForTimeout(300);
                await page.click('#main > main > section > div > div > footer > div > div.rc-footer__cta-wrapper > button');
            }
            if (waitFor) {
                await page.waitForTimeout(waitFor);
            }
        }
    }
}

/**
 * Check if the given GA events match the expected events
 * @param {Array} gaEvents - List of GA events
 * @param {Array} eventsToCheck - List of events to check
 * @returns {Array} - List of event results with matching status and expected/actual values
 */
async function checkEvents(gaEvents, eventsToCheck) {
    return eventsToCheck.map((eventToCheck) => {
        const foundEvent = gaEvents.find((event) =>
            Object.entries(eventToCheck.eventParameters).every(([key, value]) =>
                event[key] && event[key].includes(value)
            )
        );

        const isSetupCorrectly = !!foundEvent;
        const expected = eventToCheck.eventParameters;
        const actual = foundEvent;

        return {
            name: eventToCheck.name,
            type: eventToCheck.type,
            isSetupCorrectly,
            expected,
            actual,
        };
    });
}



/**
 * Test Google Analytics events on a website
 * @param {Object} browser - Puppeteer browser object
 * @param {string} url - URL to test
 * @param {Array} actions - List of actions to perform on the website
 * @param {Array} eventsToCheck - List of Google Analytics events to check
 * @returns {Object} Test results containing URL, GA events, and event results
 */
async function testGaEventsOnWebsite(url, actions, eventsToCheck) {
    try {
        // Create a browser instance
        const browser = await createBrowser();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle0' });
        console.log("Starting test on: ", url);

        await acceptCookies(page);

        const gaEvents = await setupRequestInterception(page);

        await performActions(page, actions);

        const eventResults = await checkEvents(gaEvents, eventsToCheck);

        await page.close();
        // Close the browser instance
        await browser.close();
        return { url, gaEvents, eventResults };
    } catch (e) {
        console.log("Error occured on: ", url);
        throw new Error(e);
    }
}


/**
 * Convert the result object to a CSV string
 * @param {Array} results - List of result objects
 * @returns {string} - CSV string
 */
function convertResultsToCSV(results) {
    const rows = results.flatMap((result) => {
        const url = result.url;
        return result.eventResults.map((eventResult) => {
            const eventName = eventResult.name;
            const type = eventResult.type;
            const isSetupCorrectly = eventResult.isSetupCorrectly;
            const expectedParams = JSON.stringify(eventResult.expected);
            const actualParams = eventResult.actual ? JSON.stringify(eventResult.actual) : '';

            return [
                url,
                eventName,
                type,
                isSetupCorrectly,
                expectedParams,
                actualParams,
            ].join(';');
        });
    });

    return [...rows].join('\n');
}

function appendResultsToCSV(result) {
    const csvResult = convertResultsToCSV([result]);
    fs.appendFileSync('results.csv', '\n' + csvResult, 'utf-8');
}



/**
 * Create a new browser instance and configure it
 */
async function createBrowser() {
    return await puppeteer.launch({
        headless: config.headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1365,800',
        ],
        defaultViewport: {
            width: 1365,
            height: 700,
        },
    });
}

/**
 * Accept cookies on the page
 * @param {Object} page - Puppeteer page object
 */
async function acceptCookies(page) {
    try {
        await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
    } catch (e) {
        console.log("No cookie banner");
    }
}

/**
 * Setup request interception for Google Analytics events (UA and GA4)
 * @param {Object} page - Puppeteer page object
 */
async function setupRequestInterception(page) {
    let gaEvents = [];
    await page.setRequestInterception(true);
    page.on('request', req => {
        const requestURL = req.url();
        if (requestURL.includes("google-analytics.com/collect?")) {
            // Universal Analytics (UA)
            const params = queryString.parse(requestURL.split('?')[1]);
            const { ec, ea, el, tid } = params;
            gaEvents.push({ ec, ea, el, tid });
            req.abort();
        } else if (requestURL.includes("google-analytics.com/g/collect?")) {
            // Google Analytics 4 (GA4)
            const params = queryString.parse(requestURL.split('?')[1]);
            const { en, _p, _s, tid } = params;
            gaEvents.push({ en, _p, _s, tid });
            req.abort();
        } else {
            req.continue();
        }
    });

    return gaEvents;
}


// Create the asyncPoolAll wrapper function
async function asyncPoolAll(...args) {
    const results = [];
    for await (const result of asyncPool(...args)) {
        results.push(result);
    }
    return results;
}

const actions = config.actions;
const eventsToCheck = config.eventsToCheck;
const urls = config.urls;

// Update the evaluate action callback to reference the function
const removeGenesysAppIndex = actions.findIndex(
    (action) => action.callback === 'removeGenesysApp'
);
if (removeGenesysAppIndex > -1) {
    actions[removeGenesysAppIndex].callback = () => {
        const element = document.querySelector('body > div.genesys-app');
        if (element) {
            element.remove();
        }
    };
}

(async () => {
    if (config.clearCSV) {
        // Write the CSV header
        const header = [
            'URL',
            'Event Name',
            'Type',
            'Is Setup Correctly',
            'Expected Parameters',
            'Actual Parameters',
        ].join(';');
        fs.writeFileSync('results.csv', header, 'utf-8');
    }

    // Create a function that takes a URL and returns a Promise
    const runTest = async (url) => {
        const result = await testGaEventsOnWebsite(url, actions, eventsToCheck);
        console.log(`Results for ${url}: DONE`);

        // Append the result to the CSV file
        appendResultsToCSV(result);

        return result;
    };

    // Use asyncPoolAll to run your tasks concurrently and get all results at once
    const results = await asyncPoolAll(config.concurrencyLimit, urls, runTest);

    // Save the results object to a file
    fs.writeFileSync('results.json', JSON.stringify(results, null, 2), 'utf-8');
})();



