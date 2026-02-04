# StreamFlix - Sistema de Películas y Series

Frontend moderno y futurista para gestión de películas y series conectado a PocketBase.

## Características

- Diseño futurista inspirado en Netflix
- Búsqueda en tiempo real
- Sistema de administración protegido por contraseña
- Visualización de películas, series y géneros
- Interfaz completamente responsive
- Conexión directa con PocketBase

## Configuración

### Requisitos Previos

1. PocketBase instalado y ejecutándose en `http://127.0.0.1:8090`
2. Navegador web moderno (Chrome, Firefox, Edge, Safari)

### Instalación

1. Asegúrate de que tu servidor PocketBase esté ejecutándose con las siguientes colecciones:
   - Movies
   - Series
   - Seasons
   - Genres
   - Actors

2. Abre el archivo `index.html` en tu navegador web

3. La contraseña de administrador por defecto es: **admin123**
   - Para cambiarla, edita la variable `ADMIN_PASSWORD` en `app.js`

## Uso

### Navegación

- **Todo**: Muestra todas las películas y series
- **Películas**: Solo películas
- **Series**: Solo series
- **Géneros**: Lista de todos los géneros

### Búsqueda

Usa la barra de búsqueda en la parte superior para buscar por:
- Nombre de película o serie
- Género

### Panel de Administración

1. Haz clic en el botón "Admin" en la esquina superior derecha
2. Ingresa la contraseña de administrador
3. Selecciona el tipo de contenido a agregar:
   - Película
   - Serie
   - Género
   - Actor

## Estructura de Archivos

```
david/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos futuristas
├── app.js          # Lógica de la aplicación
└── README.md       # Este archivo
```

## Tecnologías Utilizadas

- HTML5
- CSS3 (con variables CSS y gradientes)
- JavaScript (ES6+)
- PocketBase SDK
- SVG Icons

## Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --primary-color: #e50914;
    --accent-color: #00d9ff;
    /* ... más variables */
}
```

### Cambiar Contraseña de Admin

Edita en `app.js`:

```javascript
const ADMIN_PASSWORD = 'tu_nueva_contraseña';
```

### Cambiar URL de PocketBase

Si tu PocketBase está en otra URL, edita en `app.js`:

```javascript
const pb = new PocketBase('http://tu-url-aqui:8090');
```

## Características Futuras (Pendientes)

- [ ] Subida de imágenes de portadas
- [ ] Sistema de usuarios y favoritos
- [ ] Reproductor de video integrado
- [ ] Calificaciones y reseñas
- [ ] Modo oscuro/claro
- [ ] Internacionalización

## Soporte

Para problemas o preguntas, verifica:
1. Que PocketBase esté ejecutándose correctamente
2. Que las colecciones estén creadas en PocketBase
3. La consola del navegador para errores

## Licencia

Proyecto de código abierto para uso educativo y personal.
