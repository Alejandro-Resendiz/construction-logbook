### Propuesta: Banner MVP y Deshabilitación de Exportación XLSX

**1. Banner App-Wide (MVP)**

*   **Contenido del mensaje**: "Esta aplicación es un Producto Mínimo Viable (MVP). Tu feedback es crucial para su evolución y nos ayuda a construir un producto que realmente necesitas."
*   **Posición**: Fijo en la parte inferior de la pantalla (`fixed` `bottom`).
*   **Diseño/Estilo**: Sutil, utilizando un color de fondo y texto que se integre armoniosamente con la paleta de colores existente de la aplicación, para no ser intrusivo pero sí visible. Se sugiere un `z-index` adecuado para que siempre esté encima del contenido principal.
*   **Comportamiento**: No dismissible. Permanecerá visible en todo momento.
*   **Internacionalización**: Se añadirá la clave `banner.mvp.message` al diccionario `es.json` y cualquier otro diccionario existente.

**2. Deshabilitación de Exportación XLSX y Tooltip**

*   **Ubicación**: El componente `@app/components/AppDashboardClient.tsx` será modificado para deshabilitar la funcionalidad de exportación XLSX.
*   **Tooltip contenido**: "La exportación a XLSX es una funcionalidad premium, disponible en futuras actualizaciones para potenciar tu gestión."
*   **Comportamiento del Tooltip**: Aparecerá al pasar el mouse (`hover`) sobre el botón o elemento de exportación XLSX deshabilitado.
*   **Internacionalización**: Se añadirá la clave `feature.xlsx.premium.tooltip` al diccionario `es.json` y cualquier otro diccionario existente.

**Riesgos Potenciales:**

*   **Impacto en UX**: Aunque el banner será sutil, la presencia constante de un elemento fijo puede afectar ligeramente la visibilidad de contenido en la parte inferior de la pantalla, si no se maneja el padding o margin correctamente en el diseño de la página.
*   **Integración de Estilos**: Asegurar que el estilo "sutil" del banner realmente se integre con la paleta de colores actual sin necesidad de un cambio de tema más profundo.
*   **Identificación de Componente XLSX**: Confirmar que el botón/funcionalidad de exportación XLSX en `AppDashboardClient.tsx` es fácilmente identificable y que la deshabilitación solo afecta a esta funcionalidad específica.
