# Compilar Xook POS para Android

Ejecuta estos comandos desde la carpeta `frontend`. Hace falta [Android Studio](https://developer.android.com/studio) con el Android SDK.

## 1. Apuntar la app al servidor

En la tablet, `localhost` es el propio aparato. Indica la URL de la API antes de compilar:

```powershell
cd frontend
$env:VITE_API_URL = "http://IP-DEL-SERVIDOR:5080"
npm run build
npx cap sync
```

La API ya acepta el origen `https://localhost`, que es el de la app en Android. El manifiesto permite tráfico HTTP hacia el servidor.

## 2. Abrir el proyecto

```powershell
npx cap open android
```

## 3. APK de prueba

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

El archivo queda en:

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Cópialo a la tablet o al celular e instálalo. Si el sistema lo bloquea, permite instalar apps de esa fuente.

Con el SDK ya instalado también puedes generarlo así:

```powershell
cd android
.\gradlew assembleDebug
```

## 4. APK firmado

En Android Studio: **Build → Generate Signed App Bundle / APK → APK → Create new...**

Guarda el keystore fuera del repositorio, por ejemplo `xook-pos-release.jks`, y anota la contraseña y el alias. Sin ese archivo no se puede actualizar la app conservando la misma firma.

Elige **release**. El APK queda en:

`frontend/android/app/build/outputs/apk/release/`

Cada cambio del frontend se publica repitiendo el build, `npx cap sync` y la generación del APK.
