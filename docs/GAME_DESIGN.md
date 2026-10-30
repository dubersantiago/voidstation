# VOIDSTATION — Documento de diseño y especificación técnica

> Documentación del homelab presentada como un juego 2D en pixel art.
> Este archivo es la especificación que Claude Code debe seguir para construir el proyecto.
> Guardarlo en el repo como `docs/GAME_DESIGN.md` y referenciarlo desde `CLAUDE.md` (ver §17).

---

## 0. Cómo usar este documento con Claude Code

1. Crear el repo vacío `voidstation/` y copiar este archivo a `docs/GAME_DESIGN.md`.
2. Crear `CLAUDE.md` con el contenido de la §17.
3. Trabajar **por fases** (§14). Una fase por sesión/prompt. No pedir "haz todo el juego".
4. Al terminar cada fase, revisar los criterios de aceptación antes de pasar a la siguiente.
5. Completar la checklist de datos pendientes (§16) a medida que se construye el bestiario.

---

## 1. Concepto

**VoidStation** es una estación espacial abandonada a la deriva. La IA de la estación, *el Registro*, perdió su índice: sabe que la estación está habitada por criaturas, pero ya no sabe qué son ni qué hacen.

El jugador es un **fotógrafo de campo** enviado a catalogar la fauna. Cada fotografía restaura una entrada del índice. Al completar el censo, el Registro reactiva la **baliza** de la estación.

Cada criatura representa un componente real del homelab. Cada ficha del bestiario es, en la práctica, una página de documentación.

| Juego | Homelab |
|---|---|
| La estación | El homelab completo |
| Sectores de la estación | Capas de la infraestructura (red, virtualización, cluster, automatización, servicios) |
| Criaturas | Componentes (nodos, herramientas, servicios) |
| Fotografiar una criatura | Desbloquear su documentación |
| Bestiario | Índice de la documentación |
| Terminales/registros | Decisiones de arquitectura, notas, comandos |
| Señales no identificadas | Componentes planeados o no confirmados |

**Tono:** soledad, curiosidad, algo inquietante pero no terror. Las criaturas no atacan; algunas huyen o se esconden. Inspiración de sensación (no de estética copiada): exploración silenciosa, bioluminiscencia en la oscuridad, maquinaria orgánica.

---

## 2. Reglas de contenido (obligatorias)

1. **Fuente de verdad:** todo dato del homelab vive en `content/bestiario/*.md` y `content/registros/*.md`. El código nunca contiene datos del homelab escritos a mano.
2. **No inventar:** si un dato no está en `content/`, se muestra como `???` en el juego. Claude Code no debe completar nombres de nodos, IPs, versiones, specs ni servicios por su cuenta.
3. **Estados:** cada criatura tiene un `estado`:
   - `confirmado` → criatura normal, fotografiable, cuenta para el objetivo.
   - `en_construccion` → criatura visible pero "incompleta" (crisálida, dormida, despertando). Fotografiable, marcada como en construcción.
   - `planeado` → solo aparece como **señal no identificada** (silueta + interferencia). No cuenta para el objetivo.
4. **Solo homelab:** nada del entorno laboral entra en este proyecto.
5. **Público vs privado:** cada dato puede marcarse `publico: false`. Los datos privados no se incluyen en el build público (ver §13).
6. **Sin logos ni mascotas oficiales:** las criaturas son diseños originales. No usar logos, mascotas ni marcas de Proxmox, Kubernetes, Talos, Docker, Jenkins, Argo, Helm, Cloudflare, Tailscale, MySQL, Minecraft, etc. Tampoco criaturas que se parezcan a mobs de Minecraft. El nombre del componente sí puede aparecer como texto en la ficha.

---

## 3. Objetivo y bucle de juego

**Objetivo principal:** fotografiar todas las criaturas con `estado: confirmado` (cada individuo cuenta). El total se calcula automáticamente desde `content/`, nunca se escribe a mano. HUD: `ÍNDICE RESTAURADO 7 / 14`.

**Bucle:**

```
Explorar sector → detectar criatura (sonido / brillo / radar)
      ↓
Acercarse sin espantarla → modo cámara → foto
      ↓
Puntuación 1–3 ★ → se desbloquea la ficha hasta ese nivel
      ↓
Fotos acumuladas abren compuertas a nuevos sectores
      ↓
Censo completo → reactivar baliza → pantalla final
```

**Progresión por compuertas:** cada sector define `fotos_requeridas` para abrir el siguiente. Valores en `content/sectores.yaml`.

**Logros (opcionales, fase 6):**
- **Quórum** — fotografiar a las 3 Reinas Centinela en una sola foto durante su pulso sincronizado.
- **Censo completo** — todas las criaturas confirmadas fotografiadas.
- **Fotógrafo del vacío** — todas las criaturas con 3 ★.

---

## 4. Mecánica de fotografía

**Modo cámara:** el jugador entra en modo cámara (tecla/clic derecho). Aparece un visor con marco central, la velocidad de movimiento baja a la mitad y el ruido de pasos se reduce.

**Puntuación de cada foto:**

| Criterio | Condición | Efecto |
|---|---|---|
| Encuadre | ≥ 60 % del hitbox de la criatura dentro del marco central | Requisito para que la foto cuente (1 ★) |
| Distancia + luz | Dentro del rango ideal de la criatura **y** iluminada (linterna o luz propia) | +1 ★ |
| Momento | La criatura está en su **estado fotogénico** (§6) | +1 ★ |

**Niveles de ficha:**
- ★ — nombre, especie, componente real, rol.
- ★★ — cómo encaja en el homelab, relación con otras criaturas, configuración relevante.
- ★★★ — comandos útiles, notas, decisiones, registro de lore.

**Álbum:** guarda la mejor foto de cada criatura como miniatura pequeña (máx. 160×90) capturada del canvas real. Persistencia en `localStorage` con `try/catch` (si falla, el juego sigue sin guardar).

**Reglas de comportamiento ante el jugador:** algunas criaturas huyen si el jugador corre cerca (radio `huida`), lo que premia acercarse despacio en modo cámara.

---

## 5. Mapa: sectores de la estación

```
                    ┌───────────────────────┐
                    │   MUELLE DE ATRAQUE   │  Red y acceso externo
                    └───────────┬───────────┘
                                │
┌───────────────────┐   ┌───────┴────────┐   ┌────────────────────┐
│  SALA DE ARCHIVOS │───│   FUNDICIÓN    │───│  BAHÍA DE TITANES  │
│  Repos, registros │   │  IaC + CI/CD   │   │  Virtualización    │
└───────────────────┘   └───────┬────────┘   └─────────┬──────────┘
                                │                      │
                        ┌───────┴────────┐   ┌─────────┴──────────┐
                        │    BÓVEDAS     │   │     LA COLMENA     │
                        │   VMs/servicios│   │  Cluster Kubernetes│
                        └────────────────┘   └────────────────────┘
```

| Sector | Capa del homelab | Ambiente visual |
|---|---|---|
| **Muelle de Atraque** | Acceso externo y red (túnel Cloudflare, Tailscale, Docker Hub) | Hangar enorme, ventanales al espacio, compuertas de esclusa, luces de pista ámbar |
| **Bahía de Titanes** | Proxmox (nodos físicos) | Bahía de carga cavernosa, cadenas, grúas, respiración pesada de los titanes |
| **La Colmena** | Cluster Kubernetes sobre Talos, GitOps, Helm | Estructura orgánica de cera/resina ámbar creciendo sobre metal, bioluminiscencia |
| **Fundición** | Terraform, Jenkins, Ansible | Taller industrial, planos holográficos, brazos mecánicos, chispas |
| **Bóvedas** | VMs de servicios (base de datos, Minecraft) | Cámaras selladas, criogenia, estanterías infinitas |
| **Sala de Archivos** | Repos de GitHub, decisiones de arquitectura | Biblioteca de datos, monolitos con texto, terminales legibles |

**Relación visual clave:** La Colmena crece pegada a la Bahía de Titanes, porque los nodos de Talos son VMs que corren sobre Proxmox. Los titanes cargan crisálidas en el lomo (VMs); algunas son las celdas de la colmena.

---

## 6. Bestiario

Diseños originales. Todos los tamaños en píxeles a resolución interna (§9).

### 6.1 Resumen

| # | Criatura | Especie (lore) | Componente | Sector | Individuos | Estado |
|---|---|---|---|---|---|---|
| 1 | Titán de Carga | *Titanus hypervisor* | Nodo Proxmox | Bahía de Titanes | 3 (2 + 1 despertando) | 2 confirmado, 1 en_construccion |
| 2 | Reina Centinela | *Formica immutabilis regina* | Talos — control plane | La Colmena | 3 | confirmado* |
| 3 | Obrera Inmutable | *Formica immutabilis* | Talos — worker | La Colmena | 3 | confirmado* |
| 4 | Medusa Sincronizadora | *Aurelia concordans* | ArgoCD | La Colmena | 1 | en_construccion |
| 5 | Cangrejo Ermitaño de Carga | *Paguroidea chartae* | Helm | La Colmena | varios (1 especie) | en_construccion |
| 6 | La Arquitecta | *Textrix declarativa* | Terraform | Fundición | 1 | confirmado |
| 7 | Vigía de Compuerta | *Ianitor pipelinae* | Jenkins (pipeline con aprobación manual) | Fundición | 1 | confirmado |
| 8 | Simbiontes | *Symbiotica configurans* | Ansible | Fundición | enjambre (1 especie) | en_construccion |
| 9 | Gusano de Túnel | *Vermis tunelaris* | Cloudflare Tunnel (LXC) | Muelle | 1 | confirmado |
| 10 | Polilla de Fase | *Phalaena reticulata* | Tailscale (LXC) | Muelle | 1 | confirmado |
| 11 | El Archivista | *Custos memoriae* | VM de base de datos (MySQL, Debian 13) | Bóvedas | 1 | confirmado / verificar |
| 12 | Criatura Cúbica | *Cubozoa ludens* | VM de servidor Minecraft (Debian 13) | Bóvedas | 1 | confirmado / verificar |
| — | Nave de Suministros | — | Docker Hub (externo) | Muelle (evento) | — | evento, no criatura |
| — | Monolitos Gemelos | — | Repo de infraestructura + repo GitOps | Sala de Archivos | — | objetos legibles |

\* Verificar antes del primer build que los 3 CP + 3 workers ya están unidos al cluster (ver §16).

### 6.2 Fichas de diseño

Cada ficha define: aspecto, comportamiento, estado fotogénico y metáfora. El contenido técnico de la documentación va en `content/bestiario/<id>.md`, no aquí.

#### 1. Titán de Carga — Nodo Proxmox
- **Aspecto:** bestia colosal, cuadrúpeda y lenta, con caparazón de placas metálicas fusionadas con piel. Sobre el lomo carga **crisálidas** translúcidas (cada una = una VM). Ojos pequeños con brillo tenue. Sprite 160×128, dividido en partes (cuerpo, patas, crisálidas) para animar.
- **Comportamiento:** casi inmóvil; respiración (idle de 8 frames), cambia el peso de pata cada cierto tiempo. No huye.
- **Estado fotogénico:** una crisálida del lomo se ilumina (una VM arrancando).
- **Metáfora:** el hipervisor sostiene a las VMs; las celdas de La Colmena cuelgan de los titanes.
- **El tercer titán:** está **despertando** dentro de una cápsula de contención con cables conectándose (estado `en_construccion`: el nodo se está agregando al cluster de Proxmox).
- **Datos:** número de crisálidas por titán = número de VMs en ese nodo, leído desde `content/`. Si no se conoce, no se dibujan crisálidas extra.

#### 2. Reina Centinela — Talos control plane
- **Aspecto:** insecto grande y erguido (48×48), exoesqueleto ámbar con vetas cristalinas, antenas largas que emiten pulsos de luz. Sin aberturas visibles en el caparazón (Talos no tiene SSH ni shell).
- **Comportamiento:** permanece en su cámara de la colmena; gira hacia el jugador si se acerca demasiado.
- **Estado fotogénico:** **pulso sincronizado** — las 3 reinas emiten un pulso de luz a la vez cada ~20 s (consenso del control plane). Una sola foto con las 3 en pulso = logro *Quórum*.
- **Elemento ambiental:** en el centro de la colmena hay un **Núcleo Resonante** al que apuntan las tres reinas (la VIP del control plane). Su dirección IP solo se muestra si está marcada como pública.

#### 3. Obrera Inmutable — Talos worker
- **Aspecto:** insecto pequeño (24×24), mismo exoesqueleto ámbar, carga cápsulas brillantes (pods/contenedores) entre las mandíbulas.
- **Comportamiento:** enjambre ligero (boids simplificado) entre las celdas; huyen si el jugador corre cerca.
- **Estado fotogénico:** depositando una cápsula en una celda.
- **Detalle de lore:** las obreras son idénticas e intercambiables; ninguna puede ser modificada desde dentro (sistema inmutable, configuración solo por API).

#### 4. Medusa Sincronizadora — ArgoCD
- **Aspecto:** medusa flotante (48×64) translúcida con filamentos que se conectan a un conducto que viene de la Sala de Archivos (el repo GitOps). No usar pulpo ni nada que recuerde la mascota oficial.
- **Comportamiento:** flota sobre La Colmena; deriva lenta.
- **Estado fotogénico:** pulso de sincronización — la luz recorre los filamentos desde el conducto hacia la colmena.
- **Estado:** `en_construccion` — elegida como herramienta GitOps, instalación por confirmar.

#### 5. Cangrejo Ermitaño de Carga — Helm
- **Aspecto:** cangrejos (32×24) que cargan **conchas-contenedor** con etiquetas grabadas (charts). Cada concha tiene un número de versión pintado.
- **Comportamiento:** caminan de lado transportando conchas hacia las celdas.
- **Estado fotogénico:** cambiando de concha (actualización de release).
- **Estado:** `en_construccion` hasta que haya charts desplegados reales.

#### 6. La Arquitecta — Terraform
- **Aspecto:** criatura aracnoide (64×64) con patas finas como compases; teje estructuras siguiendo planos holográficos proyectados sobre una mesa.
- **Comportamiento:** teje en su taller; el capullo que teje tiene la forma de una crisálida de titán (crea las VMs).
- **Estado fotogénico:** el plano holográfico muestra el "diff" (líneas verdes/rojas) antes de tejer — el `plan`.
- **Detalle:** junto a su mesa hay un frasco sellado con una **glándula de configuración** (el `.tfvars`), que no se muestra abierto.

#### 7. Vigía de Compuerta — Jenkins
- **Aspecto:** criatura sésil fusionada con una gran compuerta (64×96), un ojo grande central y brazos mecánicos. Diseño original, nada de mayordomos.
- **Comportamiento:** observa la cinta transportadora que va de la Arquitecta hacia la Bahía de Titanes. Los paquetes se detienen frente a ella.
- **Estado fotogénico:** el ojo pasa de ámbar a verde cuando se acciona la palanca de aprobación.
- **Mini-interacción (fase 6, opcional):** el jugador ve la secuencia `init → validate → plan → [esperando aprobación]` en un panel y puede tirar de la palanca *Aprobar* o *Abortar*. Puramente visual, no conecta con nada real.

#### 8. Simbiontes — Ansible
- **Aspecto:** pequeñas criaturas filamentosas (16×16) en enjambre, que se adhieren a las crisálidas recién tejidas.
- **Comportamiento:** esperan cerca de la Arquitecta; cuando sale una crisálida nueva, se adhieren a ella.
- **Estado fotogénico:** enjambre adherido a una crisálida, brillando.
- **Estado:** `en_construccion` — playbooks aún en definición.

#### 9. Gusano de Túnel — Cloudflare Tunnel (LXC)
- **Aspecto:** gusano gigantesco cuyo cuerpo atraviesa el casco de la estación hacia el exterior; solo se ve un segmento (≈256 px de ancho) y la boca, que es un túnel con luz al fondo.
- **Comportamiento:** ondula lentamente; ocasionalmente algo viaja por dentro de su cuerpo (luz que recorre los segmentos).
- **Estado fotogénico:** un pulso de luz viajando por el cuerpo hacia el exterior.
- **Lore:** la estación no tiene puertas al exterior; el gusano es la única vía por la que el mundo exterior llega a ciertos lugares (p. ej. la Fundición).

#### 10. Polilla de Fase — Tailscale (LXC)
- **Aspecto:** polilla (32×32) con alas que muestran un patrón de malla brillante.
- **Comportamiento:** revolotea cerca de una ventana; a veces desaparece y reaparece en otro punto (atraviesa el espacio).
- **Estado fotogénico:** en pleno "salto de fase" (frames de desvanecimiento).
- **Lore:** un acceso privado y personal; solo deja pasar a quien conoce.

#### 11. El Archivista — VM de base de datos (MySQL)
- **Aspecto:** criatura sedentaria (64×64), mezcla de caracol y biblioteca: su concha está llena de cajones y fichas.
- **Comportamiento:** casi inmóvil; abre y cierra cajones.
- **Estado fotogénico:** sacando una ficha de un cajón.

#### 12. Criatura Cúbica — VM de servidor Minecraft
- **Aspecto:** criatura juguetona hecha de bloques voxel translúcidos (32×32) que se reorganizan. **Original:** no puede parecerse a ningún mob de Minecraft (ni creeper, ni enderman, ni slime, etc.).
- **Comportamiento:** salta entre bloques flotantes, construye pequeñas formas.
- **Estado fotogénico:** terminando una construcción.

#### Evento — Nave de Suministros (Docker Hub)
- Nave externa que atraca periódicamente en el Muelle y descarga contenedores. No es fotografiable como criatura; tiene una terminal con su ficha (registro de imágenes externo, no hay registro privado propio).

#### Objetos — Monolitos Gemelos (repos)
- Dos monolitos en la Sala de Archivos: **Infraestructura** (Terraform, Ansible) y **GitOps** (Kubernetes/Helm). Se leen, no se fotografían. Un conducto de luz une el monolito GitOps con la Medusa.
- El nombre exacto del repo solo aparece si está marcado `publico: true`.

---

## 7. Señales no identificadas

Componentes `planeado` o no confirmados. En el juego aparecen como **siluetas con interferencia** y el texto `SEÑAL NO IDENTIFICADA`. Al acercarse, el Registro dice algo como *"Firma desconocida. Sin datos."* No cuentan para el objetivo.

Candidatos actuales (no decididos):
- Ingress del cluster.
- Observabilidad (métricas/logs).
- Gestión de secretos (p. ej. Vault en contenedor — evaluado, sin decidir).
- Router dedicado / subred propia del homelab.
- Balanceador de servicios para el cluster Talos.

Cuando una se confirme: cambiar su `estado` en `content/` y, si hace falta, añadir el sprite. Nada más.

---

## 8. Modelo de datos

### 8.1 Una criatura = un archivo Markdown con frontmatter

`content/bestiario/talos-obrera.md`:

```markdown
---
id: talos-obrera
nombre: Obrera Inmutable
especie: Formica immutabilis
componente: Talos Linux — nodo worker
sector: colmena
estado: confirmado            # confirmado | en_construccion | planeado
individuos: 3
sprite: talos-obrera          # clave del spritesheet
hitbox: [20, 16]
comportamiento: enjambre      # ver §8.3
estado_fotogenico: cargando
rango_ideal: [32, 96]         # distancia en px para la ★ de distancia
radio_huida: 48               # 0 = no huye
host: ???                     # nodo Proxmox donde corre; ??? hasta confirmar
relaciones: [talos-reina, titan-proxmox]
publico: true
---

## ★
Nodo worker del cluster Kubernetes del homelab. Ejecuta las cargas de trabajo.

## ★★
Corre como VM sobre Proxmox. Sistema inmutable: sin SSH, se gestiona solo por API.

## ★★★
<!-- comandos, notas, decisiones -->

## Registro
> "Llevan cápsulas que no abren. Nunca se detienen."
```

El juego divide el cuerpo por los encabezados `## ★`, `## ★★`, `## ★★★` y muestra solo los niveles desbloqueados. La sección `## Registro` es lore y siempre es visible tras la primera foto.

Datos privados dentro del cuerpo se marcan con un bloque:

```markdown
<!-- privado -->
VIP del control plane: …
<!-- /privado -->
```

En el build público estos bloques se eliminan.

### 8.2 Sectores

`content/sectores.yaml`:

```yaml
- id: muelle
  nombre: Muelle de Atraque
  mapa: muelle.tmj
  fotos_requeridas: 0
- id: fundicion
  nombre: Fundición
  mapa: fundicion.tmj
  fotos_requeridas: 2
# …
```

### 8.3 Catálogo de comportamientos

Implementar como funciones reutilizables, no una clase por criatura:

| Comportamiento | Descripción |
|---|---|
| `inmovil` | Solo animación idle. |
| `deambular` | Camina a puntos aleatorios dentro de su zona. |
| `enjambre` | Boids simplificado (separación + cohesión) dentro de su zona. |
| `flotar` | Movimiento senoidal lento. |
| `patrulla` | Recorre puntos definidos en el mapa (Tiled). |
| `fase` | Desaparece y reaparece en puntos definidos. |
| `dormido` | Variante `en_construccion`: idle lento, sin estado fotogénico salvo el "despertar". |

Cada criatura alterna aleatoriamente entre su comportamiento base y su `estado_fotogenico` (duración y frecuencia configurables).

### 8.4 Validación

Script `npm run validate-content` que falla si:
- falta un campo obligatorio;
- un `sprite` no existe en los assets (avisa y usa placeholder);
- un `sector` no existe en `sectores.yaml`;
- una `relacion` apunta a un `id` inexistente.

---

## 9. Dirección de arte — pixel art

### 9.1 Resolución y escalado
- **Resolución interna:** 480×270 (16:9). Escala entera ×2, ×3, ×4 (1920×1080 en ×4). Letterbox si la ventana no coincide.
- `pixelArt: true`, `roundPixels: true`, sin antialiasing, sin escalado fraccionario.
- **Tiles:** 16×16.
- Cámara con seguimiento suave pero posición final redondeada a píxel entero.

### 9.2 Paleta (máx. 24 colores)

| Grupo | Colores |
|---|---|
| Vacío / fondos | `#07070d` `#0d0f1a` `#151a2b` `#1f2740` `#2c3a56` |
| Metal | `#3b4a63` `#56677f` `#7d8ca3` `#a9b5c6` |
| Óxido | `#3a1f1d` `#6b2f24` `#a14a2b` `#d0773a` |
| Bioluminiscencia | `#0f3d3a` `#1f7a6c` `#3fd1b0` `#a6ffe4` |
| Colmena (ámbar) | `#4a2a12` `#8a5a1c` `#e0a43a` `#ffe08a` |
| Alerta | `#7a1022` `#d9304a` |
| Texto UI | `#e8e4d8` |

Regla: los entornos usan vacío/metal/óxido; **solo las criaturas y luces importantes** usan bioluminiscencia y ámbar, para que destaquen en la oscuridad.

### 9.3 Tamaños de sprites

| Elemento | Tamaño |
|---|---|
| Jugador | 16×24 |
| Simbionte | 16×16 |
| Obrera | 24×24 |
| Cangrejo | 32×24 |
| Polilla, Criatura Cúbica | 32×32 |
| Reina | 48×48 |
| Medusa | 48×64 |
| Arquitecta, Archivista | 64×64 |
| Vigía de Compuerta | 64×96 |
| Titán | 160×128 (por partes) |
| Gusano (segmento visible) | ~256×96 |

### 9.4 Animaciones mínimas por criatura
`idle` (4–8 frames), `mover` (si se mueve, 6–8 frames), `fotogenico` (6–12 frames), `huir` (si aplica). Jugador: `idle`, `caminar` ×4 direcciones, `camara`.

### 9.5 Iluminación
- Capa de oscuridad a pantalla completa (RenderTexture) sobre la escena.
- Se "borran" huecos de luz con texturas radiales **con bordes en dithering** (no gradientes suaves) para mantener el look pixel art.
- Fuentes de luz: cono de linterna del jugador, luz propia de criaturas bioluminiscentes, luces de emergencia parpadeantes.
- Fondo con parallax de espacio visible a través de ventanales.

### 9.6 UI
- Marcos de UI con borde de 1 px, estilo terminal de la estación.
- Visor de cámara: esquinas de encuadre, retícula, indicador de distancia (barra) e indicador de luz.
- Tipografía: fuente pixel **con soporte de tildes y ñ**. Verificar licencia antes de incluirla (créditos en `CREDITS.md`).

### 9.7 Producción de arte (realista)
- Claude Code puede generar **placeholders** (rectángulos con colores de la paleta y el nombre de la criatura, o sprites simples generados por código) con los tamaños exactos de §9.3.
- El pixel art **detallado** se hace a mano en Aseprite, LibreSprite o Pixelorama (disponibles en Linux), exportando spritesheet + JSON. Como los placeholders tienen las mismas claves y tamaños, el reemplazo no requiere tocar código.
- Si se usan packs de assets de terceros, solo con licencia compatible y registrados en `CREDITS.md`.

---

## 10. Audio (fase 6, opcional)
- Ambiente: zumbido grave de la estación, crujidos metálicos, goteo.
- Cada criatura tiene un sonido de presencia que se escucha antes de verla (pista para encontrarla).
- Obturador de cámara, sonido de "índice restaurado".
- Todo el audio con licencia verificada y listado en `CREDITS.md`. Botón de silencio siempre visible.

---

## 11. Stack técnico y estructura

**Stack (mantenerlo simple):**
- **Phaser** (última versión estable; verificar al iniciar si conviene la 3.x o la 4) + **TypeScript** + **Vite**.
- **Tiled** para los mapas (exportar `.tmj`).
- Contenido Markdown con frontmatter, procesado en build (`gray-matter` + un renderizador Markdown).
- Fichas del bestiario como **overlay HTML/CSS** sobre el canvas (texto seleccionable, comandos copiables, accesible), estilizadas como terminal pixel.
- Sin backend, sin base de datos, sin ECS. Sitio estático.

**Estructura:**

```
voidstation/
├── CLAUDE.md
├── CREDITS.md
├── docs/
│   └── GAME_DESIGN.md          # este documento
├── content/
│   ├── bestiario/*.md          # una criatura por archivo
│   ├── registros/*.md          # terminales: decisiones, notas
│   └── sectores.yaml
├── public/assets/
│   ├── sprites/                # spritesheets + JSON
│   ├── tilesets/
│   ├── maps/                   # .tmj de Tiled
│   ├── audio/
│   └── fonts/
├── scripts/
│   └── validate-content.ts
├── src/
│   ├── main.ts
│   ├── config.ts               # resolución, escala, constantes
│   ├── content/                # carga y parseo de content/
│   ├── scenes/                 # Boot, Preload, Title, Station, End
│   ├── entities/               # Player, Creature
│   ├── behaviors/              # §8.3
│   ├── systems/                # Photo, Lighting, Save, Progress
│   └── ui/                     # overlays HTML: HUD, visor, bestiario, álbum
├── index.html
└── vite.config.ts
```

---

## 12. Controles

| Acción | Teclado/ratón |
|---|---|
| Mover | WASD / flechas |
| Caminar sigiloso | Shift (mantener) |
| Modo cámara | Clic derecho / C |
| Tomar foto | Clic izquierdo / Espacio (en modo cámara) |
| Linterna | F |
| Interactuar (terminales, palancas) | E |
| Bestiario | Tab |
| Álbum | Q |
| Pausa / menú | Esc |

Táctil: fuera del MVP.

---

## 13. Accesibilidad y uso como documentación real

- **Modo Bestiario directo:** botón en la pantalla de título que abre el bestiario completo **sin jugar**, con todos los niveles desbloqueados. La documentación tiene que ser consultable rápido.
- Rutas por URL: `/#/bestiario/talos-obrera` abre la ficha directamente (para enlazar desde otros lados).
- Opción para reducir parpadeos y efectos de pantalla.
- **Build público vs privado:**
  - `npm run build` → elimina bloques `<!-- privado -->` y criaturas con `publico: false`.
  - `npm run build:private` → incluye todo (solo para uso local o acceso por Tailscale).
  - Nunca publicar: dominios internos, IPs, nombres de repos privados, credenciales, nombres de host, salvo que estén marcados explícitamente como públicos.

---

## 14. Roadmap por fases

### Fase 0 — Esqueleto
- Vite + TS + Phaser, resolución 480×270 con escalado entero, escena de título.
- **Acepta si:** `npm run dev` muestra la pantalla de título nítida (sin blur) a cualquier tamaño de ventana.
- *Prompt:* "Lee docs/GAME_DESIGN.md. Implementa la Fase 0 (§14) respetando §9.1 y §11. No avances a la Fase 1."

### Fase 1 — Movimiento y un sector
- Jugador placeholder, un mapa de prueba en Tiled (Muelle), colisiones, cámara.
- **Acepta si:** el jugador recorre el Muelle, colisiona con paredes y la cámara no produce jitter de subpíxel.

### Fase 2 — Contenido
- Carga de `content/`, script de validación, criaturas placeholder con comportamientos `inmovil`, `deambular`, `flotar`.
- **Acepta si:** añadir un `.md` nuevo en `content/bestiario/` hace aparecer la criatura sin tocar código; `validate-content` detecta errores.

### Fase 3 — Fotografía
- Modo cámara, puntuación ★, desbloqueo de niveles, álbum, guardado.
- **Acepta si:** las tres condiciones de §4 funcionan y el progreso sobrevive a recargar la página.

### Fase 4 — Bestiario y Modo Bestiario directo
- Overlay HTML de fichas, rutas `/#/bestiario/<id>`, build público/privado.
- **Acepta si:** el build público no contiene ningún bloque privado (verificar con búsqueda en `dist/`).

### Fase 5 — Estación completa
- Todos los sectores, compuertas por fotos, señales no identificadas, iluminación, comportamientos restantes, pantalla final.
- **Acepta si:** se puede completar el censo de principio a fin.

### Fase 6 — Pulido
- Arte final, audio, logros, mini-interacción del Vigía de Compuerta, efectos.

### Fase 7 — Despliegue (opcional)
Ver §15.

---

## 15. Despliegue (opcional)

Opciones, de más simple a más "homelab":

1. **Hosting estático externo** (GitHub Pages / Cloudflare Pages) con el build público.
2. **Dentro del propio homelab:** imagen con servidor estático → Docker Hub → chart Helm en el repo GitOps → sincronizado por ArgoCD → expuesto por el túnel de Cloudflare. Depende de decisiones aún abiertas del cluster (ingress, etc.), así que no es prioridad.

Si se elige la opción 2, la propia página se convierte en una criatura más del bestiario.

---

## 16. Datos pendientes de completar (por Duber)

Antes de la Fase 2:
- [ ] Nombres de los 3 nodos de Proxmox y si el tercero ya está unido al cluster.
- [ ] Confirmar que los 3 control plane + 3 workers de Talos están unidos y funcionando.
- [ ] Qué VMs corre cada nodo de Proxmox (para las crisálidas de cada titán).
- [ ] Versiones de Talos, Kubernetes y Proxmox a mostrar.
- [ ] Si se quieren stats tipo "ficha de criatura" (CPU/RAM por nodo), aportar los valores reales.
- [ ] Estado real de ArgoCD y Helm en el cluster Talos.
- [ ] Tipo de servidor de Minecraft.
- [ ] Qué datos son públicos (IPs, dominios, nombres de repo, hostnames).
- [ ] Dónde se va a publicar (§15).

---

## 17. `CLAUDE.md` sugerido

```markdown
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
```
