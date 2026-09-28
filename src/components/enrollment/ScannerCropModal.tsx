import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCw } from 'lucide-react';

/* =========================================================
   HOMOGRAFÍA (CORRECCIÓN DE PERSPECTIVA)
   ========================================================= */
function solveLinearSystem(A: number[][], B: number[]) {
  const n = A.length;
  for (let i = 0; i < n; i++) A[i].push(B[i]);
  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(A[i][i]), maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) { maxEl = Math.abs(A[k][i]); maxRow = k; }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n + 1; j++) {
        A[k][j] += (i === j ? 0 : c * A[i][j]);
        if (i === j) A[k][j] = 0;
      }
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = A[i][n] / A[i][i];
    for (let k = i - 1; k >= 0; k--) A[k][n] -= A[k][i] * x[i];
  }
  return x;
}

function computeHomography(src: {x:number, y:number}[], dst: {x:number, y:number}[]) {
  const A: number[][] = [], B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); B.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); B.push(Y);
  }
  const h = solveLinearSystem(A, B);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function applyH(H: number[], x: number, y: number) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

function warpPerspective(srcCanvas: HTMLCanvasElement, corners: {x:number, y:number}[], outW: number, outH: number) {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) return outCanvas;
  const outData = outCtx.createImageData(outW, outH);

  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return outCanvas;
  
  const sw = srcCanvas.width, sh = srcCanvas.height;
  const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

  const H = computeHomography(
    [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }],
    corners
  );

  for (let Y = 0; Y < outH; Y++) {
    for (let X = 0; X < outW; X++) {
      const [sx, sy] = applyH(H, X, Y);
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const idxOut = (Y * outW + X) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        outData.data[idxOut] = 255; outData.data[idxOut + 1] = 255; outData.data[idxOut + 2] = 255; outData.data[idxOut + 3] = 255;
        continue;
      }
      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const p00 = srcData[(y0 * sw + x0) * 4 + c];
        const p10 = srcData[(y0 * sw + x0 + 1) * 4 + c];
        const p01 = srcData[((y0 + 1) * sw + x0) * 4 + c];
        const p11 = srcData[((y0 + 1) * sw + x0 + 1) * 4 + c];
        const top = p00 * (1 - fx) + p10 * fx;
        const bot = p01 * (1 - fx) + p11 * fx;
        outData.data[idxOut + c] = top * (1 - fy) + bot * fy;
      }
      outData.data[idxOut + 3] = 255;
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

/* =========================================================
   MEJORA DE IMAGEN (HISTOGRAMA, NITIDEZ, SATURACIÓN)
   ========================================================= */
function sharpenCanvas(canvas: HTMLCanvasElement, amount: number) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data, o = dst.data;

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        o[idx] = s[idx]; o[idx + 1] = s[idx + 1]; o[idx + 2] = s[idx + 2]; o[idx + 3] = 255;
        continue;
      }
      for (let c = 0; c < 3; c++) {
        let acc = 0, k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sIdx = ((y + ky) * w + (x + kx)) * 4 + c;
            acc += s[sIdx] * kernel[k]; k++;
          }
        }
        const blended = s[idx + c] * (1 - amount) + acc * amount;
        o[idx + c] = Math.max(0, Math.min(255, blended));
      }
      o[idx + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

function enhanceImage(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  const w = canvas.width, h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Estiramiento de histograma (Contraste más agresivo 1.35, Brillo 15)
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = (d[i + c] - min) / range * 255;
      v = (v - 128) * 1.35 + 128 + 15; // Contraste 1.35 y más brillo
      d[i + c] = Math.max(0, Math.min(255, v));
    }
  }

  // Saturación (1.1)
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    for (let c = 0; c < 3; c++) {
      d[i + c] = Math.max(0, Math.min(255, gray + (d[i + c] - gray) * 1.1));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  
  // Intensidad de enfoque muy agresiva (1.25) para garantizar letras ultra nítidas
  sharpenCanvas(canvas, 1.25); 
  return canvas;
}


/* =========================================================
   COMPONENTE REACT
   ========================================================= */
interface Point { x: number; y: number; }
interface ScannerCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onComplete: (dataUrl: string) => void;
}

export const ScannerCropModal: React.FC<ScannerCropModalProps> = ({ isOpen, imageSrc, onClose, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [corners, setCorners] = useState<Point[] | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{w: number, h: number} | null>(null);
  const [activeCornerIndex, setActiveCornerIndex] = useState<number | null>(null);
  const [rotatedSrc, setRotatedSrc] = useState<string>(imageSrc);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setRotatedSrc(imageSrc);
    setCorners(null);
  }, [imageSrc]);

  const initCorners = () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    setImgNaturalSize({ w: naturalWidth, h: naturalHeight });
    
    // Inset inicial 10%
    const inset = 0.1;
    setCorners([
      { x: naturalWidth * inset, y: naturalHeight * inset },
      { x: naturalWidth * (1 - inset), y: naturalHeight * inset },
      { x: naturalWidth * (1 - inset), y: naturalHeight * (1 - inset) },
      { x: naturalWidth * inset, y: naturalHeight * (1 - inset) }
    ]);
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    setActiveCornerIndex(index);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activeCornerIndex === null || !containerRef.current || !imgRef.current || !imgNaturalSize) return;
    
    // Convertir coordenadas del DOM a coordenadas naturales de la imagen
    const rect = imgRef.current.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    let x = ((clientX - rect.left) / rect.width) * imgNaturalSize.w;
    let y = ((clientY - rect.top) / rect.height) * imgNaturalSize.h;
    
    x = Math.max(0, Math.min(imgNaturalSize.w, x));
    y = Math.max(0, Math.min(imgNaturalSize.h, y));

    setCorners(prev => {
      if (!prev) return null;
      const newCorners = [...prev];
      newCorners[activeCornerIndex] = { x, y };
      return newCorners;
    });
  }, [activeCornerIndex, imgNaturalSize]);

  const handlePointerUp = useCallback(() => {
    setActiveCornerIndex(null);
  }, []);

  useEffect(() => {
    if (activeCornerIndex !== null) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [activeCornerIndex, handlePointerMove, handlePointerUp]);

  const handleRotate = () => {
    const img = new Image();
    img.src = rotatedSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setRotatedSrc(canvas.toDataURL('image/png'));
        setCorners(null);
      }
    };
  };

  const handleApply = async () => {
    if (!corners || !imgRef.current || !imgNaturalSize) return;
    setProcessing(true);

    // Dar tiempo a React para renderizar el estado 'processing' antes de bloquear el hilo principal
    await new Promise(r => setTimeout(r, 50));

    try {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = imgNaturalSize.w;
      srcCanvas.height = imgNaturalSize.h;
      const ctx = srcCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imgRef.current, 0, 0);

      const widthTop = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
      const widthBottom = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
      const heightLeft = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
      const heightRight = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);

      const outW = Math.round(Math.max(widthTop, widthBottom));
      const outH = Math.round(Math.max(heightLeft, heightRight));

      const warped = warpPerspective(srcCanvas, corners, outW, outH);
      const enhanced = enhanceImage(warped);
      
      const finalDataUrl = enhanced.toDataURL('image/jpeg', 0.92);
      onComplete(finalDataUrl);
    } catch (e) {
      console.error("Error procesando imagen:", e);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Render SVG polygon
  let polygonPoints = "";
  let handleElements = null;

  if (corners && imgRef.current) {
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = rect.width / imgNaturalSize!.w;
    const scaleY = rect.height / imgNaturalSize!.h;
    
    polygonPoints = corners.map(c => `${c.x * scaleX},${c.y * scaleY}`).join(' ');

    handleElements = corners.map((c, i) => (
      <div
        key={i}
        onPointerDown={(e) => handlePointerDown(i, e)}
        style={{
          position: 'absolute',
          left: `${c.x * scaleX}px`,
          top: `${c.y * scaleY}px`,
          width: '32px',
          height: '32px',
          marginLeft: '-16px',
          marginTop: '-16px',
          borderRadius: '50%',
          backgroundColor: '#2f6f5e',
          border: '3px solid #fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          cursor: 'grab',
          touchAction: 'none',
          pointerEvents: 'auto',
          zIndex: 10
        }}
      />
    ));
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4" style={{ touchAction: 'none' }}>
      <div className="text-white text-lg font-bold mb-2">Ajuste de Escáner Profesional</div>
      <div className="bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-lg text-xs font-medium mb-4 flex items-center justify-center gap-2 max-w-sm text-center">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        Arrastre los 4 puntos azules hacia las 4 esquinas reales de su documento para aplanarlo.
      </div>
      
      <div 
        ref={containerRef}
        className="relative flex justify-center items-center w-full max-w-2xl bg-black/50 rounded-lg overflow-hidden select-none"
        style={{ height: '60vh' }}
      >
        <img 
          ref={imgRef}
          src={rotatedSrc}
          alt="Document to scan"
          className="max-w-full max-h-full object-contain pointer-events-none"
          onLoad={initCorners}
        />
        
        {corners && (
          <div className="absolute inset-0 flex justify-center items-center">
            {/* SVG debe estar posicionado exactamente sobre la imagen real renderizada */}
            <div style={{ position: 'relative', width: imgRef.current?.width || 0, height: imgRef.current?.height || 0 }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <polygon 
                  points={polygonPoints} 
                  fill="rgba(47,111,94,0.3)" 
                  stroke="#2f6f5e" 
                  strokeWidth="2" 
                />
              </svg>
              {handleElements}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-6 w-full max-w-sm justify-center">
        <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20" onClick={onClose} disabled={processing}>
          Cancelar
        </Button>
        <Button variant="secondary" className="bg-slate-700 text-white hover:bg-slate-600 border-none" onClick={handleRotate} disabled={processing}>
          <RotateCw className="w-4 h-4 mr-2" /> Rotar
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6" onClick={handleApply} disabled={processing || !corners}>
          {processing ? 'Escaneando...' : 'Aplicar Escáner'}
        </Button>
      </div>
    </div>
  );
};
