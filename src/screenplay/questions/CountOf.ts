/**
 * src/screenplay/questions/CountOf.ts
 *
 * Counts how many elements in a `PageElements` collection currently exist.
 * Useful for assertions like "the cart has N items" or "the results show N
 * products".
 *
 * Usage:
 *   Ensure.that(CountOf.elements(CartUI.cartItems()), equals(3))
 */
import { PageElements } from '@serenity-js/web';

export class CountOf {
    /** Returns the number of elements currently matching the given collection. */
    static elements(elements: PageElements) {
        return elements.count();
    }
}
