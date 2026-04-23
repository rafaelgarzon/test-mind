/**
 * src/screenplay/ui/ProductListUI.ts
 *
 * Locators for product catalogs / grids / feature-item sections commonly
 * found in e-commerce sites (e.g. automationexercise.com).
 *
 * Used by: AddProductToCart task, CountOf question.
 */
import { By, PageElement, PageElements } from '@serenity-js/web';

export const ProductListUI = {
    /**
     * A named product section (e.g. "feature items", "recommended", "new arrivals").
     * Matches by heading text, then walks up to the section container.
     */
    section: (sectionName: string) =>
        PageElement.located(By.cssContainingText('.features_items, section, .product-section', sectionName))
            .describedAs(`"${sectionName}" section`),

    /** All product cards on the current page. */
    allProducts: () =>
        PageElements.located(By.css('.product-image-wrapper, .product-card, [data-testid="product"]'))
            .describedAs('all products'),

    /** A specific product card located by its title text. */
    productByName: (productName: string) =>
        PageElement.located(By.cssContainingText('.product-image-wrapper, .product-card, [data-testid="product"]', productName))
            .describedAs(`product "${productName}"`),

    /** Product title inside the currently hovered/focused product card. */
    productTitle: () =>
        PageElement.located(By.css('.productinfo p, .product-title, h4, h3'))
            .describedAs('product title'),

    /** Product price label inside a product card. */
    productPrice: () =>
        PageElement.located(By.css('.productinfo h2, .product-price, .price'))
            .describedAs('product price'),

    /** "Add to Cart" button inside a product card. */
    addToCartButton: () =>
        PageElement.located(By.cssContainingText('.add-to-cart, .btn, button, a', 'Add to cart'))
            .describedAs('Add to Cart button'),

    /** "View Product" / details link inside a product card. */
    viewProductLink: () =>
        PageElement.located(By.cssContainingText('a', 'View Product'))
            .describedAs('View Product link'),
};
