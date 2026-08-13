const RE = 6371.00877
const GRID = 5.0
const SLAT1 = 30.0
const SLAT2 = 60.0
const OLON = 126.0
const OLAT = 38.0
const XO = 43
const YO = 136

const toRadians = (degree) => (degree * Math.PI) / 180

// 기상청 동네예보용 Lambert Conformal Conic 격자 변환식
export const toKmaGrid = (latitude, longitude) => {
  const re = RE / GRID
  const slat1 = toRadians(SLAT1)
  const slat2 = toRadians(SLAT2)
  const olon = toRadians(OLON)
  const olat = toRadians(OLAT)

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + toRadians(latitude) * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = toRadians(longitude) - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  }
}
