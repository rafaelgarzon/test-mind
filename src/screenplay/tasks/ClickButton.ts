/**
 * src/screenplay/tasks/ClickButton.ts
 *
 * Clicks a button or link by its visible text / accessible name.
 *
 * Usage:
 *   actorCalled('user').attemptsTo(ClickButton.labeled('Sign In'))
 *   actorCalled('user').attemptsTo(ClickButton.linkLabeled('Continue'))
 */
import { Task } from '@serenity-js/core';
import { Click } from '@serenity-js/web';
import { FormUI } from '../ui/FormUI';

export class ClickButton {
    /** Click a <button> located by its accessible name. */
    static labeled = (label: string) =>
        Task.where(`#actor clicks the "${label}" button`,
            Click.on(FormUI.buttonByName(label)),
        );

    /** Click a <button> located by its visible text (fallback for non-ARIA buttons). */
    static withText = (text: string) =>
        Task.where(`#actor clicks the button with text "${text}"`,
            Click.on(FormUI.buttonByText(text)),
        );

    /** Click an <a> link located by its visible text. */
    static linkLabeled = (text: string) =>
        Task.where(`#actor clicks the "${text}" link`,
            Click.on(FormUI.linkByText(text)),
        );
}
