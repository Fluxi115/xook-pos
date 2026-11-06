const MAXIMO = 400_000;

export function reducirLogo(archivo: File, lado = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    const url = URL.createObjectURL(archivo);
    imagen.onload = () => {
      const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagen.width * escala));
      canvas.height = Math.max(1, Math.round(imagen.height * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo preparar la imagen.'));
        return;
      }
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const png = archivo.type === 'image/png';
      const data = png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82);
      if (data.length > MAXIMO) {
        const compacta = canvas.toDataURL('image/jpeg', 0.72);
        if (compacta.length > MAXIMO) {
          reject(new Error('La imagen sigue siendo demasiado grande.'));
          return;
        }
        resolve(compacta);
        return;
      }
      resolve(data);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    imagen.src = url;
  });
}
