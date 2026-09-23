&nbsp;

&nbsp;

&nbsp;

1. Vamos a construir una aplicación similar a Adobe Scan  
2. La aplicación debe ser escalable, mantenible y entendible  
3. Que funcione en mi celular iPhone y que a futuro podamos correr en Android  
4. Que pueda escáner documentos y generar archivos PDF  
5. Los archivos los guardará en mi Google Drive  
6. Yo le entregaré la API KEY para acceder a mi Google Drive ó Para interactuar de forma segura con Google Drive, es necesario implementar el flujo de autenticación **OAuth 2.0** mediante la librería oficial de Google para iOS (`GoogleSignIn`). Esto permite gestionar los permisos del usuario de manera segura en lugar de depender únicamente de una API Key, la cual está diseñada principalmente para consultas públicas de lectura.  
7. Y le diré en qué directorio guardar las imágenes, eso sería parte de la configuración inicial  
8. Es importante tener el número de celular desde donde se está escaneando  
9. **Lógica de Directorios en Google Drive:** Antes de subir el archivo PDF, la aplicación debe realizar peticiones a la API de Google Drive para validar la jerarquía:  
   1. Buscar el directorio base configurado.  
   2. Localizar o crear la carpeta correspondiente al número telefónico.  
   3. Verificar si existe la carpeta con el nombre del tipo documental proporcionado por el usuario; si no existe, crearla mediante una solicitud de creación de carpeta (`mimeType: application/vnd.google-apps.folder`) antes de almacenar el archivo final.  
   4. El nombre del archivo debe contener un nombre que le asigna el usuario y la fecha de escaneo

.

&nbsp;

&nbsp;

&nbsp;

&nbsp;