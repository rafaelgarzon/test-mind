/**
 * src/screenplay/tasks/NavigateToPage.ts
 *
 * Encapsulates navigation to a specific URL as a single business-level Task.
 * Prefer using this over raw `Navigate.to(...)` in step definitions so the
 * Gherkin step reads as a business capability, not a browser command.
 *
 * Usage:
 *   actorCalled('user').attemptsTo(NavigateToPage.at('https://example.com'))
 */
import { Task } from '@serenity-js/core';
import { Navigate } from '@serenity-js/web';

export class NavigateToPage {
    /** Navigate the actor to the given absolute URL. */
    static at = (url: string) =>
        Task.where(`#actor navigates to ${url}`,
            Navigate.to(url),
        );

    /** Reload the current page. */
    static reload = () =>
        Task.where(`#actor reloads the current page`,
            Navigate.reloadPage(),
        );

    /** Navigate back in browser history. */
    static back = () =>
        Task.where(`#actor navigates back`,
            Navigate.back(),
        );
}
