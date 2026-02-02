import crypto from 'crypto'

const TIME_PART_LENGTH = 13
const COUNTER_PART_LENGTH = 4

let lastTimestamp = 0
let lastCounter = 0

const padStart = (value: string, length: number) =>
  value.padStart(length, '0')

export const generateSortKey = () => {
  const now = Date.now()
  if (now === lastTimestamp) {
    lastCounter += 1
  } else {
    lastTimestamp = now
    lastCounter = 0
  }

  const timePart = padStart(String(now), TIME_PART_LENGTH)
  const counterPart = padStart(lastCounter.toString(36), COUNTER_PART_LENGTH)
  const randomPart = crypto.randomBytes(4).toString('hex')

  return `${timePart}${counterPart}${randomPart}`
}
