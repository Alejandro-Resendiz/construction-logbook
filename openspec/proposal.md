### Propuesta: Reposicionamiento del Banner MVP e Implementación del Footer de Marca

**1. Reposicionamiento del Banner MVP**

* **Estado Actual**: El banner está fijo en `bottom-0`.
* **Nuevo Estado**: El banner estará fijo en `top-0`.
* **Implementación**:
    * Actualizar `components/ui/MVPBanner.tsx` para usar `top-0` en lugar de `bottom-0`.
    * Ajustar el layout para asegurar que el banner no se superponga con el `Navbar` o la parte superior del contenido. (Añadir `pt-[altura-del-banner]` al área de contenido principal).

**2. Implementación del Footer de Marca**

* **Requerimiento**: Un nuevo componente `Footer` que contenga el nombre de la marca, el email y el enlace de LinkedIn.
* **Contenido**: `<p>© 2026 [Nombre/Marca]. Hecho con ♥ en México.</p>`
* **Contenido Dinámico (Variables de Entorno)**:
    * `NEXT_PUBLIC_BRAND_NAME`: El nombre/marca a mostrar.
    * `NEXT_PUBLIC_BRAND_EMAIL`: El enlace de email.
    * `NEXT_PUBLIC_BRAND_LINKEDIN`: El enlace de LinkedIn.
* **Implementación**:
    * Crear `components/ui/Footer.tsx`.
    * El footer se renderizará al final del `app/layout.tsx`.
     else que el footer sea sutil y consistente con el diseño de la aplicación.
    * Usar el hook `useTranslation` si alguna parte del texto del footer necesita ser internacionalizada (aunque la solicitud actual es texto fijo en español).

**3. Criterios de Aceptación**

* [ ] El banner MVP es visible en la parte superior de la aplicación.
* [ ] El footer es visible en la parte inferior de la aplicación.
* [ ] El footer muestra el nombre de la marca, el email y el enlace de LinkedIn correctos provenientes de las variables de entorno.
* [ ] El banner no se superpone con el `Navbar`.
* [ ] El footer no se superpone con el contenido.

**Riesgos**

* **Desplazamientos de Layout**: Mover el banner de la parte inferior a la superior puede causar saltos en el contenido o que este quede oculto si el padding no se ajusta correctamente.
* **Disponibilidad de Variables de Entorno**: Asegurar que las variables estén prefijadas con `NEXT_PUBLIC_` para que estén disponibles en el lado del cliente.
