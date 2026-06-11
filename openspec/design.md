### Diseño Técnico: Reposicionamiento del Banner MVP e Implementación del Footer de Marca

**1. Refactorización del Banner MVP (`components/ui/MVPBanner.tsx`)**

* **Cambio de Estilo**: Se cambiará la clase de posicionamiento de `bottom-0` a `top-0`.
* **Ajuste de Layout**: En el componente `RootLayout` (`app/layout.tsx`), se cambiará el padding inferior (`pb-10`) por un padding superior (`pt-10`) para evitar que el banner cubra el contenido superior.

**2. Nuevo Componente: Footer de Marca (`components/ui/Footer.tsx`)**

* **Propósito**: Mostrar la marca, email y LinkedIn de forma elegante y sutil en la parte inferior.
* **Implementación**:
    * Un componente de cliente que recibe los datos de marca mediante props.
    * **Estructura**:
      ```tsx
      <footer className="w-full py-4 px-6 bg-white border-t border-gray-100 text-center text-gray-500 text-sm">
        <p>© 2026 {brandName}. Hecho con ♥ en México.</p>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <a href={`mailto:${email}`} className="hover:text-blue-600 transition-colors">{email}</a>
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">LinkedIn</a>
        </div>
      </footer>
      ```
* **Variables de Entorno**: Se utilizarán las siguientes variables (con prefijo `NEXT_PUBLIC_` para acceso en el cliente):
    * `NEXT_PUBLIC_BRAND_NAME`
    * `NEXT_PUBLIC_BRAND_EMAIL`
    * `NEXT_PUBLIC_BRAND_LINKEDIN`

**3. Integración en `app/layout.tsx`**

* El `MVPBanner` se renderizará al inicio del `body`.
* El `Navbar` se mantendrá debajo del banner.
* Se añadirá el componente `Footer` al final del `body`, después del contenedor principal de contenido.
* El layout utilizará un `flex-col` con `min-h-full` para asegurar que el footer se mantenga siempre al fondo en páginas con poco contenido.

**4. Estrategia de Implementación**

1.  Crear `components/ui/Footer.tsx`.
2.  Modificar `components/ui/MVPBanner.tsx` (cambio de `bottom` a `top`).
3.  Modificar `app/layout.tsx` (cambio de padding y añadir Footer).
4.  Verificar mediante E2E.
