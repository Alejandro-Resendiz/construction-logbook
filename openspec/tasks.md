### Tareas de Implementación (Fase `apply`)

**1. Implementación del Banner App-Wide (MVP)**

*   **1.1 Crear el componente `MVPBanner.tsx`**:
    *   Ruta: `components/ui/MVPBanner.tsx`
    *   Contenido: React component con Tailwind CSS para el estilo y el texto internacionalizado.
    *   Estimación: 30 líneas
*   **1.2 Actualizar el diccionario de internacionalización (`es.json`)**:
    *   Ruta: `lib/dictionaries/es.json`
    *   Añadir clave: `"banner.mvp.message": "Esta aplicación es un Producto Mínimo Viable (MVP). Tu feedback es crucial para su evolución y nos ayuda a construir un producto que realmente necesitas."`
    *   Estimación: 5 líneas
*   **1.3 Integrar `MVPBanner` en el layout principal**:
    *   Ruta: `app/layout.tsx` (o el layout raíz)
    *   Importar y renderizar `MVPBanner` al final del `body`.
    *   Ajustar el `padding-bottom` del `body` o `html` (o un contenedor principal) para acomodar la altura del banner y evitar solapamientos. (Se asumirá una altura de banner de 40px para el `pb-10`).
    *   Estimación: 15 líneas

**2. Deshabilitación de Exportación XLSX y Tooltip**

*   **2.1 Leer `AppDashboardClient.tsx` para identificar el elemento de exportación XLSX**:
    *   Ruta: `app/components/AppDashboardClient.tsx`
    *   Acción: Leer el archivo para ubicar el botón/lógica de exportación.
    *   Estimación: N/A (lectura)
*   **2.2 Actualizar el diccionario de internacionalización (`es.json`)**:
    *   Ruta: `lib/dictionaries/es.json`
    *   Añadir clave: `"feature.xlsx.premium.tooltip": "La exportación a XLSX es una funcionalidad premium, disponible en futuras actualizaciones para potenciar tu gestión."`
    *   Estimación: 5 líneas
*   **2.3 Modificar `AppDashboardClient.tsx`**:
    *   Ruta: `app/components/AppDashboardClient.tsx`
    *   Importar el hook `useDictionary` (si existe) o la función `getDictionary` para acceder al diccionario.
    *   Identificar el botón o elemento de exportación XLSX.
    *   Deshabilitar el botón/elemento (añadir `disabled={true}` y estilos `opacity-50 cursor-not-allowed`).
    *   Implementar un tooltip simple usando Tailwind CSS (`relative group` y `absolute invisible group-hover:visible`) alrededor del botón deshabilitado, mostrando el mensaje internacionalizado.
    *   Estimación: 40 líneas
