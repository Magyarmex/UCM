# A punto · simulador de nutrición

Simulador educativo en español que suma porciones aproximadas y muestra una caricatura 3D de patrones nutricionales. Las cifras reales, las referencias nutricionales y el Modo absurdo ficticio se mantienen separados.

## Jugar

Abre `index.html` desde un servidor estático. En local:

```powershell
python -m http.server 8765
```

Visita `http://localhost:8765`.

En escritorio, usa el menú, el escenario y los controles de nutrientes en columnas. En móvil vertical, la escena va primero y la página se desplaza de forma normal hacia Comidas y los nutrientes; en horizontal, el menú se acomoda junto al personaje. Toca los controles de porciones para sumar o quitar, mueve las barras para explorar, y usa el selector **Un día / Patrón sostenido** para cambiar el contexto. Los tamaños de toque, el espacio seguro del dispositivo y el movimiento reducido del sistema están contemplados.

**Ver reacción** presenta una actuación no fatal. El **Modo absurdo** ofrece presets teatrales y el botón **Ver desenlace**; no representa dosis letales ni predice una muerte clínica. **Antes / Después** compara las poses sin borrar los controles. La masa cambia solo la forma del personaje; la evolución del patrón es ilustrativa y no un pronóstico.

## Sonido

Pulsa **Activar sonido** para comenzar; al recargar no hay reproducción automática. El control de volumen conserva su preferencia. Pausar la escena, ocultar la pestaña o mostrar **Antes · vivo** silencia y suspende el audio. Los sonidos se sintetizan en el navegador y no requieren archivos externos ni micrófono.

## Publicar en GitHub Pages

Sirve `index.html` junto con el directorio `assets/`. Las rutas de scripts y recursos son relativas, así que funcionan también cuando Pages publica el sitio bajo una subruta de repositorio. No necesita compilación.

## Datos y licencias

Los alimentos y nutrientes son estimaciones; la masa y las actuaciones del personaje no son recomendaciones clínicas. Los ejemplos de referencias y límites están descritos en [science-notes.md](science-notes.md).

El módulo local `assets/three.module.js` es Three.js 0.170.0, distribuido bajo MIT; consulta [THREE-LICENSE.txt](assets/THREE-LICENSE.txt).
