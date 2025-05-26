import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

const sizes = [64, 192, 384, 512]
const inputImage = path.resolve('src/assets/logo.png')
const outputDir = path.resolve('public')

async function generateIcons() {
  try {
    // Asegurarse de que el directorio público existe
    await fs.mkdir(outputDir, { recursive: true })

    // Generar íconos para cada tamaño
    for (const size of sizes) {
      await sharp(inputImage)
        .resize(size, size)
        .toFile(path.join(outputDir, `pwa-${size}x${size}.png`))
      console.log(`✓ Generado ícono ${size}x${size}`)
    }

    // Generar screenshot de ejemplo
    await sharp(inputImage)
      .resize(1280, 720)
      .toFile(path.join(outputDir, 'screenshot1.png'))
    console.log('✓ Generado screenshot de ejemplo')

    console.log('¡Íconos generados exitosamente!')
  } catch (error) {
    console.error('Error al generar íconos:', error)
    process.exit(1)
  }
}

generateIcons() 