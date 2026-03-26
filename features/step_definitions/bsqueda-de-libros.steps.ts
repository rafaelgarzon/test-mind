import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { Navigate } from '@serenity-js/web';

Given('que el usuario esta en {string}', async (url: string) => {
    await actorCalled('Usuario').attemptsTo(
        Navigate.to(url)
    );
});

When('busca {string} en el campo de búsqueda', async (searchTerm: string) => {
    // Implementación pendiente de la tarea de búsqueda
});

When('selecciona la categoria correcta desde el menú desplegable', async () => {
    // Implementación pendiente
});

Then('debería ver la lista de resultados con los libros relacionados', async () => {
    // Aserción pendiente
});

Then('la página principal debería mostrar {int} resultados por pagina', async (count: number) => {
    // Aserción pendiente
});