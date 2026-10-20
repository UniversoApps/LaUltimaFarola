# La última farola

Un juego de plataformas 2D para el navegador sobre Lía, una niña de 12 años aprendiz de farolera, y su abuela Alba, que está perdiendo la memoria. Cada farola apagada de la ciudad es un recuerdo de Alba. Lía tiene que volver a encenderlas.

**Jugar:** https://universoapps.github.io/LaUltimaFarola/

## Cómo se juega

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Moverse | ← → o A D | stick izquierdo o cruceta | joystick de la izquierda |
| Saltar (mantener = más alto) | Espacio o Z | A | botón Saltar |
| Chispa (↑ para apuntar arriba) | X o J | X | botón Chispa |
| Impulso | C, K o Shift | B o RB | botón Impulso |
| Bajar de una tabla | ↓ + Espacio | abajo + A | joystick abajo + Saltar |
| Pausa | Esc | Start | botón ❚❚ |

## Instalar en el teléfono

- **Android (Chrome):** abrí el juego y tocá «Instalar en el dispositivo» en el menú, o en el menú del navegador elegí «Instalar app».
- **iPhone / iPad (Safari):** tocá Compartir y elegí «Agregar a inicio».

Una vez instalado funciona sin conexión.

## Historia

| Acto | Lugar | Recuerdo | Habilidad |
|---|---|---|---|
| Prólogo | El puerto | Una noche normal con Alba | Farol |
| 2 | Los tejados | El primer farol | Chispa |
| 3 | El mercado inundado | La gran inundación | Farol de agua |
| 4 | La torre del reloj | El miedo | Atravesar la oscuridad |
| 5 | El faro | La canción | — |

Hay 13 postales escondidas que completan la historia de Alba.

## Accesibilidad

Opciones de velocidad del juego (100/80/60 %), invencibilidad, aceite infinito, sin temblor de pantalla, destellos suaves, botones táctiles grandes y volumen separado de música y efectos. Ninguna bloquea el final ni las postales.

## Técnica

- JavaScript sin dependencias sobre canvas 480×270, escalado en píxeles.
- Física con coyote time, buffer de salto, salto variable, gravedad de caída y corrección de esquinas.
- Iluminación dinámica: la oscuridad solo cae sobre el primer plano; el fondo queda en silueta.
- Música y sonido sintetizados con Web Audio («La canción de Alba», vals original en La menor).
- PWA: manifest + service worker para instalar y jugar sin conexión.

## Publicar en GitHub Pages

Subí todos los archivos a la rama `main` del repositorio y en **Settings → Pages** elegí «Deploy from a branch», rama `main`, carpeta `/ (root)`.

Hecho por UniversoApps.
