'use client';

import { useEffect, useRef, useState } from 'react';

import type { SwellMapManifest, TileName } from '@tonnta/swell-map';
import {
  HEIGHT_BANDS,
  SWELL_INKS,
  cellForLonLat,
  crestStrokes,
  decodeTile,
  isSwellMapManifest,
  paintTile,
} from '@tonnta/swell-map';

import {
  TILE_LABELS,
  frameIndexNearest,
  frameLabel,
  frameUrl,
  latestManifestUrl,
  spotsOnMap,
} from '@/lib/swell-map';

/** Screen pixels per grid cell. The bands stay flat: no smoothing between cells. */
const CELL_PX = 4;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; manifest: SwellMapManifest };

async function loadFramePixels(url: string): Promise<Uint8ClampedArray> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`frame ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('no 2D canvas');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

function drawMap(
  canvas: HTMLCanvasElement,
  manifest: SwellMapManifest,
  pixels: Uint8ClampedArray,
  tile: TileName
): void {
  const { ni, nj } = manifest.grid;
  const decoded = decodeTile(pixels, manifest, tile);
  const small = document.createElement('canvas');
  small.width = ni;
  small.height = nj;
  const smallContext = small.getContext('2d');
  const context = canvas.getContext('2d');
  if (smallContext === null || context === null) return;
  const painted = smallContext.createImageData(ni, nj);
  painted.data.set(paintTile(decoded));
  smallContext.putImageData(painted, 0, 0);

  canvas.width = ni * CELL_PX;
  canvas.height = nj * CELL_PX;
  context.imageSmoothingEnabled = false;
  context.drawImage(small, 0, 0, canvas.width, canvas.height);

  context.lineWidth = 1.5;
  context.lineCap = 'round';
  for (const stroke of crestStrokes(decoded)) {
    context.strokeStyle = stroke.tone === 'light' ? SWELL_INKS.stock : SWELL_INKS.deep;
    context.beginPath();
    context.moveTo(stroke.x1 * CELL_PX, stroke.y1 * CELL_PX);
    context.lineTo(stroke.x2 * CELL_PX, stroke.y2 * CELL_PX);
    context.stroke();
  }

  context.fillStyle = SWELL_INKS.sun;
  for (const spot of spotsOnMap(manifest)) {
    const { column, row } = cellForLonLat(manifest, spot.longitude, spot.latitude);
    context.beginPath();
    // Grid points sit at cell centres, half a cell in from the cell's corner.
    context.arc((column + 0.5) * CELL_PX, (row + 0.5) * CELL_PX, 5, 0, Math.PI * 2);
    context.fill();
  }
}

export function SwellMapView() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [tile, setTile] = useState<TileName>('swell1');
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameError, setFrameError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef(new Map<string, Promise<Uint8ClampedArray>>());

  useEffect(() => {
    let cancelled = false;
    fetch(latestManifestUrl())
      .then(async (response) => {
        if (!response.ok) throw new Error(`manifest ${response.status}`);
        const body: unknown = await response.json();
        if (!isSwellMapManifest(body)) throw new Error('manifest has an unexpected shape');
        if (cancelled) return;
        setFrameIndex(frameIndexNearest(body, Date.now()));
        setLoad({ status: 'ready', manifest: body });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoad({ status: 'error', message: error instanceof Error ? error.message : 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (load.status !== 'ready') return;
    const { manifest } = load;
    const frame = manifest.frames[frameIndex];
    const canvas = canvasRef.current;
    if (frame === undefined || canvas === null) return;
    const url = frameUrl(manifest, frame);
    let pending = framesRef.current.get(url);
    if (pending === undefined) {
      pending = loadFramePixels(url);
      framesRef.current.set(url, pending);
    }
    let cancelled = false;
    pending
      .then((pixels) => {
        if (cancelled) return;
        drawMap(canvas, manifest, pixels, tile);
        setFrameError(null);
      })
      .catch((error: unknown) => {
        framesRef.current.delete(url);
        if (!cancelled) setFrameError(error instanceof Error ? error.message : 'failed');
      });
    return () => {
      cancelled = true;
    };
  }, [load, frameIndex, tile]);

  if (load.status === 'loading') return <p>Loading the swell map…</p>;
  if (load.status === 'error') {
    return <p>The swell map is unavailable right now ({load.message}).</p>;
  }

  const { manifest } = load;
  const frame = manifest.frames[frameIndex];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        role="radiogroup"
        aria-label="Which waves"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {manifest.tiles.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={name === tile}
            onClick={() => setTile(name)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: `1px solid ${SWELL_INKS.deep}`,
              background: name === tile ? SWELL_INKS.deep : 'transparent',
              color: name === tile ? SWELL_INKS.stock : 'inherit',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            {TILE_LABELS[name]}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${TILE_LABELS[tile]} height and direction, ${frame === undefined ? '' : frameLabel(frame)}`}
        style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: 8 }}
      />
      {frameError !== null && <p>This frame did not load ({frameError}).</p>}

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontFamily: "'Spline Sans Mono', monospace" }}>
          {frame === undefined ? '' : frameLabel(frame)} · Irish time
        </span>
        <input
          type="range"
          min={0}
          max={manifest.frames.length - 1}
          value={frameIndex}
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          aria-label="Forecast time"
        />
      </label>

      <ul
        aria-label="Wave height bands"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {HEIGHT_BANDS.map((band) => (
          <li key={band.ink} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              aria-hidden
              style={{ width: 16, height: 16, borderRadius: 4, background: SWELL_INKS[band.ink] }}
            />
            {band.toM === null ? `${band.fromM} m and over` : `${band.fromM} to ${band.toM} m`}
          </li>
        ))}
      </ul>
    </div>
  );
}
