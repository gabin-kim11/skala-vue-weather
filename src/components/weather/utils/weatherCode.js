const weatherCodeTable = [
  { codes: [0], label: '맑음', icon: '☀️', sentence: '맑고 깨끗한 하늘이 펼쳐져 있어요.' },
  { codes: [1, 2], label: '대체로 맑음', icon: '🌤️', sentence: '햇살 사이로 구름이 조금 지나가요.' },
  { codes: [3], label: '흐림', icon: '☁️', sentence: '구름이 하늘을 넓게 덮고 있어요.' },
  { codes: [45, 48], label: '안개', icon: '🌫️', sentence: '시야가 흐리니 이동할 때 주의하세요.' },
  { codes: [51, 53, 55, 56, 57], label: '이슬비', icon: '🌦️', sentence: '약한 비가 이어질 수 있어요.' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: '비', icon: '🌧️', sentence: '외출할 때 우산을 준비하세요.' },
  { codes: [71, 73, 75, 77, 85, 86], label: '눈', icon: '🌨️', sentence: '눈길과 낮은 체감온도에 주의하세요.' },
  { codes: [95, 96, 99], label: '뇌우', icon: '⛈️', sentence: '천둥과 강한 비에 대비하세요.' },
]

export const describeWeatherCode = (code) => {
  return (
    weatherCodeTable.find((item) => item.codes.includes(code)) ?? {
      label: '알 수 없음',
      icon: '🌡️',
      sentence: '새로운 기상 데이터를 확인하고 있어요.',
    }
  )
}
