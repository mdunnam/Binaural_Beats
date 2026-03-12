import type { NoiseType } from '../types'

export function createNoiseBuffer(
  context: AudioContext | OfflineAudioContext,
  type: Exclude<NoiseType, 'none'>,
): AudioBufferSourceNode {
  const bufferSize = Math.ceil(context.sampleRate * 3)
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else if (type === 'blue') {
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      data[i] = (w - last) * 0.5
      last = w
    }
  } else if (type === 'violet') {
    let last = 0, prev = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      const blue = w - last
      data[i] = (blue - prev) * 0.25
      prev = blue
      last = w
    }
  } else {
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start()
  return source
}
