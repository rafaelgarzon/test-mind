import { Task } from '@serenity-js/core';
import { Click, Enter } from '@serenity-js/web';
import { LoginUI } from '../ui/LoginUI';

export class Login {
    static withCredentials = (username: string, password: string) =>
        Task.where(`#actor logs in as ${username}`,
            Enter.theValue(username).into(LoginUI.usernameField),
            Enter.theValue(password).into(LoginUI.passwordField),
            Click.on(LoginUI.loginButton),
        );
}
