/**
 * src/screenplay/ui/SearchUI.ts
 *
 * Locators for search bars, search buttons, and search result containers.
 * Works on most public sites that follow ARIA + input[type=search] conventions.
 *
 * Used by: SearchForItem task, TextOf and CountOf questions.
 */
import { By, PageElement, PageElements } from '@serenity-js/web';

export const SearchUI = {
    /** Main search input (role=searchbox first, fallback to common selectors). */
    searchField: () =>
        PageElement.located(By.css('input[type="search"], input[name="search"], [role="searchbox"], #search_product'))
            .describedAs('search field'),

    /** Submit/search button. */
    searchButton: () =>
        PageElement.located(By.css('button[type="submit"], [role="button"][aria-label*="search" i], #submit_search'))
            .describedAs('search button'),

    /** Container that wraps search results. */
    resultsContainer: () =>
        PageElement.located(By.css('[data-testid="results"], .features_items, .search-results, main'))
            .describedAs('results container'),

    /** Collection of result items. */
    resultItems: () =>
        PageElements.located(By.css('.product-image-wrapper, [data-testid="result-item"], .search-result'))
            .describedAs('result items'),

    /** A result item that contains the given text (for assertion). */
    resultItemContaining: (text: string) =>
        PageElement.located(By.cssContainingText('.product-image-wrapper, [data-testid="result-item"], .search-result', text))
            .describedAs(`result item containing "${text}"`),

    /** "No results" / empty-state message. */
    emptyState: () =>
        PageElement.located(By.css('[data-testid="no-results"], .no-results, .empty-state'))
            .describedAs('empty-state message'),
};
