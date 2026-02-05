// import { DateTime, Duration, Interval } from 'luxon';

// /**
//  * Utilidades de fecha usando Luxon
//  * - Todas las funciones devuelven/aceptan `DateTime` cuando es posible.
//  * - Para entradas flexibles aceptamos `string | number | Date | DateTime`.
//  */

// type DateLike = string | number | Date | DateTime;

// const DEFAULT_ZONE =
//   Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';

// function toDateTime(input?: DateLike, zone?: string): DateTime {
//   if (!input) return DateTime.now().setZone(zone || DEFAULT_ZONE);
//   if (DateTime.isDateTime(input)) return input.setZone(zone || input.zoneName);
//   if (input instanceof Date)
//     return DateTime.fromJSDate(input).setZone(zone || DEFAULT_ZONE);
//   if (typeof input === 'number')
//     return DateTime.fromMillis(input).setZone(zone || DEFAULT_ZONE);
//   // string
//   return DateTime.fromISO(input, { zone: zone || DEFAULT_ZONE });
// }

// // NOW
// export function nowUtc(): DateTime {
//   return DateTime.utc();
// }

// export function nowLocal(): DateTime {
//   return DateTime.now().setZone(DEFAULT_ZONE);
// }

// // CONVERSIÓN
// export function toUtc(input?: DateLike): DateTime {
//   return toDateTime(input).toUTC();
// }

// export function toLocal(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input).setZone(zone || DEFAULT_ZONE);
// }

// export function convertZone(input: DateLike, zone: string): DateTime {
//   return toDateTime(input).setZone(zone);
// }

// export function fromISO(iso: string, zone?: string): DateTime {
//   return DateTime.fromISO(iso, { zone: zone || DEFAULT_ZONE });
// }

// export function fromJSDate(date: Date, zone?: string): DateTime {
//   return DateTime.fromJSDate(date).setZone(zone || DEFAULT_ZONE);
// }

// export function toJSDate(input?: DateLike): Date {
//   return toDateTime(input).toJSDate();
// }

// // FORMATEO
// export function format(
//   input: DateLike,
//   fmt = "yyyy-MM-dd'T'HH:mm:ssZZ",
//   zone?: string,
// ): string {
//   return toDateTime(input, zone).toFormat(fmt);
// }

// export function formatISO(
//   input?: DateLike,
//   opts: { suppressMilliseconds?: boolean; includeOffset?: boolean } = {},
// ): string {
//   const dt = toDateTime(input);
//   if (opts.suppressMilliseconds)
//     return (
//       dt.toISO({
//         suppressMilliseconds: true,
//         includeOffset: opts.includeOffset ?? true,
//       }) || ''
//     );
//   return dt.toISO() || '';
// }

// // INICIO / FIN
// export function startOfDayUtc(input?: DateLike): DateTime {
//   return toDateTime(input).toUTC().startOf('day');
// }

// export function endOfDayUtc(input?: DateLike): DateTime {
//   return toDateTime(input).toUTC().endOf('day');
// }

// export function startOfDayLocal(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).startOf('day');
// }

// export function endOfDayLocal(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).endOf('day');
// }

// // OPERACIONES
// export function add(input: DateLike, values: DurationLike): DateTime {
//   return toDateTime(input).plus(values as any);
// }

// export function subtract(input: DateLike, values: DurationLike): DateTime {
//   return toDateTime(input).minus(values as any);
// }

// type DurationLike = {
//   years?: number;
//   months?: number;
//   weeks?: number;
//   days?: number;
//   hours?: number;
//   minutes?: number;
//   seconds?: number;
//   milliseconds?: number;
// };

// // DIFERENCIAS
// export function diffIn(
//   inputA: DateLike,
//   inputB: DateLike,
//   unit:
//     | 'milliseconds'
//     | 'seconds'
//     | 'minutes'
//     | 'hours'
//     | 'days'
//     | 'months'
//     | 'years' = 'milliseconds',
// ): number {
//   const a = toDateTime(inputA);
//   const b = toDateTime(inputB);
//   return a.diff(b, unit).as(unit as any);
// }

// export function diffObject(inputA: DateLike, inputB: DateLike) {
//   const a = toDateTime(inputA);
//   const b = toDateTime(inputB);
//   return a.diff(b).toObject();
// }

// // COMPARACIONES
// export function isBefore(inputA: DateLike, inputB: DateLike): boolean {
//   return toDateTime(inputA) < toDateTime(inputB);
// }

// export function isAfter(inputA: DateLike, inputB: DateLike): boolean {
//   return toDateTime(inputA) > toDateTime(inputB);
// }

// export function isSame(
//   inputA: DateLike,
//   inputB: DateLike,
//   unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' = 'millisecond',
// ): boolean {
//   return toDateTime(inputA).hasSame(toDateTime(inputB), unit as any);
// }

// // UTILIDADES ESPECÍFICAS
// export function utcHourToLocal(
//   utcHour: number,
//   referenceDate?: DateLike,
//   zone?: string,
// ): { localHour: number; localDateTime: DateTime } {
//   // Construye el DateTime en UTC con la hora dada y convierte a zona local
//   const ref = referenceDate
//     ? toDateTime(referenceDate).toUTC()
//     : DateTime.utc();
//   const dtUtc = ref
//     .set({ hour: utcHour, minute: 0, second: 0, millisecond: 0 })
//     .toUTC();
//   const local = dtUtc.setZone(zone || DEFAULT_ZONE);
//   return { localHour: local.hour, localDateTime: local };
// }

// export function localHourToUtc(
//   localHour: number,
//   referenceDate?: DateLike,
//   zone?: string,
// ): { utcHour: number; utcDateTime: DateTime } {
//   const ref = referenceDate
//     ? toDateTime(referenceDate, zone)
//     : DateTime.now().setZone(zone || DEFAULT_ZONE);
//   const local = ref
//     .set({ hour: localHour, minute: 0, second: 0, millisecond: 0 })
//     .setZone(zone || DEFAULT_ZONE);
//   const utc = local.toUTC();
//   return { utcHour: utc.hour, utcDateTime: utc };
// }

// export function getTimezoneOffsetMinutes(input?: DateLike): number {
//   return toDateTime(input).offset;
// }

// export function humanizeDuration(msOrDur: number | Duration): string {
//   const dur =
//     typeof msOrDur === 'number' ? Duration.fromMillis(msOrDur) : msOrDur;
//   return dur.toHuman();
// }

// export function isExpired(input: DateLike): boolean {
//   return toDateTime(input) <= DateTime.now();
// }

// // UNIX
// export function toUnixSeconds(input?: DateLike): number {
//   return Math.floor(toDateTime(input).toSeconds());
// }

// export function toUnixMillis(input?: DateLike): number {
//   return toDateTime(input).toMillis();
// }

// export function fromUnixSeconds(sec: number, zone?: string): DateTime {
//   return DateTime.fromSeconds(sec).setZone(zone || DEFAULT_ZONE);
// }

// export function fromUnixMillis(ms: number, zone?: string): DateTime {
//   return DateTime.fromMillis(ms).setZone(zone || DEFAULT_ZONE);
// }

// // RANGOS
// export function intervalContains(
//   start: DateLike,
//   end: DateLike,
//   target: DateLike,
// ): boolean {
//   const interval = Interval.fromDateTimes(toDateTime(start), toDateTime(end));
//   return interval.contains(toDateTime(target));
// }

// export function startOfWeek(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).startOf('week');
// }

// export function endOfWeek(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).endOf('week');
// }

// export function startOfMonth(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).startOf('month');
// }

// export function endOfMonth(input?: DateLike, zone?: string): DateTime {
//   return toDateTime(input, zone).endOf('month');
// }

// export default {
//   toDateTime,
//   nowUtc,
//   nowLocal,
//   toUtc,
//   toLocal,
//   convertZone,
//   fromISO,
//   fromJSDate,
//   toJSDate,
//   format,
//   formatISO,
//   startOfDayUtc,
//   endOfDayUtc,
//   startOfDayLocal,
//   endOfDayLocal,
//   add,
//   subtract,
//   diffIn,
//   diffObject,
//   isBefore,
//   isAfter,
//   isSame,
//   utcHourToLocal,
//   localHourToUtc,
//   getTimezoneOffsetMinutes,
//   humanizeDuration,
//   isExpired,
//   toUnixSeconds,
//   toUnixMillis,
//   fromUnixSeconds,
//   fromUnixMillis,
//   intervalContains,
//   startOfWeek,
//   endOfWeek,
//   startOfMonth,
//   endOfMonth,
// };
