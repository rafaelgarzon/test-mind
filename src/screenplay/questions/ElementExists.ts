/**
 * src/screenplay/questions/ElementExists.ts
 *
 * Thin wrapper around `PageElement.isPresent()` for natural-language phrasing
 * in step definitions.
 *
 * Usage:
 *   Ensure.that(ElementExists.in(CartUI.cartContainer()), equals(true))
 */
import { PageElement } from '@serenity-js/web';

export class ElementExists {
    /** Returns a boolean Question asking whether the element is in the DOM. */
    static in(element: PageElement) {
        return element.isPresent();
    }
}
