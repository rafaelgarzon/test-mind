/**
 * src/screenplay/tasks/AddProductToCart.ts
 *
 * Adds a named product to the cart. Finds the product card by its visible
 * title and clicks the card's Add-to-Cart button.
 *
 * Important: this Task does NOT select quantity, color or size — those are
 * only added when the requirement explicitly mentions them (see
 * PromptTemplates FABRICATION RULES).
 *
 * Usage:
 *   actorCalled('user').attemptsTo(AddProductToCart.named('Winter Top'))
 */
import { Task } from '@serenity-js/core';
import { Click } from '@serenity-js/web';
import { ProductListUI } from '../ui/ProductListUI';

export class AddProductToCart {
    /** Find a product by name and click its Add-to-Cart button. */
    static named = (productName: string) =>
        Task.where(`#actor adds "${productName}" to the cart`,
            Click.on(ProductListUI.productByName(productName)),
            Click.on(ProductListUI.addToCartButton()),
        );
}
