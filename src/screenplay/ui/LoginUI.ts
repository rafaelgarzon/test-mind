import { By, PageElement } from '@serenity-js/web';

export const LoginUI = {
    usernameField: PageElement.located(By.id('username')).describedAs('username field'),
    passwordField: PageElement.located(By.id('password')).describedAs('password field'),
    loginButton: PageElement.located(By.css('button[type="submit"]')).describedAs('login button'),
    flashMessage: PageElement.located(By.id('flash')).describedAs('flash message'),
};
