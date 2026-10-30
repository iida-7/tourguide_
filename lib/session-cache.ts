/**
 * 감정 결과 sessionStorage 키.
 * 엔진 출력 형식이 바뀌면 버전(v3, v4…)을 올려 옛 결과가 새 화면에 섞이지 않게 한다.
 */
export const RESULT_KEY = 'inspected_result_v3'
export const RAW_TEXT_KEY = 'inspected_raw_text_v3'
export const MONTH_KEY = 'inspected_month_v3'

const LEGACY_KEYS = [
  'inspected_result',
  'inspected_raw_text',
  'inspected_month',
  'inspected_result_v2',
  'inspected_raw_text_v2',
  'inspected_month_v2',
]

/** 이전 버전(v2 이하)의 옛 캐시를 지운다 (새 엔진 결과와 섞여 옛 화면이 뜨는 것을 막는다) */
export function purgeLegacyCache() {
  try {
    for (const k of LEGACY_KEYS) sessionStorage.removeItem(k)
  } catch {
    // sessionStorage를 쓸 수 없는 환경이면 무시
  }
}

export function clearResultCache() {
  try {
    sessionStorage.removeItem(RESULT_KEY)
    sessionStorage.removeItem(RAW_TEXT_KEY)
    sessionStorage.removeItem(MONTH_KEY)
  } catch {
    // 무시
  }
}
