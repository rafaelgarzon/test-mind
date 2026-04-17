/**
 * src/screenplay/tasks/OpenShoppingCart.ts
 *
 * Opens the shopping cart. Two variants are provided because the user flow
 * differs:
 *   - `fromHeader()`    — click the cart icon in the site header
 *   - `fromModal()`     — click "View Cart" in the add-to-cart confirmation
 *
 * Usage:
 *   actorCalled('user').attemptsTo(OpenShoppingCart.fromModal())
 */
import { Task } from '@serenity-js/core';
import { Click } from '@serenity-js/web';
import { CartUI } from '../ui/CartUI';

export class OpenShoppingCart {
    /** Click the cart icon in the site header. */
    static fromHeader = () =>
        Task.where(`#actor opens the shopping cart from the header`,
            Click.on(CartUI.cartIcon()),
        );

    /** Click the "View Cart" button in the add-to-cart confirmation modal. */
    static fromModal = () =>
        Task.where(`#actor opens the shopping cart from the added-to-cart modal`,
            Click.on(CartUI.viewCartButton()),
        );
}
