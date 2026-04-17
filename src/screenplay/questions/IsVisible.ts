/**
 * src/screenplay/questions/IsVisible.ts
 *
 * Convenience re-exports of visibility-related expectations from
 * `@serenity-js/web`. Keeping them in one namespaced class gives the AI code
 * generator a stable vocabulary of assertions to pick from.
 *
 * Usage:
 *   Ensure.that(CartUI.viewCartButton(), IsVisible.onScreen())
 *   Ensure.that(NavigationUI.header(), IsVisible.andPresent())
 */
import { isPresent } from '@serenity-js/assertions';
import { isVisible, isClickable } from '@serenity-js/web';

export class IsVisible {
    /** Expectation: the element is visible on screen. */
    static onScreen() {
        return isVisible();
    }

    /** Expectation: the element is present in the DOM (may be hidden). */
    static inDom() {
        return isPresent();
    }

    /** Expectation: the element is visible AND clickable. */
    static andClickable() {
        return isClickable();
    }

    /** Alias for `onScreen()` — matches natural language phrasing. */
    static andPresent() {
        return isVisible();
    }
}
