// Lectura local de una foto. No sube archivos ni define requisitos del backend.
export async function readProductPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Selecciona una foto JPG, PNG o WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La foto supera el límite local de 5 MB.');
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la foto. Selecciónala nuevamente.'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la foto.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = src;
  try { await image.decode(); } catch { throw new Error('El archivo no contiene una imagen que se pueda mostrar.'); }
  return src;
}
