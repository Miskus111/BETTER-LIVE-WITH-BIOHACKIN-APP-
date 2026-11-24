import { describe, expect, it } from 'vitest'
import { sniffLabFile } from './file-type'

const bytes = (s: string | number[]) =>
  typeof s === 'string' ? new TextEncoder().encode(s) : Uint8Array.from(s)

describe('lab report file type from its content', () => {
  it('recognises PDF, PNG, JPEG and WebP', () => {
    expect(sniffLabFile(bytes('%PDF-1.7\n...'))).toBe('application/pdf')
    expect(sniffLabFile(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png')
    expect(sniffLabFile(bytes([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg')
    expect(sniffLabFile(bytes('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe('image/webp')
  })
  it('rejects anything else, including a renamed text file and an empty one', () => {
    expect(sniffLabFile(bytes('hello, I am not a PDF'))).toBeUndefined()
    expect(sniffLabFile(bytes('<html><script>'))).toBeUndefined()
    expect(sniffLabFile(bytes('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))).toBeUndefined()
    expect(sniffLabFile(new Uint8Array())).toBeUndefined()
  })
})
