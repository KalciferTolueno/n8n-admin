---
name: "n8n Admin"
description: "Panel interno de operaciones para mantener un servicio n8n con estados y acciones deliberadas."
colors:
  ground: "#0e1216"
  surface: "#141b21"
  surface-raised: "#1a232b"
  rule: "#2b3742"
  rule-strong: "#44515c"
  text: "#f2f6f7"
  muted: "#a8b4bb"
  dim: "#77848d"
  signal-amber: "#f5b942"
  signal-amber-ink: "#1f1807"
  status-online: "#5ce6a6"
  status-error: "#ff7076"
  status-transition: "#f4cf62"
  info: "#8fb7ff"
  focus: "#d9efff"
typography:
  wordmark:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.45rem, 2vw, 1.82rem)"
    fontWeight: 760
    letterSpacing: "-0.04em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 720
    letterSpacing: "-0.015em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 760
    letterSpacing: "0.08em"
  metric:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.1rem, 5vw, 3.8rem)"
    lineHeight: 1
    letterSpacing: "-0.055em"
rounded:
  control: "8px"
  dialog: "14px"
spacing:
  shell-top: "34px"
  shell-bottom: "56px"
  section: "26px"
  ledger-inset: "18px"
  control-gap: "10px"
  dialog-inset: "21px"
components:
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.status-error}"
    textColor: "#2b080b"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
  concurrency-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
    width: "54px"
  concurrency-option-active:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.signal-amber-ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
    width: "54px"
  confirmation-dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "{spacing.dialog-inset}"
    width: "min(520px, calc(100% - 28px))"
---

# Design System: n8n Admin

## Overview

**Creative North Star: "El libro mayor de incidentes"**

n8n Admin se comporta como una hoja de control de una sala de operaciones: oscura, precisa y serena bajo presión. La información viva llega primero; las acciones de mantenimiento aparecen como decisiones explícitas y con consecuencias legibles. La interfaz debe sentirse compacta y profesional, sin transformar la observación de un servicio único en una consola genérica o una cuadrícula de tarjetas decorativas.

La profundidad procede de superficies grafito y líneas de registro, no de sombra, brillo ni imágenes. El ámbar concentra la atención en actividad, selección y lectura vigente; los estados de servicio conservan sus propios colores semánticos y siempre se acompañan de texto. Las acciones no disponibles se muestran con una atenuación clara: los controles de iniciar y detener quedan deshabilitados hasta que Docker entrega un estado válido y también ante error; limpiar la cola depende de una base de datos conectada.

**Key Characteristics:**

- Densidad de libro mayor: filas, divisores y valores alineados para escanear, no para decorar.
- Una única nota de señal cálida para el estado actual, la selección y el acento del nombre.
- Estados operacionales expresados con palabra, marca geométrica y color.
- Riesgo visible: la única acción destructiva se diferencia antes de abrir una confirmación modal.
- Tipografía de sistema compacta y numerales tabulares para que las cifras no salten al actualizarse.

## Colors

La paleta es una escala de grafito frío atravesada por una señal ámbar reservada y colores de estado que sólo comunican condiciones operacionales.

### Primary

- **Ámbar de señal**: destaca el estado global, la selección de concurrencia, la lectura vigente y el sufijo de la marca.
- **Tinta de ámbar**: se usa únicamente sobre el ámbar para conservar el contraste de las selecciones y la selección de texto.

### Secondary

- **Verde de servicio**: confirma un servicio en línea, una conexión disponible o una etapa concluida.
- **Rojo de riesgo**: comunica error, indisponibilidad y la acción de limpiar cola; nunca representa una acción rutinaria.
- **Amarillo de transición**: cubre verificación y mantenimiento en curso, no éxito ni error.
- **Azul informativo**: queda disponible para información auxiliar, sin competir con la señal ámbar.

### Neutral

- **Negro de sala**: fondo continuo del lienzo y del riel de desplazamiento.
- **Grafito de panel y grafito elevado**: separan la banca de cola, el progreso y la confirmación del fondo sin elevarlos con sombras.
- **Reglas de grafito**: organizan la lectura con divisores finos y su variante fuerte perfila controles y avisos.
- **Blanco frío, gris de lectura y gris tenue**: sostienen la jerarquía entre contenido principal, ayuda y etiquetas técnicas.
- **Tinta de foco**: es el único tratamiento de foco de teclado; debe mantenerse inequívoco sobre el fondo oscuro.

**The Reserved Signal Rule.** El ámbar señala lo actual o seleccionado; no se usa como relleno general, como segundo color de estado ni para embellecer bloques neutrales.

## Typography

**Display Font:** la pila sans-serif de sistema definida en `typography.wordmark`.

**Body Font:** la misma pila de sistema definida en `typography.body`.

**Character:** La voz es funcional y cercana al sistema operativo: firme para títulos, apretada para etiquetas técnicas y sin una fuente de exhibición ajena al trabajo operativo. Los datos de servicio, cola, identificadores y resultados emplean numerales tabulares para que los cambios en vivo se lean como instrumentos estables.

### Hierarchy

- **Wordmark:** identifica el control room con una compactación leve y deja que sólo “Admin” tome la señal cálida.
- **Title:** resuelve encabezados de secciones como rótulos de un libro mayor, nunca como titulares de marketing.
- **Body:** presenta instrucciones, explicaciones y detalles en la lectura más neutra de la superficie.
- **Label:** aplica mayúsculas y espaciado a estados, columnas y nombres de métricas cuando conviene priorizar el escaneo.
- **Metric:** hace que NEW, RUNNING y los conteos sean la lectura dominante dentro de la banca de cola.

**The Tabular Evidence Rule.** Todo valor que pueda actualizarse, compararse o registrarse en una tabla conserva numerales tabulares; no sustituirlos por cifras de ancho proporcional.

## Layout

El escritorio usa un único contenedor centrado, limitado a 1,180 px y respirado por un margen lateral de 40 px. La primera banda contiene una cabecera compacta; el estado actual abre en dos columnas desiguales: el libro de servicios ocupa la porción amplia y la cola queda como banco tonal contiguo. Los controles, la concurrencia, el progreso y el historial continúan como secciones de ancho completo separadas por reglas horizontales, con un ritmo vertical principal de 26 px.

A 760 px la placa de estado pasa a una sola columna, los encabezados apilan sus metadatos y los valores de cada servicio dejan de competir por el extremo derecho. A 430 px, los grupos de acciones y confirmación se convierten en una columna de ancho completo. La tabla conserva su ancho mínimo y se desplaza horizontalmente dentro de su contenedor en vez de romper los encabezados de auditoría.

**The Ledger Continuity Rule.** Las secciones comparten el mismo eje y el mismo lenguaje de reglas; no encerrar cada bloque en una tarjeta independiente ni crear columnas auxiliares que interrumpan la lectura de arriba abajo.

## Elevation & Depth

El sistema es plano por defecto: no hay sombras. La profundidad se comunica mediante tres tonos de grafito, bordes de una línea y el fondo oscuro del diálogo modal. El banco de cola, el panel de operación y la confirmación se distinguen por tono y regla; la confirmación añade una cortina negra translúcida para aislar la decisión sin teatralidad.

**The Flat-by-Record Rule.** Una superficie cambia de plano sólo cuando contiene otra clase de información o una decisión protegida; no añadir sombras, degradados ni elevación de hover para simular importancia.

## Shapes

Los controles son rectángulos suavemente curvados mediante `rounded.control`, mientras que la confirmación usa `rounded.dialog` para establecer una contención mayor sin abandonar el lenguaje técnico. Las filas, bancos y tablas permanecen rectilíneos; los puntos de estado son pequeños rombos y las etapas exitosas recuperan ese gesto geométrico. Sólo el indicador de etapa pendiente usa un círculo, reservado para la idea de proceso.

## Components

### Buttons

**Character:** controles compactos y auditablemente sobrios.

- **Secondary:** contorno fuerte sobre fondo transparente para actualizar, iniciar, detener y cancelar; al pasar el cursor puede tomar la superficie elevada.
- **Danger:** relleno rojo de riesgo para limpiar cola y confirmar acciones destructivas; mantiene una tinta oscura para sostener contraste y no se duplica para acciones neutras.
- **Disabled:** reduce su opacidad y deja de ofrecer cursor de acción. Las condiciones de disponibilidad siguen siendo visibles a través del estado de servicio; no se reemplazan por un botón aparentemente activo.
- **Focus:** todo botón y enlace usa el anillo de foco del sistema con separación exterior.

### Chips

**Character:** selector numérico de concurrencia, no etiqueta decorativa.

- **Default:** opción grafito con contorno de regla, ancho mínimo y numerales tabulares.
- **Selected:** la opción con `aria-pressed="true"` cambia a la señal ámbar; es la única opción seleccionada.
- **Disabled:** conserva su posición y valor, pero comunica que el estado actual no permite cambiar concurrencia.

### Cards / Containers

**Character:** bancos de lectura integrados al libro mayor.

- **Queue bank:** superficie de panel que agrupa NEW y RUNNING junto al ledger de servicios, separada por una regla vertical en escritorio y horizontal en móvil.
- **Operation panel:** superficie de panel con borde completo para exponer pasos en curso; se muestra sólo mientras existe una operación.
- **Confirmation dialog:** superficie elevada dentro de una cortina oscura, con advertencia y lista de impacto antes de la acción.

### Navigation

**Character:** una cabecera informativa mínima, no una barra de producto.

- La marca vuelve al inicio, el estado de actualización y el botón de recarga ocupan el extremo opuesto en escritorio y se apilan con orden legible en móvil.

### Service Ledger

**Character:** cada servicio se lee como una fila operacional completa.

- La marca geométrica y el texto de estado forman la primera lectura; réplicas, concurrencia o disponibilidad forman la segunda.
- Verde, rojo y amarillo se asignan desde el estado de datos y no sustituyen el nombre textual del estado.

### Operation Progress

**Character:** una secuencia de comprobación, no una animación de carga genérica.

- Las etapas pendientes usan un círculo de contorno; la activa gira con una única animación lineal y la concluida se convierte en rombo verde.
- La descripción de la etapa queda junto a la marca; el detalle y el identificador se mantienen tabulares para facilitar la trazabilidad.

### History Table

**Character:** registro compacto y de ancho honesto.

- Los encabezados son etiquetas técnicas espaciadas; la acción conserva texto claro y el resultado vuelve a usar verde o rojo junto a su texto.
- En pantallas estrechas, el contenedor se desplaza horizontalmente en lugar de eliminar columnas o abreviar el historial.

## Do's and Don'ts

### Do:

- **Do** conservar una única columna de lectura en móvil y el ledger de dos columnas sólo cuando exista espacio para comparar servicios y cola.
- **Do** usar texto y la marca geométrica junto al color para todo estado vivo.
- **Do** reservar la señal ámbar para selección, actualidad y el detalle cálido de la marca.
- **Do** mantener la acción de limpiar cola separada visualmente y confirmar sus consecuencias dentro del diálogo protegido.
- **Do** mostrar controles indisponibles como estados atenuados y mantener el foco de teclado claramente visible.

### Don't:

- **Don't** convertir esta superficie en una cuadrícula de tarjetas de dashboard genérica.
- **Don't** usar sombras, degradados, ilustraciones ni activos raster como sustitutos de la jerarquía operacional.
- **Don't** depender únicamente del color para comunicar error, conexión, transición o éxito.
- **Don't** dar al rojo de riesgo el mismo tratamiento que una acción de mantenimiento ordinaria.
- **Don't** ocultar la tabla de historial ni comprimir sus columnas hasta perder su valor de auditoría.
