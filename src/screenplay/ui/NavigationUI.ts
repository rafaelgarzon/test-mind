/**
 * src/screenplay/ui/NavigationUI.ts
 *
 * Locators for common site-wide navigation elements: header, logo, menu links,
 * account icon. Generic enough to work on most public e-commerce sites.
 *
 * Used by: NavigateToPage, OpenShoppingCart, ClickButton tasks.
 */
import { By, PageElement } from '@serenity-js/web';

export const NavigationUI = {
    /** Main site header/banner. */
    header: () =>
        PageElement.located(By.css('header, [role="banner"]'))
            .describedAs('site header'),

    /** Primary navigation bar. */
    primaryNav: () =>
        PageElement.located(By.css('nav, [role="navigation"]'))
            .describedAs('primary navigation'),

    /** Link in the navigation bar by accessible name (case-insensitive). */
    navLink: (name: string) =>
        PageElement.located(By.role('link', { name }))
            .describedAs(`nav link "${name}"`),

    /** Menu item by visible text — used for dropdowns and hamburger menus. */
    menuItem: (text: string) =>
        PageElement.located(By.cssContainingText('a, [role="menuitem"], li', text))
            .describedAs(`menu item "${text}"`),

    /** Page heading (H1) — used as navigation-target assertion. */
    pageHeading: () =>
        PageElement.located(By.css('h1'))
            .describedAs('page heading'),
};
