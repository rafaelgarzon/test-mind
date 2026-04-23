/**
 * src/screenplay/ui/CartUI.ts
 *
 * Locators for shopping cart UI: cart icon, view-cart button, cart items,
 * quantities, totals and continue/checkout buttons.
 *
 * Used by: OpenShoppingCart task, cart assertions.
 */
import { By, PageElement, PageElements } from '@serenity-js/web';

export const CartUI = {
    /** Cart icon / link in the site header. */
    cartIcon: () =>
        PageElement.located(By.css('a[href*="cart"], [data-testid="cart-icon"], .cart-icon'))
            .describedAs('cart icon'),

    /** "View Cart" button that appears in the add-to-cart confirmation modal. */
    viewCartButton: () =>
        PageElement.located(By.cssContainingText('a, button', 'View Cart'))
            .describedAs('View Cart button'),

    /** "Continue Shopping" button in the add-to-cart confirmation modal. */
    continueShoppingButton: () =>
        PageElement.located(By.cssContainingText('button, a', 'Continue Shopping'))
            .describedAs('Continue Shopping button'),

    /** Confirmation modal shown after clicking Add to Cart. */
    addedToCartModal: () =>
        PageElement.located(By.css('.modal, [role="dialog"], #cartModal'))
            .describedAs('added-to-cart modal'),

    /** Container wrapping all cart rows. */
    cartContainer: () =>
        PageElement.located(By.css('#cart_info_table, .cart-container, [data-testid="cart"]'))
            .describedAs('cart container'),

    /** All rows / items currently in the cart. */
    cartItems: () =>
        PageElements.located(By.css('tbody tr, .cart-row, [data-testid="cart-item"]'))
            .describedAs('cart items'),

    /** A specific cart row matched by product name. */
    cartItemByName: (productName: string) =>
        PageElement.located(By.cssContainingText('tbody tr, .cart-row, [data-testid="cart-item"]', productName))
            .describedAs(`cart item "${productName}"`),

    /** Price column of the currently selected cart row. */
    cartItemPrice: () =>
        PageElement.located(By.css('.cart_price, .price, td.price'))
            .describedAs('cart item price'),

    /** Cart total amount. */
    cartTotal: () =>
        PageElement.located(By.css('.cart_total_price, .total, [data-testid="cart-total"]'))
            .describedAs('cart total'),

    /** Checkout button. */
    checkoutButton: () =>
        PageElement.located(By.cssContainingText('a, button', 'Proceed To Checkout'))
            .describedAs('Checkout button'),
};
