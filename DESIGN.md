---
name: "n8n Admin"
description: "Panel interno de operaciones para mantener un servicio n8n mediante estados claros y acciones deliberadas."
colors:
  ground: "#0b0f13"
  surface: "#121a20"
  surface-raised: "#182129"
  surface-muted: "#0f171d"
  rule: "#2a3640"
  rule-strong: "#4a5a66"
  text: "#f4f7f8"
  muted: "#a9b6be"
  dim: "#7c8b95"
  signal-amber: "#f5b942"
  signal-amber-ink: "#211804"
  status-online: "#5ce6a6"
  status-error: "#ff7076"
  status-transition: "#f4cf62"
  info: "#8fb7ff"
  focus: "#d9efff"
typography:
  wordmark:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.5rem, 2.2vw, 1.95rem)"
    fontWeight: 780
    letterSpacing: "-0.04em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 740
    letterSpacing: "-0.018em"
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
    fontSize: "clamp(2.25rem, 5vw, 4rem)"
    lineHeight: 0.95
    letterSpacing: "-0.04em"
rounded:
  card: "16px"
  control: "10px"
spacing:
  shell-top: "36px"
  shell-bottom: "60px"
  card-gap: "18px"
  card-inset: "24px"
  compact-card-inset: "18px"
  control-gap: "10px"
  dialog-inset: "22px"
components:
  system-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "22px 24px 0"
    width: "100%"
  maintenance-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  concurrency-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  history-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "24px 24px 0"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.status-error}"
    textColor: "#2b080b"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  concurrency-option:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  concurrency-option-active:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.signal-amber-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  confirmation-dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.dialog-inset}"
    width: "min(520px, calc(100% - 28px))"
---

# Design System: n8n Admin

## Overview

**Creative North Star: "El libro mayor de incidentes"**

n8n Admin es una superficie de control para incidentes: oscura, precisa y serena bajo presión. La información viva llega primero y las acciones de mantenimiento se presentan como decisiones explícitas, con consecuencias legibles. La jerarquía agrupa cada capacidad operacional en una tarjeta sobria y útil, no como una colección intercambiable de métricas decorativas.

La composición comienza con una tarjeta de estado a todo ancho. Debajo, la tarjeta amplia de mantenimiento y la tarjeta de concurrencia forman una pareja de trabajo; el progreso aparece dentro de mantenimiento porque sólo cobra sentido como parte de la operación activa. Una tarjeta de historial de ancho completo cierra el registro. La profundidad procede de grafitos, bordes y radios contenidos, no de sombras, brillo ni imágenes. El ámbar concentra la atención en actividad, selección y lectura vigente; los estados de servicio conservan colores semánticos y siempre se acompañan de texto.

**Key Characteristics:**

- Tarjetas operativas con una responsabilidad concreta, dispuestas en una jerarquía de control y no en una grilla genérica.
- Tarjeta de estado a todo ancho que une servicios y cola como una única lectura de salud.
- Tarjeta de mantenimiento dominante que contiene acciones y, cuando corresponde, el progreso de la misma operación.
- Tarjeta de concurrencia secundaria, compacta y claramente separada de las acciones de riesgo.
- Numerales tabulares, reglas finas y una señal ámbar reservada para actualizar estados sin ruido visual.

## Colors

La paleta es una escala de grafito frío con tres niveles de superficie; el ámbar sólo marca actualidad o selección y los colores de estado sólo comunican condiciones operacionales.

### Primary

- **Ámbar de señal**: destaca el estado global, la concurrencia seleccionada, la lectura vigente y el sufijo de la marca.
- **Tinta de ámbar**: se usa únicamente sobre el ámbar para sostener contraste en la selección y en la selección de texto.

### Secondary

- **Verde de servicio**: confirma un servicio en línea, una conexión disponible o una etapa concluida.
- **Rojo de riesgo**: comunica error, indisponibilidad y la acción de limpiar cola; nunca representa una acción rutinaria.
- **Amarillo de transición**: cubre verificación y mantenimiento en curso, no éxito ni error.
- **Azul informativo**: queda disponible para información auxiliar, sin competir con la señal ámbar.

### Neutral

- **Negro de sala**: fondo continuo del lienzo y del riel de desplazamiento.
- **Grafito de tarjeta, elevado y apagado**: distinguen las tarjetas, la tarjeta de mantenimiento y los controles secundarios sin recurrir a sombra.
- **Reglas de grafito**: ordenan contenido dentro de cada tarjeta y su variante fuerte perfila controles y avisos.
- **Blanco frío, gris de lectura y gris técnico**: sostienen la jerarquía entre contenido principal, ayuda y etiquetas técnicas.
- **Tinta de foco**: es el único tratamiento de foco de teclado y debe permanecer inequívoco sobre el fondo oscuro.

**The Reserved Signal Rule.** El ámbar señala lo actual o seleccionado; no se usa como relleno general, como segundo color de estado ni para adornar tarjetas neutrales.

## Typography

**Display Font:** la pila sans-serif de sistema definida en `typography.wordmark`.

**Body Font:** la misma pila de sistema definida en `typography.body`.

**Character:** La voz es funcional y cercana al sistema operativo: firme para títulos de tarjeta, apretada para etiquetas técnicas y sin una fuente de exhibición ajena al trabajo operativo. Los datos de servicio, cola, identificadores y resultados emplean numerales tabulares para que los cambios en vivo se lean como instrumentos estables.

### Hierarchy

- **Wordmark:** identifica el control room con compactación leve y deja que sólo “Admin” tome la señal cálida.
- **Title:** encabeza tarjetas y subprocesos como rótulos de un libro mayor, nunca como titulares de marketing.
- **Body:** presenta instrucciones, explicaciones y detalles en la lectura más neutra de la superficie.
- **Label:** aplica mayúsculas y espaciado a estados, columnas y nombres de métricas cuando conviene priorizar el escaneo.
- **Metric:** hace que NEW y RUNNING sean la lectura dominante dentro de la tarjeta de estado.

**The Tabular Evidence Rule.** Todo valor que pueda actualizarse, compararse o registrarse en una tabla conserva numerales tabulares; no sustituirlos por cifras de ancho proporcional.

## Layout

El escritorio usa un contenedor centrado limitado a 1,200 px, con una retícula de doce columnas y una separación de 18 px. La tarjeta de estado y la de historial abarcan toda la retícula. En la fila operativa, mantenimiento ocupa ocho columnas y concurrencia cuatro; a 920 px pasan a siete y cinco columnas, con acciones de mantenimiento en una sola columna. A 760 px toda la retícula se reduce a una columna; a 430 px se compactan los márgenes, las acciones de diálogo se apilan y los controles de concurrencia pasan a tres columnas.

La tarjeta de estado conserva internamente servicios y cola como dos áreas hasta el corte móvil, cuando se apilan. La tarjeta de historial mantiene la tabla en un contenedor con desplazamiento horizontal intencional. Las tarjetas no deben formar mosaicos de contenido heterogéneo: cada una agrupa una lectura o capacidad completa, y la tarjeta de mantenimiento contiene su progreso en vez de crear una tarjeta de progreso competidora.

**The Operational Card Rule.** Una tarjeta debe corresponder a una unidad de decisión o evidencia: estado, mantenimiento, concurrencia o historial. No fragmentar esas unidades en minitarjetas ni repetir la misma métrica en tarjetas vecinas.

## Elevation & Depth

El sistema permanece plano: no hay sombras. Las tarjetas se separan por borde, radio y cambio tonal, con la tarjeta de mantenimiento un nivel más elevado que las tarjetas de estado, concurrencia e historial. Dentro de mantenimiento, el panel de progreso recupera la jerarquía con una regla superior en lugar de una tarjeta anidada. La confirmación aparece sobre una cortina oscura y mantiene el tono elevado de una decisión protegida.

**The Flat-by-Record Rule.** Una tarjeta gana jerarquía por tono y borde cuando contiene otra clase de operación, nunca por sombras, degradados ni efectos de levitación.

## Shapes

Las tarjetas y la confirmación usan `rounded.card`: una curva moderada que hace visible la agrupación sin suavizar en exceso el carácter técnico. Botones, opciones numéricas y avisos de impacto usan `rounded.control`. Las filas, tablas y rieles interiores permanecen rectilíneos. Los puntos de estado son pequeños rombos; el paso activo es circular y el éxito vuelve a adoptar el rombo, reservando cada geometría para una clase de señal.

## Components

### Buttons

**Character:** controles compactos y auditablemente sobrios.

- **Secondary:** superficie apagada con contorno fuerte para actualizar, iniciar, detener y cancelar; al pasar el cursor puede tomar una superficie más clara.
- **Danger:** relleno rojo de riesgo para limpiar cola y confirmar acciones destructivas; mantiene una tinta oscura y no se duplica para acciones neutras.
- **Disabled:** reduce opacidad y deja de ofrecer cursor de acción. Las condiciones de disponibilidad siguen visibles a través del estado del servicio; no se reemplazan por un botón aparentemente activo.
- **Focus:** todo botón y enlace usa el anillo de foco del sistema con separación exterior.

### Chips

**Character:** selector numérico de concurrencia, no etiqueta decorativa.

- **Default:** opción grafito apagado con contorno de regla, numerales tabulares y distribución regular dentro de la tarjeta de concurrencia.
- **Selected:** la opción con `aria-pressed="true"` cambia a la señal ámbar; es la única opción seleccionada.
- **Responsive:** usa cuatro columnas en la tarjeta de concurrencia y tres en el tramo más estrecho, manteniendo áreas táctiles consistentes.

### Cards / Containers

**Character:** contenedores operativos con responsabilidad inequívoca.

- **System Status Card:** abarca el ancho completo y vincula el ledger de servicios con el banco de cola en una misma lectura de salud.
- **Maintenance Card:** es la tarjeta dominante de la fila de trabajo; agrupa detener, iniciar y limpiar, y contiene el progreso cuando existe una operación.
- **Concurrency Card:** acompaña mantenimiento como tarjeta más estrecha; presenta el valor vigente, su advertencia y las opciones de cambio sin mezclar acciones de riesgo.
- **History Card:** abarca el ancho completo y retiene el registro en tabla dentro de la misma tarjeta.
- **Progress Container:** vive dentro de Maintenance Card, separado por una regla superior; no crea una tarjeta paralela ni compite con la acción que explica.
- **Confirmation Dialog:** superficie elevada dentro de una cortina oscura. Para limpiar la cola exige seleccionar `Solo NEW`, `Solo RUNNING` o ambas mediante opciones de radio con sus conteos actuales; la confirmación permanece deshabilitada hasta elegir un alcance.

### Navigation

**Character:** cabecera informativa mínima, no una barra de producto.

- La marca vuelve al inicio; el estado de actualización y el botón de recarga ocupan el extremo opuesto en escritorio y se apilan con orden legible en móvil.

### Service Ledger

**Character:** filas de evidencia dentro de la tarjeta de estado.

- La marca geométrica y el texto de estado forman la primera lectura; réplicas, concurrencia o disponibilidad forman la segunda.
- Verde, rojo y amarillo se asignan desde el estado de datos y no sustituyen el nombre textual del estado.

### Operation Progress

**Character:** una secuencia de comprobación ligada a la tarjeta de mantenimiento, no una animación de carga genérica.

- Las etapas pendientes usan un círculo de contorno; la activa gira con una única animación lineal y la concluida se convierte en rombo verde.
- La descripción de la etapa queda junto a la marca; el detalle y el identificador se mantienen tabulares para facilitar la trazabilidad.

### History Table

**Character:** registro compacto y de ancho honesto dentro de History Card.

- Los encabezados son etiquetas técnicas espaciadas; la acción conserva texto claro y el resultado vuelve a usar verde o rojo junto a su texto.
- En pantallas estrechas, el contenedor se desplaza horizontalmente en lugar de eliminar columnas o abreviar el historial.

## Do's and Don'ts

### Do:

- **Do** usar tarjetas para contener capacidades operativas completas, no para partir una sola operación en fragmentos visuales.
- **Do** mantener la tarjeta de estado y la de historial a todo ancho, y hacer dominante la de mantenimiento en escritorio.
- **Do** mantener el progreso dentro de la tarjeta de mantenimiento y la concurrencia en su propia tarjeta secundaria.
- **Do** usar texto y marca geométrica junto al color para todo estado vivo.
- **Do** reservar la señal ámbar para selección, actualidad y el detalle cálido de la marca.
- **Do** mantener la acción de limpiar cola separada visualmente y confirmar sus consecuencias dentro del diálogo protegido.

### Don't:

- **Don't** convertir las tarjetas operativas en una grilla genérica de KPI, con bloques intercambiables o métricas duplicadas.
- **Don't** usar sombras, degradados, ilustraciones ni activos raster como sustitutos de la jerarquía operacional.
- **Don't** depender únicamente del color para comunicar error, conexión, transición o éxito.
- **Don't** crear una tarjeta de progreso independiente de la operación de mantenimiento que la produce.
- **Don't** ocultar la tabla de historial ni comprimir sus columnas hasta perder su valor de auditoría.
