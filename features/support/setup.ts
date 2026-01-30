import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, engage, ArtifactArchiver } from '@serenity-js/core';
import * as playwright from 'playwright';
import * as path from 'path';
import { EngagePlaywright } from './EngagePlaywright';

setDefaultTimeout(60_000);

let browser: playwright.Browser;

BeforeAll(async () => {
    browser = await playwright.chromium.launch({ headless: true });
});

AfterAll(async () => {
    if (browser) await browser.close();
});

import serenityBDDReporter from '@serenity-js/serenity-bdd';

configure({
    crew: [
        '@serenity-js/console-reporter',
        ['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }],
        ArtifactArchiver.storingArtifactsAt('./target/site/serenity'),
        serenityBDDReporter()
    ],
});

Before(async () => {
    engage(new EngagePlaywright(browser));
});

