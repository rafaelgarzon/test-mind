import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Navigate } from '@serenity-js/web';
import { Ensure, includes } from '@serenity-js/assertions';
import { Login } from '../../src/screenplay/tasks/Login';
import { LoginUI } from '../../src/screenplay/ui/LoginUI';

Given('que el Actor {string} abre la pagina de login', async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(
        Navigate.to('https://the-internet.herokuapp.com/login')
    );
});

When('ingresa el usuario {string} y la clave {string}', async (username: string, password: string) => {
    await actorCalled('usuario').attemptsTo(
        Login.withCredentials(username, password)
    );
});

Then('deberia ver el mensaje flash {string}', async (expectedMessage: string) => {
    await actorCalled('usuario').attemptsTo(
        Ensure.that(LoginUI.flashMessage.text(), includes(expectedMessage))
    );
});
