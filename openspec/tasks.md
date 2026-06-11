### Tareas de Implementación

**1. Implementación del Footer de Marca**

* **1.1 Crear el componente `Footer.tsx`**:
    * Ruta: `components/ui/Footer.tsx`
    * Contenido: Componente que muestra la marca, email y LinkedIn usando las props.
    * Estimación: 20 líneas
* **1.2 Integrar el `Footer` en el layout principal**:
    * Ruta: `app/layout.tsx`
    * Acción: Renderizar `<Footer ... />` al final del `body`.
    * Estimación: 10 líneas

**2. Reposicionamiento del Banner MVP**

* **2.1 Actualizar el componente `MVPBanner.tsx`**:
    * Ruta: `components/ui/MVPBanner.tsx`
    * Acción: Cambiar la clase de `bottom-0` a `top-0`.
    * Estimación: 5 líneas
* **2.2 Ajustar el padding del layout principal**:
    * Ruta: `app/layout.tsx`
    * Acción: Cambiar `pb-10` por `pt-10` en el `body` (o en el contenedor de contenido).
    * Estimación: 5 líneas

**3. Verificación**

* **3.1 Ejecutar pruebas E2E**:
    * Asegurar que el banner esté arriba y el footer abajo.
    * Verificar que los enlaces del footer funcionan.
    * Asegurar que el contenido no se solapa con el banner.
