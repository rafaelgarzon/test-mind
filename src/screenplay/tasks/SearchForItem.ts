/**
 * src/screenplay/tasks/SearchForItem.ts
 *
 * Types a query into the search field and submits it. Uses `SearchUI`
 * locators, so it works on any site whose search follows common patterns.
 *
 * Usage:
 *   actorCalled('user').attemptsTo(SearchForItem.called('winter top'))
 */
import { Task } from '@serenity-js/core';
import { Click, Enter, Press, Key } from '@serenity-js/web';
import { SearchUI } from '../ui/SearchUI';

export class SearchForItem {
    /** Type `query` into the search field and click the search button. */
    static called = (query: string) =>
        Task.where(`#actor searches for "${query}"`,
            Enter.theValue(query).into(SearchUI.searchField()),
            Click.on(SearchUI.searchButton()),
        );

    /** Type `query` and submit via Enter key (for sites without a submit button). */
    static byPressingEnter = (query: string) =>
        Task.where(`#actor searches for "${query}" by pressing Enter`,
            Enter.theValue(query).into(SearchUI.searchField()),
            Press.the(Key.Enter).in(SearchUI.searchField()),
        );
}
