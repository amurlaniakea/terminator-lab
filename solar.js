/**
 * Solar position engine — NOAA-style low-precision equations.
 * No dependencies. All public times are JavaScript Date instances (UTC).
 *
 * Accuracy note: this is an educational/visualization model, not a
 * high-precision ephemeris. See README.md for assumptions and limitations.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.Solar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const DAY_MS = 86400000;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const wrap180 = (degrees) => ((degrees + 180) % 360 + 360) % 360 - 180;
  const wrap360 = (degrees) => ((degrees % 360) + 360) % 360;

  function dayOfYearUTC(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((Date.UTC(
      date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()
    ) - start) / DAY_MS) + 1;
  }

  /**
   * NOAA fractional year, equation of time and solar declination.
   * The day count is adjusted for leap years to keep the annual phase smooth.
   */
  function solarCoordinates(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
      throw new TypeError("solarCoordinates espera un objeto Date válido.");
    }

    const year = date.getUTCFullYear();
    const n = dayOfYearUTC(date);
    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
    const utcHours =
      date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600 +
      date.getUTCMilliseconds() / 3600000;

    // NOAA fractional year angle, in radians.
    const gamma = (2 * Math.PI / daysInYear) * (n - 1 + (utcHours - 12) / 24);
    const g = gamma;
    const equationOfTimeMinutes = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g)
    );

    const declinationRad =
      0.006918 -
      0.399912 * Math.cos(g) +
      0.070257 * Math.sin(g) -
      0.006758 * Math.cos(2 * g) +
      0.000907 * Math.sin(2 * g) -
      0.002697 * Math.cos(3 * g) +
      0.00148 * Math.sin(3 * g);

    const declination = declinationRad * RAD;

    // Solar noon occurs when true solar time = 12:00.
    // TST = UTC minutes + EoT + 4 * longitude (east positive).
    const utcMinutes = utcHours * 60;
    const subsolarLongitude = wrap180((720 - utcMinutes - equationOfTimeMinutes) / 4);

    return {
      date: new Date(date.getTime()),
      dayOfYear: n,
      fractionalYear: gamma,
      equationOfTimeMinutes,
      declination,
      subsolarLatitude: declination,
      subsolarLongitude
    };
  }

  /**
   * Local solar geometry for a geographic point.
   * Hour angle is positive westward; longitude is positive eastward.
   */
  function positionAt(date, latitude, longitude) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new RangeError("La latitud debe estar entre -90° y 90°.");
    }
    if (!Number.isFinite(longitude)) throw new TypeError("Longitud no válida.");

    const solar = solarCoordinates(date);
    const utcMinutes =
      date.getUTCHours() * 60 +
      date.getUTCMinutes() +
      date.getUTCSeconds() / 60 +
      date.getUTCMilliseconds() / 60000;

    const trueSolarTime = ((utcMinutes + solar.equationOfTimeMinutes + 4 * longitude) % 1440 + 1440) % 1440;
    const hourAngle = trueSolarTime / 4 - 180;

    const lat = latitude * DEG;
    const dec = solar.declination * DEG;
    const h = hourAngle * DEG;

    const sinElevation = clamp(
      Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(h),
      -1, 1
    );
    const elevation = Math.asin(sinElevation) * RAD;
    const zenith = 90 - elevation;

    return {
      ...solar,
      trueSolarTimeMinutes: trueSolarTime,
      hourAngle,
      elevation,
      zenith,
      isDay: elevation > 0
    };
  }

  return Object.freeze({
    solarCoordinates,
    positionAt,
    dayOfYearUTC,
    wrap180
  });
});
