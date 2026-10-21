import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { getPosition, getTimes } from 'suncalc'
import type { SunSettings } from '../core/model'

export interface SunResult {
  instant: Date
  altitudeDeg: number
  azimuthNorthDeg: number
  sceneDirection: { x: number; y: number; z: number }
  isAboveHorizon: boolean
  localLabel: string
  zoneLabel: string
  sunriseLabel: string | null
  sunsetLabel: string | null
}

export function calculateSun(settings: SunSettings): SunResult {
  assertSettings(settings)
  const instant = localDateTimeToInstant(settings.localDateTime, settings.timeZone)
  const position = getPosition(instant, settings.latitude, settings.longitude)
  const altitudeDeg = radiansToDegrees(position.altitude)
  const azimuthNorthDeg = normalizeDegrees(radiansToDegrees(position.azimuth) + 180)
  const roomAzimuth = degreesToRadians(
    normalizeDegrees(azimuthNorthDeg - settings.northOffsetDeg),
  )
  const horizontal = Math.cos(position.altitude)
  const times = getTimes(instant, settings.latitude, settings.longitude)
  return {
    instant,
    altitudeDeg,
    azimuthNorthDeg,
    sceneDirection: {
      x: Math.sin(roomAzimuth) * horizontal,
      y: Math.sin(position.altitude),
      z: -Math.cos(roomAzimuth) * horizontal,
    },
    isAboveHorizon: position.altitude > 0,
    localLabel: formatInTimeZone(instant, settings.timeZone, 'dd.MM.yyyy, HH:mm'),
    zoneLabel: formatInTimeZone(instant, settings.timeZone, 'zzz (XXX)'),
    sunriseLabel: validTimeLabel(times.sunrise, settings.timeZone),
    sunsetLabel: validTimeLabel(times.sunset, settings.timeZone),
  }
}

export function localDateTimeToInstant(localDateTime: string, timeZone: string): Date {
  const instant = fromZonedTime(localDateTime, timeZone)
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Datum oder Uhrzeit ist ungültig.')
  }
  const roundTrip = formatInTimeZone(instant, timeZone, "yyyy-MM-dd'T'HH:mm")
  if (roundTrip !== localDateTime) {
    throw new RangeError(
      'Diese lokale Uhrzeit existiert wegen der Zeitumstellung nicht.',
    )
  }
  return instant
}

export function addLocalMinutes(localDateTime: string, minutes: number): string {
  const [datePart, timePart] = localDateTime.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const neutral = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes))
  return neutral.toISOString().slice(0, 16)
}

function assertSettings(settings: SunSettings): void {
  if (settings.latitude < -90 || settings.latitude > 90) {
    throw new RangeError('Breitengrad muss zwischen −90° und 90° liegen.')
  }
  if (settings.longitude < -180 || settings.longitude > 180) {
    throw new RangeError('Längengrad muss zwischen −180° und 180° liegen.')
  }
  try {
    new Intl.DateTimeFormat('de-DE', { timeZone: settings.timeZone }).format()
  } catch {
    throw new RangeError('Die IANA-Zeitzone ist ungültig.')
  }
}

function validTimeLabel(date: Date | null | undefined, timeZone: string): string | null {
  if (!date || Number.isNaN(date.getTime())) return null
  return formatInTimeZone(date, timeZone, 'HH:mm')
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}
