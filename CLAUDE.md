# VoidStation

Juego 2D pixel art que documenta mi homelab. La especificación completa está en
docs/GAME_DESIGN.md: léela antes de cualquier cambio.

## Reglas
- Trabaja solo la fase que te pida (docs/GAME_DESIGN.md §14). No avances fases por tu cuenta.
- Todo dato del homelab sale de content/. Nunca escribas datos del homelab en el código.
- No inventes datos del homelab (nodos, IPs, versiones, servicios, specs). Si falta algo, usa `???` y avísame.
- Nada del entorno laboral entra en este proyecto.
- Sin logos, mascotas ni marcas oficiales en el arte; las criaturas son originales.
- Pixel-perfect: resolución interna 480×270, escalado entero, pixelArt: true, posiciones redondeadas.
- Usa solo la paleta de §9.2.
- Mantén la arquitectura simple: sin ECS, sin backend, sin librerías innecesarias.
- No hagas commits ni pushes a menos que te lo pida.
- Al terminar una fase, resume qué cambió y cómo verificar los criterios de aceptación.
