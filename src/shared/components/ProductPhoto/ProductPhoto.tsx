import { useState } from 'react';
import './ProductPhoto.css';

export interface ProductPhotoData {
  src: string;
  alt: string;
  source: 'generated' | 'local';
}

export function ProductPhoto({ photo, eager = false }: { photo?: ProductPhotoData | null; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const available = photo && photo.src !== failedSource;
  return <figure className="product-photo">
    <div className="product-photo__frame">
      {available ? <img src={photo.src} alt={photo.alt} width={480} height={640} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSource(photo.src)} /> :
        <div className="product-photo__placeholder" role="img" aria-label="Sin foto disponible"><span aria-hidden="true">Fashion</span><span>Sin foto disponible</span></div>}
    </div>
    {available && <figcaption>{photo.source === 'generated' ? 'Imagen ilustrativa generada con IA' : 'Foto local de demostración'}</figcaption>}
  </figure>;
}
