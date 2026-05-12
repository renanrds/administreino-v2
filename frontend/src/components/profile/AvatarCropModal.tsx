import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { getCroppedImageBlob } from '../../utils/cropImage';

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

export default function AvatarCropModal({ imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixelsValue: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      });
      onConfirm(blob);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-bold text-white">Recortar Foto (4x4)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              disabled={loading || !croppedAreaPixels}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
            >
              {loading ? 'Aplicando...' : 'Confirmar'}
            </button>
            <button onClick={onCancel} className="p-2 rounded-lg" style={{ color: 'var(--color-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative h-[48vh] sm:h-80 flex-shrink-0" style={{ background: '#0b1022' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={true}
          />
        </div>

        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <label className="block text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-muted)' }}>
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="p-4 flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold"
            style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !croppedAreaPixels}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
          >
            <Check size={16} />
            {loading ? 'Aplicando...' : 'Usar Foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
