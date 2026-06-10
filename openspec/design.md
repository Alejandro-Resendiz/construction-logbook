### Diseño Técnico

**1. Banner App-Wide (MVP)**

*   **Componente**: Se creará un nuevo componente `components/ui/MVPBanner.tsx`.
*   **Contenido**: El texto del banner se obtendrá de las claves de internacionalización.
*   **Renderizado global**: Se integrará el `MVPBanner` en el componente `app/layout.tsx` (o el layout principal que envuelva toda la aplicación) para asegurar que se muestre en todas las páginas. Se utilizará un `div` contenedor para el banner y se añadirá `pb-[altura-del-banner]` al `body` o al contenido principal para evitar que el banner tape parte del contenido.
*   **Estilo**: Se utilizará Tailwind CSS para aplicar los estilos de forma sutil.
    *   Fondo: `bg-gray-200` o un color similar que se integre.
    *   Texto: `text-gray-700` o un color de contraste suave.
    *   Posición: `fixed bottom-0 left-0 w-full z-50 p-2 text-center text-sm`.
    *   Padding: Un `py-2` o `py-3` para que el texto no se vea apretado.
*   **Internacionalización**: 
    *   Archivo: `lib/dictionaries/es.json`.
    *   Clave: `"banner.mvp.message": "Esta aplicación es un Producto Mínimo Viable (MVP). Tu feedback es crucial para su evolución y nos ayuda a construir un producto que realmente necesitas."`

**2. Deshabilitación de Exportación XLSX y Tooltip**

*   **Archivo objetivo**: `app/components/AppDashboardClient.tsx`.
*   **Identificación del elemento**: Necesito leer el contenido de `app/components/AppDashboardClient.tsx` para identificar el botón o la lógica de exportación XLSX.
*   **Lógica de Deshabilitación**: 
    *   Se buscará el botón de exportación (probablemente un `<button>` o un `<a>` con un `onClick` que dispara la exportación).
    *   Se le añadirá la prop `disabled={true}` y se le aplicarán estilos para indicar que está deshabilitado (ej. `opacity-50 cursor-not-allowed`).
    *   Si el componente de botón no tiene una prop `disabled`, se envolverá el botón en un `div` y se le aplicará el tooltip y los estilos de deshabilitación.
*   **Tooltip**: 
    *   Se utilizará un componente de Tooltip si ya existe en la aplicación (ej. de una librería UI como Radix UI, Headless UI, o similar). Si no existe, se implementará un `div` con `relative group` y un `span` con `absolute invisible group-hover:visible` para el tooltip.
    *   El tooltip envolverá el botón de exportación deshabilitado.
*   **Internacionalización**: 
    *   Archivo: `lib/dictionaries/es.json`.
    *   Clave: `"feature.xlsx.premium.tooltip": "La exportación a XLSX es una funcionalidad premium, disponible en futuras actualizaciones para potenciar tu gestión."`
