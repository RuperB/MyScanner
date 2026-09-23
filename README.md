# 📱 MyScanner Mobile (iOS & Android)

Aplicación móvil inteligente tipo **Adobe Scan** construida con **React Native + Expo**, diseñada para escanear documentos físicos, mejorar su legibilidad con filtros optimizados, ensamblarlos en **PDF multipágina** y sincronizarlos automáticamente con **Google Drive** bajo una jerarquía de carpetas dinámica.

---

## 🎯 Requisitos Implementados (según `MyScanner.MD`)

1. **Similar a Adobe Scan:** Interfaz con marco guía, captura continua multipágina, rotación 90°, filtros de legibilidad (Mejorado, Blanco y Negro Texto, Escala de Grises, Color Original).
2. **Escalable, mantenible y tipada:** Arquitectura modular basada en TypeScript, con separación estricta entre servicios, contexto, componentes y pantallas.
3. **Multiplataforma:** Optimizado para **iPhone (iOS)** y listo para **Android**.
4. **Escáner y Generación de PDF:** Motor nativo con `pdf-lib` para compresión y ensamble directo de documentos en el dispositivo.
5. **Sincronización con Google Drive:** Integración con Google Drive REST API v3.
6. **Autenticación Segura (OAuth 2.0):** Conexión segura con scopes delimitados (`drive.file`).
7. **Directorio Base Configurable:** Parámetro inicial en Ajustes para definir la carpeta raíz en Drive.
8. **Identificación por Celular:** Registro del número de teléfono del escáner en la configuración del dispositivo.
9. **Jerarquía Dinámica en Google Drive:**
   ```text
   Google Drive (Mi Unidad)
   └── 📁 [Directorio Base]            (Ej: "MyScanner_Documents" o "Mis Escaneos")
       └── 📁 [Número Celular]         (Ej: "+573001234567")
           └── 📁 [Tipo Documental]    (Ej: "Facturas", "Contratos", "Cédulas")
               └── 📄 [Nombre]_[Fecha_Hora].pdf
   ```
   *La app verifica automáticamente cada nivel y crea las carpetas que no existan (`mimeType: application/vnd.google-apps.folder`) antes de subir el archivo.*

---

## 🚀 Cómo Ejecutar y Probar en tu iPhone

### Paso 1: Instalar Expo Go en tu iPhone
Descarga la app gratuita **Expo Go** desde la App Store en tu iPhone:
👉 [Expo Go en App Store](https://apps.apple.com/app/expo-go/id982107779)

### Paso 2: Iniciar el Servidor de Desarrollo
En la terminal de este proyecto en tu PC, ejecuta:
```bash
npm start
```
o
```bash
npx expo start
```

### Paso 3: Abrir en tu iPhone
1. Abre la **Cámara** de tu iPhone.
2. Apunta al **código QR** que aparece en la terminal de tu PC.
3. Toca la notificación emergente *"Abrir en Expo Go"*.
4. ¡La aplicación cargará en tiempo real en tu teléfono!

---

## 🔑 Configuración de Google Drive (OAuth 2.0)

Para conectar tu cuenta de Google Drive con la aplicación:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto (por ejemplo: `MyScanner`).
3. En **APIs y Servicios** > **Biblioteca**, busca y habilita **Google Drive API**.
4. En **Pantalla de Consentimiento de OAuth**, añade el scope:
   - `https://www.googleapis.com/auth/drive.file`
5. En la sección **Ajustes** de la app móvil MyScanner:
   - Ingresa tu **Número Celular**.
   - Ingresa el **Nombre del Directorio Base** en Drive.
   - Vincula tu cuenta mediante el botón de Google / Token OAuth.

---

## 📂 Estructura del Código

```text
src/
├── components/          # CameraOverlay, DriveHierarchyVisualizer, UIComponents
├── constants/           # theme.ts, docTypes.ts
├── context/             # AppContext.tsx (Estado global, ajustes, historial, sesión)
├── navigation/          # RootNavigator.tsx (Pestañas inferiores y Flujo de escaneo)
├── screens/
│   ├── ScannerScreen.tsx          # Cámara y captura multipágina
│   ├── ReviewCropScreen.tsx       # Filtros (B&N, Gris, Color), rotación y reordenar
│   ├── DocumentMetaScreen.tsx     # Título, teléfono, tipo documental y preview Drive
│   ├── UploadProgressScreen.tsx   # Validación paso a paso de carpetas y subida PDF
│   ├── HistoryScreen.tsx          # Historial con búsqueda, reenvío y compartir
│   └── SettingsScreen.tsx         # Configuración del escáner y cuenta Google
├── services/
│   ├── googleDriveService.ts      # Resolución de jerarquía 3 niveles y subida multipart
│   ├── googleAuthService.ts       # OAuth 2.0 y perfil de Google
│   ├── pdfService.ts              # Generación de PDF multipágina con pdf-lib
│   ├── imageProcessorService.ts   # Rotación, compresión y optimización de imagen
│   └── storageService.ts          # Persistencia local con AsyncStorage
└── types/                         # Interfaces TypeScript
```
