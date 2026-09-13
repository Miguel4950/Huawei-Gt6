# 🚀 Guía de Despliegue 100% en la Nube (Gratis, Seguro y 24/7)

Este bot está diseñado para funcionar de manera **autónoma, 24 horas al día, 7 días a la semana**, sin depender de tu computadora y **sin exponer jamás tus credenciales**.

---

## 🔒 Regla de Oro de Seguridad

1. Tu archivo [.gitignore](file:///.gitignore) ya está configurado para **bloquear** la subida de:
   * `vertex_key.json` (credencial de Google Cloud).
   * `.env` (donde está tu token de Telegram).
   * `health_data/` (tus registros médicos personales).
2. Crea tu repositorio en GitHub como **PRIVADO (Private)**.

---

## 🌟 Opción 1: Render (Recomendada — 100% Gratuito y Fácil)

Render ofrece alojamiento gratuito para servicios web con Node.js y Docker.

### Pasos:
1. Crea un repositorio **Privado** en **GitHub** y sube el código (gracias a `.gitignore`, tus claves NO se subirán).
2. Entra en [Render.com](https://render.com) e inicia sesión con GitHub.
3. Haz clic en **New +** ➔ **Web Service**.
4. Conecta tu repositorio de GitHub.
5. Configura los parámetros básicos:
   * **Runtime:** Node
   * **Build Command:** `npm install`
   * **Start Command:** `node index.js`
   * **Instance Type:** Free ($0/mes)
6. **Configurar el Token de Telegram:**
   * En la pestaña **Environment Variables**, añade:
     * `TELEGRAM_BOT_TOKEN` = *(Pega tu token de Telegram)*
     * `GOOGLE_CLOUD_PROJECT` = `inteligencia-508502`
     * `GOOGLE_CLOUD_LOCATION` = `global`
     * `GEMINI_MODEL_ID` = `gemini-3.8-flash`
     * `THINKING_LEVEL` = `MEDIUM`
7. **Configurar la Clave de Vertex AI (`vertex_key.json`):**
   * En el menú lateral de tu servicio en Render, ve a la sección **Secret Files** (Archivos Secretos).
   * Haz clic en **Add Secret File**.
   * **Filename:** `vertex_key.json`
   * **Contents:** Abre tu archivo local `vertex_key.json` con el bloc de notas, copia todo el texto y pégalo allí.
8. Haz clic en **Deploy Web Service**. ¡Listo! El bot arrancará en la nube inmediatamente y responderá en Telegram.

---

## ⚡ Opción 2: Google Cloud Run (En tu mismo Proyecto `inteligencia-508502`)

Dado que ya tienes tu proyecto de Google Cloud con `vertex_key.json`, puedes desplegar el contenedor directamente en **Google Cloud Run**, el cual ofrece **2 millones de peticiones gratuitas al mes** de por vida.

### Pasos con Google Cloud SDK:
```bash
gcloud run deploy analista-salud-bot \
  --source . \
  --project inteligencia-508502 \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars TELEGRAM_BOT_TOKEN="TU_TOKEN_AQUI",GEMINI_MODEL_ID="gemini-3.8-flash",THINKING_LEVEL="MEDIUM"
```

---

## 🛡️ ¿Cómo se mantiene activo 24/7 sin dormirse?

El bot incluye un servidor HTTP ligero interno que responde en el endpoint `/health` (puerto `8080`).  
Plataformas como Render o Cloud Run verifican este endpoint continuamente para garantizar que el bot nunca se caiga y reiniciarlo automáticamente si ocurriera alguna desconexión de red.
