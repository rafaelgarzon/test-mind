/**
 * src/screenplay/ui/FormUI.ts
 *
 * Generic form locators: text fields, textareas, dropdowns, radio buttons,
 * checkboxes and buttons located by their accessible label or name.
 *
 * Used by: FillField, SelectDropdownOption, ClickButton tasks.
 */
import { By, PageElement } from '@serenity-js/web';

export const FormUI = {
    /** Text input located by its accessible label (preferred). */
    fieldByLabel: (label: string) =>
        PageElement.located(By.role('textbox', { name: label }))
            .describedAs(`field "${label}"`),

    /** Text input located by its placeholder text as fallback. */
    fieldByPlaceholder: (placeholder: string) =>
        PageElement.located(By.css(`input[placeholder*="${placeholder}" i], textarea[placeholder*="${placeholder}" i]`))
            .describedAs(`field with placeholder "${placeholder}"`),

    /** Text input located by its HTML name attribute. */
    fieldByName: (name: string) =>
        PageElement.located(By.css(`input[name="${name}"], textarea[name="${name}"]`))
            .describedAs(`field [name="${name}"]`),

    /** Textarea located by label. */
    textareaByLabel: (label: string) =>
        PageElement.located(By.css(`textarea[aria-label*="${label}" i], textarea[placeholder*="${label}" i]`))
            .describedAs(`textarea "${label}"`),

    /** Select dropdown located by accessible label. */
    dropdownByLabel: (label: string) =>
        PageElement.located(By.role('combobox', { name: label }))
            .describedAs(`dropdown "${label}"`),

    /** Checkbox located by label. */
    checkboxByLabel: (label: string) =>
        PageElement.located(By.role('checkbox', { name: label }))
            .describedAs(`checkbox "${label}"`),

    /** Radio button located by label. */
    radioByLabel: (label: string) =>
        PageElement.located(By.role('radio', { name: label }))
            .describedAs(`radio "${label}"`),

    /** Button located by its visible text. */
    buttonByText: (text: string) =>
        PageElement.located(By.cssContainingText('button, [role="button"], input[type="button"], input[type="submit"]', text))
            .describedAs(`button "${text}"`),

    /** Button located by its accessible role + name (preferred). */
    buttonByName: (name: string) =>
        PageElement.located(By.role('button', { name }))
            .describedAs(`button "${name}"`),

    /** Link located by its visible text. */
    linkByText: (text: string) =>
        PageElement.located(By.role('link', { name: text }))
            .describedAs(`link "${text}"`),
};
