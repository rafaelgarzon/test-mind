/**
 * src/screenplay/tasks/FillField.ts
 *
 * Enters a value into a text field identified by its accessible label, its
 * placeholder, or its HTML `name`. Prefer `byLabel` whenever possible — it's
 * the most robust and the most accessible.
 *
 * Usage:
 *   actorCalled('user').attemptsTo(FillField.byLabel('Email', 'user@mail.com'))
 */
import { Task } from '@serenity-js/core';
import { Enter } from '@serenity-js/web';
import { FormUI } from '../ui/FormUI';

export class FillField {
    /** Enter `value` into a field located by its accessible label. */
    static byLabel = (label: string, value: string) =>
        Task.where(`#actor enters "${value}" into the "${label}" field`,
            Enter.theValue(value).into(FormUI.fieldByLabel(label)),
        );

    /** Enter `value` into a field located by its placeholder text. */
    static byPlaceholder = (placeholder: string, value: string) =>
        Task.where(`#actor enters "${value}" into the field with placeholder "${placeholder}"`,
            Enter.theValue(value).into(FormUI.fieldByPlaceholder(placeholder)),
        );

    /** Enter `value` into a field located by its HTML `name` attribute. */
    static byName = (name: string, value: string) =>
        Task.where(`#actor enters "${value}" into [name="${name}"]`,
            Enter.theValue(value).into(FormUI.fieldByName(name)),
        );
}
