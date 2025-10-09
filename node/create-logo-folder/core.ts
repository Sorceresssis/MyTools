// import { readFileSync, writeFileSync } from 'fs'
import fse from 'fs-extra'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'

interface CreateLogoFolderIconOptions {
  backgroundPath: string;
  logoPath: string;
  outputPath: string;
  folderSize?: number;
  logoSize?: number;
  logoPosition?: [number, number];
  logoTranslation?: [number, number];
}

export async function createLogoFolderIcon({
  backgroundPath,
  logoPath,
  outputPath,
  folderSize = 200,
  logoSize = 100,
  logoPosition = [0.5, 0.5],
  logoTranslation = [-0.5, -0.5],
}: CreateLogoFolderIconOptions): Promise<void> {
  if (!outputPath.endsWith('.ico')) {
    throw new Error('输出文件必须为 ICO 格式')
  }

  // 读取 SVG 文件
  const backgroundSvg = fse.readFileSync(backgroundPath, 'utf-8')
  const logoSvg = fse.readFileSync(logoPath, 'utf-8')

  // 使用 jsdom 解析 SVG
  const backgroundDom = new JSDOM(backgroundSvg, { contentType: 'image/svg+xml' })
  const logoDom = new JSDOM(logoSvg, { contentType: 'image/svg+xml' })

  const backgroundRoot = backgroundDom.window.document.documentElement
  const logoRoot = logoDom.window.document.documentElement

  // 设置 logo 的大小
  logoRoot.setAttribute('width', String(logoSize))
  logoRoot.setAttribute('height', String(logoSize))

  // 设置 logo 的位置
  logoRoot.setAttribute('x', String(logoPosition[0] * folderSize))
  logoRoot.setAttribute('y', String(logoPosition[1] * folderSize))

  // 进行平移
  const transformValue = `translate(${logoTranslation[0] * logoSize}, ${logoTranslation[1] * logoSize})`
  const existingTransform = logoRoot.getAttribute('transform')

  if (existingTransform) {
    logoRoot.setAttribute('transform', `${existingTransform} ${transformValue}`)
  } else {
    logoRoot.setAttribute('transform', transformValue)
  }

  // 创建新的 SVG 容器
  const svgTemplate = `<svg width="${folderSize}" height="${folderSize}" xmlns="http://www.w3.org/2000/svg"></svg>`
  const folderDom = new JSDOM(svgTemplate, { contentType: 'image/svg+xml' })
  const folderSvg = folderDom.window.document.documentElement

  // 导入并添加背景和 logo
  const importedBackground = folderDom.window.document.importNode(backgroundRoot, true)
  const importedLogo = folderDom.window.document.importNode(logoRoot, true)

  folderSvg.appendChild(importedBackground)
  folderSvg.appendChild(importedLogo)

  // 序列化并保存
  const serializer = new folderDom.window.XMLSerializer()
  const svgString = serializer.serializeToString(folderSvg)

  // fse.outputFileSync(outputPath, svgString, 'utf-8')
  await sharp(Buffer.from(svgString, 'utf-8'))
    .resize(256, 256)
    .toFile(outputPath)
}
