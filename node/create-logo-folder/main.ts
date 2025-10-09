import nodepath from 'node:path'

import fse from 'fs-extra'

import { createLogoFolderIcon } from './core'


const backgroundPath = nodepath.join(import.meta.dirname, 'assets', 'background', 'windows11-empty.svg')
const logosPath = nodepath.join(import.meta.dirname, 'assets', 'logos')
const foldersSavedPath = nodepath.join(import.meta.dirname, 'runs')


fse.readdirSync(logosPath).forEach(logofile => {
  if (!logofile.endsWith('.svg')) {
    return
  }

  const logoPath = nodepath.join(logosPath, logofile)
  const logoFolderName = `${nodepath.basename(logofile, '.svg')}_${nodepath.basename(backgroundPath, '.svg')}.ico`
  fse.mkdirSync(foldersSavedPath, { recursive: true })
  const logoFolderPath = nodepath.join(foldersSavedPath, logoFolderName)

  createLogoFolderIcon({
    backgroundPath,
    logoPath,
    outputPath: logoFolderPath,
    folderSize: 200,
    logoSize: 100,
    logoPosition: [0.95, 0.805],
    logoTranslation: [-1, -1],
  })
})
