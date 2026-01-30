import { Actor, Cast as ICast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import * as playwright from 'playwright';

export class Cast implements ICast {
    constructor(private readonly browser: playwright.Browser) {
    }

    prepare(actor: Actor): Actor {
        return actor.whoCan(
            BrowseTheWebWithPlaywright.using(this.browser),
            TakeNotes.usingAnEmptyNotepad(),
        );
    }
}
