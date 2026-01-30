import { test } from '@playwright/test';
import { Actor, Cast, engage, actorCalled } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { Navigate, PageElement, By } from '@serenity-js/web';
import { Ensure, equals } from '@serenity-js/assertions';

test('Sample Test: Verify Serenity/JS Setup', async ({ page }) => {
    engage(Cast.where(actor => actor.whoCan(BrowseTheWebWithPlaywright.usingPage(page))));
    const actor = actorCalled('User');

    await actor.attemptsTo(
        Navigate.to('https://the-internet.herokuapp.com/'),
        Ensure.that(PageElement.located(By.css('h1')).text(), equals('Welcome to the-internet')),
    );
});
