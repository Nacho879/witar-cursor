import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const iconsDir = path.join(publicDir, 'icons');
const logoPath = path.join(publicDir, 'logo.png');

// Tamaños de íconos necesarios
const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    // Verificar que logo.png existe
    if (!fs.existsSync(logoPath)) {
      console.error(`❌ Error: No se encontró el archivo logo.png en ${logoPath}`);
      process.exit(1);
    }

    // Crear directorio de íconos si no existe
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Leer el logo PNG
    const logoBuffer = fs.readFileSync(logoPath);

    // Generar cada tamaño de ícono
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(logoBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: icon-${size}x${size}.png`);
    }

    // Generar favicon.ico (32x32 como PNG, muchos navegadores lo aceptan)
    await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));

    console.log('✅ Generado: favicon.ico');

    // Generar apple-touch-icon (180x180)
    await sharp(logoBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('✅ Generado: apple-touch-icon.png');

    console.log('\n✅ Todos los íconos han sido generados exitosamente desde logo.png!');
  } catch (error) {
    console.error('❌ Error al generar íconos:', error);
    process.exit(1);
  }
}

generateIcons();

