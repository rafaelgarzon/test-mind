import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, engage } from '@serenity-js/core';
import * as playwright from 'playwright';
import { EngagePlaywright } from './EngagePlaywright';

setDefaultTimeout(60_000);

let browser: playwright.Browser;

BeforeAll(async () => {
    browser = await playwright.chromium.launch({ headless: true });
});

AfterAll(async () => {
    if (browser) await browser.close();
});

Before(async () => {
    configure({
        crew: [
            '@serenity-js/console-reporter',
            ['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }],
        ],
    });
    engage(new EngagePlaywright(browser));
});

