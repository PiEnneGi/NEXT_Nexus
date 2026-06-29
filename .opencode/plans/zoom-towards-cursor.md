# Fix: Zoom verso il cursore

## Problema
Lo zoom con la rotellina scala verso un punto fisso (centro SVG) invece che verso la posizione del mouse.

## Causa
Con `transformOrigin: 'center center'` e flex centering, il punto di ancoraggio dello zoom è sempre il centro dell'SVG, non il cursore.

## Soluzione
Rimuovere flex centering, usare pan esplicito, e ricalcolare il pan durante lo zoom per mantenere stabile il punto sotto il cursore.

## Formula
```
newPan = (1 - factor) * (viewportPos + scrollOffset) + factor * oldPan
```
Dove `factor = newZoom / oldZoom`.

Per i pulsanti +/- si usa il centro del viewport invece della posizione del mouse.

## Cambiamenti

### File: `client/src/components/ArchitecturePanel.tsx`

#### 1. Aggiungere funzione helper prima del componente
```tsx
function calcZoomPan(
  vpX: number, vpY: number,
  oldZoom: number,
  newZoom: number,
  oldPan: { x: number; y: number },
  scroll: { x: number; y: number },
) {
  const factor = newZoom / oldZoom
  return {
    x: (1 - factor) * (vpX + scroll.x) + factor * oldPan.x,
    y: (1 - factor) * (vpY + scroll.y) + factor * oldPan.y,
  }
}
```

#### 2. Nuove refs (sostituire sezione state/refs)
Aggiungere dopo `panRef`:
```tsx
const zoomRef = useRef(1)
const scrollPosRef = useRef({ x: 0, y: 0 })
```

#### 3. Aggiungere sync ref
```tsx
useEffect(() => { zoomRef.current = zoom }, [zoom])
useEffect(() => { panRef.current = panOffset }, [panOffset])
```

#### 4. Centratura iniziale (dopo l'effetto che legge svgNaturalSize)
```tsx
useEffect(() => {
  if (!renderedSvg || !scrollRef.current) return
  const { clientWidth, clientHeight } = scrollRef.current
  const cx = Math.max(0, (clientWidth - svgNaturalSize.width) / 2)
  const cy = Math.max(0, (clientHeight - svgNaturalSize.height) / 2)
  setPanOffset({ x: cx, y: cy })
  panRef.current = { x: cx, y: cy }
}, [renderedSvg, svgNaturalSize])
```

#### 5. Sostituire handler
**handleScroll**:
```tsx
const handleScroll = useCallback(() => {
  if (scrollRef.current) {
    scrollPosRef.current = {
      x: scrollRef.current.scrollLeft,
      y: scrollRef.current.scrollTop,
    }
  }
}, [])
```

**handleWheel** (nuovo, con zoom verso cursore):
```tsx
const handleWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const vpX = e.clientX - rect.left
  const vpY = e.clientY - rect.top

  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const oldZoom = zoomRef.current
  const newZoom = Math.max(0.25, Math.min(4, +(oldZoom * factor).toFixed(3)))

  const newPan = calcZoomPan(vpX, vpY, oldZoom, newZoom, panRef.current, scrollPosRef.current)

  setZoom(newZoom)
  setPanOffset(newPan)
  zoomRef.current = newZoom
  panRef.current = newPan
}, [])
```

**Pulsanti zoom** (zoom verso centro viewport):
```tsx
const zoomFromCenter = useCallback((factor: number) => {
  const oldZoom = zoomRef.current
  const newZoom = Math.max(0.25, Math.min(4, +(oldZoom * factor).toFixed(3)))
  const el = scrollRef.current
  if (!el) return
  const vpX = el.clientWidth / 2
  const vpY = el.clientHeight / 2
  const newPan = calcZoomPan(vpX, vpY, oldZoom, newZoom, panRef.current, scrollPosRef.current)
  setZoom(newZoom)
  setPanOffset(newPan)
  zoomRef.current = newZoom
  panRef.current = newPan
}, [])

const handleZoomIn = useCallback(() => zoomFromCenter(1.25), [zoomFromCenter])
const handleZoomOut = useCallback(() => zoomFromCenter(0.8), [zoomFromCenter])
```

**handleZoomReset** (centra nel viewport):
```tsx
const handleZoomReset = useCallback(() => {
  setZoom(1)
  zoomRef.current = 1
  const el = scrollRef.current
  if (el) {
    const cx = Math.max(0, (el.clientWidth - svgNaturalSize.width) / 2)
    const cy = Math.max(0, (el.clientHeight - svgNaturalSize.height) / 2)
    setPanOffset({ x: cx, y: cy })
    panRef.current = { x: cx, y: cy }
  }
}, [svgNaturalSize])
```

#### 6. Modificare la sezione di rendering

Sostituire il `<div>` con `onScroll` e `onWheel`:
```tsx
<div
  ref={scrollRef}
  className="flex-1 overflow-auto min-w-0 select-none"
  onScroll={handleScroll}
  onWheel={handleWheel}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerCancel={handlePointerUp}
  style={{ cursor: isPanningState ? 'grabbing' : 'grab' }}
>
```

Sostituire il wrapper interno (rimuovere flex centering):
```tsx
{renderedSvg ? (
  <div
    style={{
      width: svgNaturalSize.width * zoom,
      height: svgNaturalSize.height * zoom,
      minWidth: '100%',
      minHeight: '100%',
    }}
  >
    <div
      style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <div
        ref={svgContainerRef}
        dangerouslySetInnerHTML={{ __html: renderedSvg }}
      />
    </div>
  </div>
) : (...)}
```

## Riepilogo modifiche
- Rimosso flex centering dal wrapper SVG
- Aggiunto `transformOrigin: '0 0'` (top-left)
- Centratura iniziale via panOffset esplicito
- Zoom verso cursore con ricalcolo pan
- Tracciamento scroll position per calcoli corretti
- Pulsanti +/- zoom verso centro viewport
- Ref `zoomRef` e `scrollPosRef` per letture sincrone negli handler
