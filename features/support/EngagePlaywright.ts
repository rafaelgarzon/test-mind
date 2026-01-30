import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import * as playwright from 'playwright';

export class EngagePlaywright implements Cast {
    constructor(private browser: playwright.Browser) {
    }

    prepare(actor: Actor): Actor {
        return actor.whoCan(
            BrowseTheWebWithPlaywright.using(this.browser),
            TakeNotes.usingAnEmptyNotepad(),
        );
    }
}
