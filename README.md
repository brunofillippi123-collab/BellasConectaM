# Bellas Conecta — página pública con pestaña de acceso

## Cambios solicitados

- **La primera pantalla es Inicio**, con productos, servicios, estilistas y precios visibles sin cuenta.
- En la esquina superior aparece una **mini pestaña «👤 Ingresar / Crear cuenta»**. Al tocarla, dentro de la misma aplicación se puede iniciar sesión o crear cuenta con nombre, RUT, teléfono, correo y contraseña.
- Tras registrar una cuenta de prueba, la persona vuelve al Inicio y puede seguir navegando.
- Cuando hay sesión, el botón se transforma en **«👤 Mi cuenta»**, donde puede actualizar datos o cerrar sesión.
- Se mantiene la cartera de clientes para la cuenta administradora de prueba.

## Antes de publicar

Esta versión sigue siendo **un prototipo de prueba**. Sin una base de datos configurada, los usuarios se guardan solo en el navegador donde se registraron. No hay sincronización entre teléfonos y computadores, ni un sistema multiusuario apto para producción. No ingreses datos personales reales hasta activar la base de datos protegida y ajustar las reglas de acceso.

El primer usuario creado en un navegador de prueba se considera administradora *solo en ese navegador*; este mecanismo no es seguro para un negocio real. Las cuentas reales y el acceso administrativo deben configurarse en un servicio seguro como Supabase. El archivo `CONFIGURACION_BASE_DE_DATOS.sql` se incluye como punto de partida para esa integración.

**Para publicar en GitHub Pages:** descomprimir ZIP y subir todos los archivos contenidos en la carpeta a la raíz del repositorio (no el ZIP); reemplazar versiones antiguas y esperar que Pages se actualice. En el navegador refrescar con Ctrl+F5 si no aparecen los cambios.
