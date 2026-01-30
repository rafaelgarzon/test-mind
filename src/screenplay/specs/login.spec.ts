import { test } from '@playwright/test';
import { Actor, Cast, engage, actorCalled } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { Navigate, PageElement, By } from '@serenity-js/web';
import { Ensure, includes } from '@serenity-js/assertions';
import { Login } from '../tasks/Login';
import { LoginUI } from '../ui/LoginUI';

test('Login Scenario: Successful Login', async ({ page }) => {
    // Cast.where allows us to define a custom cast.
    // We explicitly cast 'page' to 'any' to bypass strict type check mismatch 
    // between @playwright/test Page and Serenity's expected Playwright Page types.
    engage(Cast.where(actor => actor.whoCan(BrowseTheWebWithPlaywright.usingPage(page))));

    const actor = actorCalled('User');

    await actor.attemptsTo(
        Navigate.to('https://the-internet.herokuapp.com/login'),
        Login.as('tomsmith'),
        Ensure.that(LoginUI.flashMessage.text(), includes('You logged into a secure area!')),
    );
});
