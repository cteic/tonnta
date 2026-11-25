/**
 * Irish Grid (TM65 / TM75) easting and northing to WGS84 latitude and
 * longitude. The EPA publishes bathing-water positions on the Irish Grid.
 *
 * Inverse Transverse Mercator on the Airy Modified ellipsoid, then a
 * seven-parameter Helmert shift to WGS84 (position-vector convention, OSi
 * parameters). Accurate to a few metres, plenty for a beach.
 *
 * Self-contained on purpose: the registry generator script imports it
 * directly under Node's type stripping.
 */

export interface LatLon {
  latitude: number;
  longitude: number;
}

const AIRY_MODIFIED = { a: 6377340.189, b: 6356034.447 };
const WGS84 = { a: 6378137, b: 6356752.314245 };

const F0 = 1.000035;
const LAT0 = (53.5 * Math.PI) / 180;
const LON0 = (-8 * Math.PI) / 180;
const E0 = 200000;
const N0 = 250000;

const ARCSEC = Math.PI / (180 * 3600);
const HELMERT = {
  tx: 482.5,
  ty: -130.6,
  tz: 564.6,
  rx: -1.042 * ARCSEC,
  ry: -0.214 * ARCSEC,
  rz: -0.631 * ARCSEC,
  s: 8.15e-6,
};

function meridionalArc(lat: number, b: number, n: number): number {
  const n2 = n * n;
  const n3 = n2 * n;
  const d = lat - LAT0;
  const s = lat + LAT0;
  return (
    b *
    F0 *
    ((1 + n + 1.25 * n2 + 1.25 * n3) * d -
      (3 * n + 3 * n2 + 2.625 * n3) * Math.sin(d) * Math.cos(s) +
      (1.875 * n2 + 1.875 * n3) * Math.sin(2 * d) * Math.cos(2 * s) -
      (35 / 24) * n3 * Math.sin(3 * d) * Math.cos(3 * s))
  );
}

function inverseTransverseMercator(easting: number, northing: number): LatLon {
  const { a, b } = AIRY_MODIFIED;
  const e2 = 1 - (b * b) / (a * a);
  const n = (a - b) / (a + b);

  let lat = LAT0;
  let m = 0;
  do {
    lat = (northing - N0 - m) / (a * F0) + lat;
    m = meridionalArc(lat, b, n);
  } while (Math.abs(northing - N0 - m) >= 0.00001);

  const sinLat = Math.sin(lat);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;
  const tan = Math.tan(lat);
  const tan2 = tan * tan;
  const tan4 = tan2 * tan2;
  const tan6 = tan4 * tan2;
  const sec = 1 / Math.cos(lat);

  const vii = tan / (2 * rho * nu);
  const viii = (tan / (24 * rho * nu ** 3)) * (5 + 3 * tan2 + eta2 - 9 * tan2 * eta2);
  const ix = (tan / (720 * rho * nu ** 5)) * (61 + 90 * tan2 + 45 * tan4);
  const x = sec / nu;
  const xi = (sec / (6 * nu ** 3)) * (nu / rho + 2 * tan2);
  const xii = (sec / (120 * nu ** 5)) * (5 + 28 * tan2 + 24 * tan4);
  const xiia = (sec / (5040 * nu ** 7)) * (61 + 662 * tan2 + 1320 * tan4 + 720 * tan6);

  const de = easting - E0;
  return {
    latitude: lat - vii * de ** 2 + viii * de ** 4 - ix * de ** 6,
    longitude: LON0 + x * de - xi * de ** 3 + xii * de ** 5 - xiia * de ** 7,
  };
}

function toCartesian({ latitude, longitude }: LatLon, { a, b }: typeof WGS84) {
  const e2 = 1 - (b * b) / (a * a);
  const sinLat = Math.sin(latitude);
  const nu = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  return {
    x: nu * Math.cos(latitude) * Math.cos(longitude),
    y: nu * Math.cos(latitude) * Math.sin(longitude),
    z: nu * (1 - e2) * sinLat,
  };
}

function fromCartesian(
  { x, y, z }: { x: number; y: number; z: number },
  { a, b }: typeof WGS84
): LatLon {
  const e2 = 1 - (b * b) / (a * a);
  const p = Math.sqrt(x * x + y * y);
  let lat = Math.atan2(z, p * (1 - e2));
  let previous = Number.POSITIVE_INFINITY;
  while (Math.abs(lat - previous) > 1e-12) {
    previous = lat;
    const sinLat = Math.sin(lat);
    const nu = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    lat = Math.atan2(z + e2 * nu * sinLat, p);
  }
  return { latitude: lat, longitude: Math.atan2(y, x) };
}

function helmert({ x, y, z }: { x: number; y: number; z: number }) {
  const { tx, ty, tz, rx, ry, rz, s } = HELMERT;
  const scale = 1 + s;
  return {
    x: tx + scale * (x - rz * y + ry * z),
    y: ty + scale * (rz * x + y - rx * z),
    z: tz + scale * (-ry * x + rx * y + z),
  };
}

const DEGREES = 180 / Math.PI;

export function irishGridToWgs84(easting: number, northing: number): LatLon {
  const local = inverseTransverseMercator(easting, northing);
  const wgs84 = fromCartesian(helmert(toCartesian(local, AIRY_MODIFIED)), WGS84);
  return { latitude: wgs84.latitude * DEGREES, longitude: wgs84.longitude * DEGREES };
}
