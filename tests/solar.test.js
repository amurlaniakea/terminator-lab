const test = require("node:test");
const assert = require("node:assert/strict");
const Solar = require("../solar.js");

test("subsolar longitude is approximately opposite UTC hour angle", () => {
  const d = new Date("2024-03-20T12:00:00Z");
  const p = Solar.solarCoordinates(d);
  assert.ok(p.subsolarLongitude > -5 && p.subsolarLongitude < 5);
});

test("declination is near zero around March equinox", () => {
  const p = Solar.solarCoordinates(new Date("2024-03-20T03:00:00Z"));
  assert.ok(Math.abs(p.declination) < 1.5);
});

test("June solstice declination is positive and near 23.4 degrees", () => {
  const p = Solar.solarCoordinates(new Date("2024-06-20T20:00:00Z"));
  assert.ok(p.declination > 22 && p.declination < 24);
});

test("December solstice declination is negative", () => {
  const p = Solar.solarCoordinates(new Date("2024-12-21T09:00:00Z"));
  assert.ok(p.declination < -22 && p.declination > -24);
});

test("positionAt reports noon close to the subsolar point", () => {
  const d = new Date("2024-06-21T12:00:00Z");
  const s = Solar.solarCoordinates(d);
  const p = Solar.positionAt(d, s.subsolarLatitude, s.subsolarLongitude);
  assert.ok(p.elevation > 89);
});

test("invalid latitude is rejected", () => {
  assert.throws(() => Solar.positionAt(new Date(), 91, 0), RangeError);
});
