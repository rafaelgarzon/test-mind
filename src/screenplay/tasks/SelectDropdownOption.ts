/**
 * src/screenplay/tasks/SelectDropdownOption.ts
 *
 * Selects an `<option>` from a dropdown identified by its accessible label.
 *
 * IMPORTANT: only use this Task when the requirement explicitly mentions a
 * dropdown/quantity selection — never fabricate one (see PromptTemplates
 * FABRICATION RULES).
 *
 * Usage:
 *   actorCalled('user').attemptsTo(
 *     SelectDropdownOption.named('United States').fromDropdownLabeled('Country')
 *   )
 */
import { Task } from '@serenity-js/core';
import { Select } from '@serenity-js/web';
import { FormUI } from '../ui/FormUI';

export class SelectDropdownOption {
    /**
     * Selects the option whose visible text matches `optionText` from the
     * dropdown located by its accessible label.
     */
    static named = (optionText: string) => ({
        fromDropdownLabeled: (label: string) =>
            Task.where(`#actor selects "${optionText}" from the "${label}" dropdown`,
                Select.option(optionText).from(FormUI.dropdownByLabel(label)),
            ),
    });

    /** Selects by `<option value="...">` attribute. */
    static withValue = (value: string) => ({
        fromDropdownLabeled: (label: string) =>
            Task.where(`#actor selects value="${value}" from the "${label}" dropdown`,
                Select.value(value).from(FormUI.dropdownByLabel(label)),
            ),
    });
}
