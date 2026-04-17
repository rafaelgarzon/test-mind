/**
 * src/screenplay/questions/CurrentUrl.ts
 *
 * Questions about the current browser URL. Wraps `Page.current().url()`
 * so step definitions can read the URL without importing `Page` directly.
 *
 * Usage:
 *   Ensure.that(CurrentUrl.href(), includes('/checkout'))
 */
import { Page } from '@serenity-js/web';

export class CurrentUrl {
    /** The full `URL` object of the active page. */
    static get() {
        return Page.current().url();
    }

    /** The `.href` string of the current URL (handy for string assertions). */
    static href() {
        return Page.current().url().href;
    }
}
