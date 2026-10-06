import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

// CRC32 Table
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c
}

function crc32Checksum(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

/**
 * 将指定文件条目打包为标准的 ZIP 格式 Buffer
 * entries = [{ filename: 'icon.png', data: Buffer }]
 */
export function createZipBuffer(entries) {
  const localHeaders = []
  const centralHeaders = []
  let offset = 0

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.filename.replace(/\\/g, '/'), 'utf-8')
    const rawData = entry.data
    const compressedData = zlib.deflateRawSync(rawData)

    const crc32 = crc32Checksum(rawData)
    const uncompressedSize = rawData.length
    const compressedSize = compressedData.length

    // Local file header (PK\x03\x04)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc32, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(fileNameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)

    const localEntry = Buffer.concat([localHeader, fileNameBuf, compressedData])
    localHeaders.push(localEntry)

    // Central directory header (PK\x01\x02)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc32, 16)
    centralHeader.writeUInt32LE(compressedSize, 20)
    centralHeader.writeUInt32LE(uncompressedSize, 24)
    centralHeader.writeUInt16LE(fileNameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    const centralEntry = Buffer.concat([centralHeader, fileNameBuf])
    centralHeaders.push(centralEntry)

    offset += localEntry.length
  }

  const centralDirBuffer = Buffer.concat(centralHeaders)
  const localHeadersBuffer = Buffer.concat(localHeaders)

  // End of central directory record (PK\x05\x06)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDirBuffer.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([localHeadersBuffer, centralDirBuffer, eocd])
}

/**
 * 解压 ZIP 格式 Buffer 到指定目标文件目录
 */
export function extractZipBuffer(zipBuf, targetDir) {
  let offset = 0
  let extractedCount = 0

  while (offset < zipBuf.length - 30) {
    const sig = zipBuf.readUInt32LE(offset)
    if (sig !== 0x04034b50) {
      break
    }

    const compMethod = zipBuf.readUInt16LE(offset + 8)
    const compSize = zipBuf.readUInt32LE(offset + 18)
    const fileNameLen = zipBuf.readUInt16LE(offset + 26)
    const extraLen = zipBuf.readUInt16LE(offset + 28)

    const fileName = zipBuf.toString('utf-8', offset + 30, offset + 30 + fileNameLen)
    const dataStart = offset + 30 + fileNameLen + extraLen
    const compData = zipBuf.subarray(dataStart, dataStart + compSize)

    if (fileName && !fileName.endsWith('/')) {
      let fileData = null
      try {
        if (compMethod === 8) {
          fileData = zlib.inflateRawSync(compData)
        } else if (compMethod === 0) {
          fileData = compData
        }
      } catch {}

      if (fileData) {
        const safeName = path.basename(fileName)
        const destPath = path.join(targetDir, safeName)
        const destDir = path.dirname(destPath)
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
        fs.writeFileSync(destPath, fileData)
        extractedCount++
      }
    }

    offset = dataStart + compSize
  }

  return extractedCount
}
