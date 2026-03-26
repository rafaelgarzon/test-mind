Feature: Búsqueda de Libros
  Scenario: Buscar libros en la página principal
    Given que el usuario esta en "https://example.com/libros"
    When busca "Título de libro ejemplo" en el campo de búsqueda
    And selecciona la categoria correcta desde el menú desplegable
    Then deberia ver la lista de resultados con los libros relacionados
    And la página principal deberia mostrar 10 resultados por pagina