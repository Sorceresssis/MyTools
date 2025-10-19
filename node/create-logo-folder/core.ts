import type { SrvRecord } from 'node:dns'
import nodepath from 'node:path'

import fse from 'fs-extra'
import { JSDOM } from 'jsdom'
// @ts-ignore - png-to-ico 没有类型定义
import pngToIco from 'png-to-ico'
import sharp from 'sharp'


interface LogoConfig {
  addCircle: boolean;
  sizeInCircle?: number;
  circleColor?: string;
}

const logosConfig: Record<string, LogoConfig> = fse.readJSONSync(nodepath.join(import.meta.dirname, 'assets', 'logos.json'))

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

  const logoSvg = normalizeLogo(logoPath)
  // const logoSvg = fse.readFileSync(logoPath, 'utf-8')

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

  const pngBuffer = await sharp(Buffer.from(svgString, 'utf-8'))
    .resize(256, 256)
    .png()
    .toBuffer()

  const icoBuffer = await pngToIco(pngBuffer, outputPath)
  fse.writeFileSync(outputPath, icoBuffer)
}


function normalizeLogo(logoPath: string): string {
  const logoConfig = logosConfig[nodepath.basename(logoPath, '.svg')]
  if (logoConfig && logoConfig.addCircle) {
    return createCircleLogoSvg({
      circleSize: 256,
      circleColor: logoConfig.circleColor ?? '#ffffff',
      logoSvgPath: logoPath,
      logoSize: logoConfig.sizeInCircle ?? 138,
    })
  } else {
    return fse.readFileSync(logoPath, 'utf-8')
  }
}


interface CreateCircleLogoSvgOptions {
  circleSize: number; // 圆形直径和画布尺寸
  circleColor: string; // 圆形颜色
  logoSvgPath: string; // 要叠加的SVG文件路径
  logoSize: number; // 叠加SVG的尺寸
}

export function createCircleLogoSvg({
  circleSize,
  circleColor,
  logoSvgPath,
  logoSize,
}: CreateCircleLogoSvgOptions): string {
  // 读取要叠加的SVG文件
  const s2Content = fse.readFileSync(logoSvgPath, 'utf-8')

  // 创建基础SVG (s1)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const document = dom.window.document

  // 创建SVG元素
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', circleSize.toString())
  svg.setAttribute('height', circleSize.toString())
  svg.setAttribute('viewBox', `0 0 ${circleSize} ${circleSize}`)
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // 创建圆形背景
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  const radius = circleSize / 2
  circle.setAttribute('cx', radius.toString())
  circle.setAttribute('cy', radius.toString())
  circle.setAttribute('r', radius.toString())
  circle.setAttribute('fill', circleColor)
  svg.appendChild(circle)

  // 解析s2的SVG内容
  const s2Dom = new JSDOM(s2Content, { contentType: 'text/xml' })
  const s2Svg = s2Dom.window.document.querySelector('svg')

  if (s2Svg) {
    // 创建g元素来包装s2，并设置位置和缩放
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // 计算s2的中心位置
    const s2X = (circleSize - logoSize) / 2
    const s2Y = (circleSize - logoSize) / 2

    // 获取s2的原始viewBox或尺寸
    const viewBox = s2Svg.getAttribute('viewBox')
    let s2OriginalWidth = parseFloat(s2Svg.getAttribute('width') || '100')
    let s2OriginalHeight = parseFloat(s2Svg.getAttribute('height') || '100')

    if (viewBox) {
      const vbParts = viewBox.split(/\s+/)
      s2OriginalWidth = parseFloat(vbParts[2]!)
      s2OriginalHeight = parseFloat(vbParts[3]!)
    }

    // 计算缩放比例（假设s2是正方形，取较大的边）
    const scale = logoSize / Math.max(s2OriginalWidth, s2OriginalHeight)

    // 设置transform
    g.setAttribute('transform', `translate(${s2X}, ${s2Y}) scale(${scale})`)

    // 复制s2的所有子元素到g中
    Array.from(s2Svg.children).forEach(child => {
      const imported = document.importNode(child, true)
      g.appendChild(imported)
    })

    svg.appendChild(g)
  }

  const svgString = svg.outerHTML
  return svgString
}
