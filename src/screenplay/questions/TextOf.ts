/**
 * src/screenplay/questions/TextOf.ts
 *
 * Thin wrapper around Serenity/JS `Text.of()` with a project-friendly name.
 * Returns the visible innerText of a single page element.
 *
 * Usage:
 *   Ensure.that(TextOf.element(NavigationUI.pageHeading()), equals('Home'))
 */
import { PageElement, Text } from '@serenity-js/web';

export class TextOf {
    /** Returns the visible text of a single element. */
    static element(element: PageElement) {
        return Text.of(element);
    }
}
