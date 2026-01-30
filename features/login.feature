Feature: Inicio de Sesión
  
  Scenario: Login Exitoso con Credenciales Validas
    Given que el Actor "usuario" abre la pagina de login
    When ingresa el usuario "tomsmith" y la clave "SuperSecretPassword!"
    Then deberia ver el mensaje flash "You logged into a secure area!"
