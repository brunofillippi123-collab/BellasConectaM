# Bellas Conecta — primera pantalla de ingreso (versión de prueba)

## ¿Qué cambió?
Al abrir el sitio solo se muestran **Iniciar sesión** y **Crear cuenta**. El registro solicita nombre, RUT chileno, teléfono, correo y contraseña. Al crear una cuenta, la persona entra a Bellas Conecta; al cerrar sesión vuelve a la pantalla de acceso. Los perfiles registrados en **este mismo navegador** se pueden volver a usar con correo y contraseña. La primera cuenta de prueba del navegador puede consultar la cartera de registros locales.

## Importante acerca de los registros
Este prototipo funciona sin servidor usando el almacenamiento del navegador. **No constituye un registro central ni seguro para clientes reales**, y no sincroniza datos entre equipos. No usar con datos personales reales ni para operaciones comerciales. La seguridad de acceso para usuarios reales y administración privada requiere configurar Supabase o un servicio equivalente con políticas de acceso.

## Publicar actualización en GitHub
1. Descomprime el ZIP en tu computador.
2. En tu repositorio de GitHub entra a **Add file → Upload files** y sube los archivos **de dentro de la carpeta**, no el ZIP.
3. Pulsa **Commit changes** y comprueba que GitHub Pages esté activado en **Settings → Pages**, rama **main**, carpeta **/(root)**.
4. Abre el enlace GitHub Pages de tu cuenta y actualiza con Ctrl+F5 si te aparece una versión antigua. Cierra también otras pestañas de la versión anterior.

No se deben publicar hojas con RUT, teléfonos, contraseñas ni otros datos privados de clientes en GitHub.

**Modo avanzado opcional:** `CONFIGURACION_BASE_DE_DATOS.sql` y `supabase-config.js` son archivos de instalación para configurar más adelante un servicio real. No es necesario configurarlos para probar esta versión local.
