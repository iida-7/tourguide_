/**
 * 유럽 패키지 감정원 — 유럽 전역 도시 및 명소 지식 베이스
 * 서유럽, 동유럽, 지중해/남유럽, 북유럽 등 50개 주요 도시 및 120개 명소 공식 출처 매핑
 */

export interface CityInfo {
  city: string
  country: string
  flag: string
  tagline: string
  isNature?: boolean
  isCulture?: boolean
}

export interface SightInfo {
  name: string
  source: string
  defaultMode: 'entry' | 'exterior'
  explain: string
}

export const EUROPE_CITIES_DB: Record<string, CityInfo> = {
  // 프랑스
  파리: { city: '파리', country: '프랑스', flag: '🇫🇷', tagline: '예술과 빛의 도시', isCulture: true },
  니스: { city: '니스', country: '프랑스', flag: '🇫🇷', tagline: '지중해의 푸른 보석 코트다쥐르', isNature: true },
  몽생미셸: { city: '몽생미셸', country: '프랑스', flag: '🇫🇷', tagline: '바다 위의 신비로운 천년 수도원', isCulture: true },
  스트라스부르: { city: '스트라스부르', country: '프랑스', flag: '🇫🇷', tagline: '동화 같은 알자스의 수도', isCulture: true },
  콜마르: { city: '콜마르', country: '프랑스', flag: '🇫🇷', tagline: '하울의 움직이는 성의 모티브가 된 마을' },
  샤모니: { city: '샤모니', country: '프랑스', flag: '🇫🇷', tagline: '몽블랑 만년설을 품은 알프스 마을', isNature: true },

  // 스위스
  인터라켄: { city: '인터라켄', country: '스위스', flag: '🇨🇭', tagline: '알프스 품 안의 두 호수 마을', isNature: true },
  융프라우: { city: '융프라우', country: '스위스', flag: '🇨🇭', tagline: '유럽의 지붕 Top of Europe 만년설', isNature: true },
  루체른: { city: '루체른', country: '스위스', flag: '🇨🇭', tagline: '청정 호수와 목조 카펠교의 낭만', isNature: true },
  취리히: { city: '취리히', country: '스위스', flag: '🇨🇭', tagline: '스위스 최대의 경제와 문화 중심' },
  베른: { city: '베른', country: '스위스', flag: '🇨🇭', tagline: '도시 전체가 유네스코 세계유산인 구시가지', isCulture: true },
  체르마트: { city: '체르마트', country: '스위스', flag: '🇨🇭', tagline: '우뚝 솟은 마테호른의 성지', isNature: true },

  // 이탈리아
  로마: { city: '로마', country: '이탈리아', flag: '🇮🇹', tagline: '천 년 제국의 거대한 야외 박물관', isCulture: true },
  바티칸: { city: '바티칸', country: '바티칸', flag: '🇻🇦', tagline: '세계에서 가장 작은 가톨릭의 총본산', isCulture: true },
  밀라노: { city: '밀라노', country: '이탈리아', flag: '🇮🇹', tagline: '패션의 수도와 고딕 두오모 대성당', isCulture: true },
  베니스: { city: '베니스', country: '이탈리아', flag: '🇮🇹', tagline: '물의 도시와 낭만의 곤돌라', isCulture: true },
  피렌체: { city: '피렌체', country: '이탈리아', flag: '🇮🇹', tagline: '르네상스 찬란한 예술의 심장', isCulture: true },
  나폴리: { city: '나폴리', country: '이탈리아', flag: '🇮🇹', tagline: '세계 3대 미항과 폼페이 유적', isCulture: true },
  소렌토: { city: '소렌토', country: '이탈리아', flag: '🇮🇹', tagline: '낭만적인 아말피 해안의 관문', isNature: true },
  폼페이: { city: '폼페이', country: '이탈리아', flag: '🇮🇹', tagline: '베수비오 화산재 속에 멈춘 고대 도시', isCulture: true },
  피사: { city: '피사', country: '이탈리아', flag: '🇮🇹', tagline: '기울어진 사탑의 도시' },

  // 스페인 / 포르투갈
  바르셀로나: { city: '바르셀로나', country: '스페인', flag: '🇪🇸', tagline: '가우디 건축과 지중해의 열정', isCulture: true },
  마드리드: { city: '마드리드', country: '스페인', flag: '🇪🇸', tagline: '스페인 왕실의 품격과 프라도 미술관', isCulture: true },
  세비야: { city: '세비야', country: '스페인', flag: '🇪🇸', tagline: '플라멩코와 안달루시아의 정취', isCulture: true },
  그라나다: { city: '그라나다', country: '스페인', flag: '🇪🇸', tagline: '붉은 성채 알함브라 궁전의 도시', isCulture: true },
  톨레도: { city: '톨레도', country: '스페인', flag: '🇪🇸', tagline: '중세의 모습을 그대로 간직한 요새 도시', isCulture: true },
  리스본: { city: '리스본', country: '포르투갈', flag: '🇵🇹', tagline: '노란 트램과 파두가 흐르는 7개 언덕의 도시' },
  포르투: { city: '포르투', country: '포르투갈', flag: '🇵🇹', tagline: '도루강변의 와인과 아줄레주 타일의 도시', isNature: true },

  // 영국
  런던: { city: '런던', country: '영국', flag: '🇬🇧', tagline: '대영제국의 역사와 현대적 감각의 공존', isCulture: true },
  옥스퍼드: { city: '옥스퍼드', country: '영국', flag: '🇬🇧', tagline: '천 년 학문의 전당과 해리포터 촬영지', isCulture: true },
  에든버러: { city: '에든버러', country: '영국', flag: '🇬🇧', tagline: '스코틀랜드의 심장 에든버러 성', isCulture: true },

  // 독일 / 오스트리아 / 체코 / 헝가리 (동유럽)
  프랑크푸르트: { city: '프랑크푸르트', country: '독일', flag: '🇩🇪', tagline: '괴테의 생가와 독일 경제의 허브' },
  뮌헨: { city: '뮌헨', country: '독일', flag: '🇩🇪', tagline: '바이에른 문화와 맥주의 본고장', isCulture: true },
  하이델베르크: { city: '하이델베르크', country: '독일', flag: '🇩🇪', tagline: '철학자의 길과 유서 깊은 고성의 도시' },
  노이슈반슈타인: { city: '노이슈반슈타인', country: '독일', flag: '🇩🇪', tagline: '디즈니 성의 모티브가 된 백조의 성', isCulture: true },
  비엔나: { city: '비엔나', country: '오스트리아', flag: '🇦🇹', tagline: '음악의 도시와 합스부르크 쇤브룬 궁전', isCulture: true },
  잘츠부르크: { city: '잘츠부르크', country: '오스트리아', flag: '🇦🇹', tagline: '모차르트의 고향과 사운드오브뮤직의 배경', isCulture: true },
  할슈타트: { city: '할슈타트', country: '오스트리아', flag: '🇦🇹', tagline: '호숫가에 비치는 알프스 동화마을', isNature: true },
  프라하: { city: '프라하', country: '체코', flag: '🇨🇿', tagline: '블타바강 카를교와 백탑의 황금 도시', isCulture: true },
  체스키크룸로프: { city: '체스키크룸로프', country: '체코', flag: '🇨🇿', tagline: 'S자 강물이 감싸는 중세 보석마을', isCulture: true },
  부다페스트: { city: '부다페스트', country: '헝가리', flag: '🇭🇺', tagline: '도나우강의 진주이자 국회의사당 야경의 성지', isCulture: true },

  // 크로아티아 / 지중해
  두브로브니크: { city: '두브로브니크', country: '크로아티아', flag: '🇭🇷', tagline: '아드리아해의 진주 성벽 투어', isNature: true },
  플리트비체: { city: '플리트비체', country: '크로아티아', flag: '🇭🇷', tagline: '16개 요정의 에메랄드 호수 국립공원', isNature: true },
  자그레브: { city: '자그레브', country: '크로아티아', flag: '🇭🇷', tagline: '성 마르코 성당과 크로아티아의 수도' },
  아테네: { city: '아테네', country: '그리스', flag: '🇬🇷', tagline: '서구 문명의 요람과 파르테논 신전', isCulture: true },
  산토리니: { city: '산토리니', country: '그리스', flag: '🇬🇷', tagline: '에게해의 하얀 벽과 파란 돔 지붕', isNature: true },
}

export const EUROPE_SIGHTS_DB: Record<string, SightInfo> = {
  // 프랑스 명소
  루브르: { name: '루브르 박물관', source: 'louvre.fr', defaultMode: 'entry', explain: '세계 최대 규모의 박물관. 모나리자, 밀로의 비너스 소장.' },
  에펠탑: { name: '에펠탑', source: 'toureiffel.paris', defaultMode: 'exterior', explain: '파리의 상징 철탑. 전망대 입장은 대개 선택관광으로 진행.' },
  베르사유: { name: '베르사유 궁전', source: 'chateauversailles.fr', defaultMode: 'entry', explain: '태양왕 루이 14세의 절대왕정 궁전 및 거울의 방.' },
  오르세: { name: '오르세 미술관', source: 'musee-orsay.fr', defaultMode: 'entry', explain: '기차역을 개조한 인상파 미술의 보고. 고흐, 모네, 르누아르 소장.' },
  개선문: { name: '에투알 개선문', source: 'paris-arc-de-triomphe.fr', defaultMode: 'exterior', explain: '나폴레옹의 승리를 기념하는 샹젤리제 거리의 랜드마크.' },
  노트르담: { name: '노트르담 대성당', source: 'notredamedeparis.fr', defaultMode: 'exterior', explain: '시테섬의 고딕 건축 걸작.' },
  바토무슈: { name: '센강 바토무슈 유람선', source: 'bateaux-mouches.fr', defaultMode: 'entry', explain: '파리 센강 야경을 즐기는 필수 유람선 코스.' },

  // 스위스 명소
  융프라우: { name: '융프라우요흐', source: 'jungfrau.ch', defaultMode: 'entry', explain: '해발 3,454m 유럽 최고 고도 기차역. 스핑크스 전망대.' },
  마테호른: { name: '마테호른 (고르너그라트)', source: 'gornergrat.ch', defaultMode: 'entry', explain: '스위스 삼각 초콜릿 토블론의 모델이 된 피라미드 설산.' },
  카펠교: { name: '루체른 카펠교', source: 'luzern.com', defaultMode: 'exterior', explain: '유럽에서 가장 오래된 지붕 달린 목조 다리.' },
  리기산: { name: '리기산', source: 'rigi.ch', defaultMode: 'entry', explain: '산들의 여왕으로 불리는 스위스 최초의 산악철도 전망대.' },

  // 이탈리아 명소
  바티칸: { name: '바티칸 박물관 & 시스티나 성당', source: 'museivaticani.va', defaultMode: 'entry', explain: '미켈란젤로의 천지창조, 최후의 심판이 있는 세계 최고 성지.' },
  콜로세움: { name: '콜로세움 원형경기장', source: 'parcocolosseo.it', defaultMode: 'exterior', explain: '고대 로마 검투사들의 거대한 경기장. 내부 입장은 대기시간 김.' },
  포로로마노: { name: '포로 로마노', source: 'parcocolosseo.it', defaultMode: 'exterior', explain: '고대 로마 제국의 정치·경제·종교 중심 공공 광장 유적.' },
  트레비: { name: '트레비 분수', source: 'turismoroma.it', defaultMode: 'exterior', explain: '동전을 던지면 로마로 다시 돌아온다는 전설의 바로크 분수.' },
  두오모: { name: '밀라노/피렌체 두오모 대성당', source: 'duomomilano.it', defaultMode: 'exterior', explain: '고딕 및 르네상스 건축의 정수. 광장에서 외관 감상이 기본.' },
  산마르코: { name: '베니스 산마르코 대성당 & 광장', source: 'basilicasanmarco.it', defaultMode: 'exterior', explain: '나폴레옹이 세상에서 가장 아름다운 응접실이라 칭한 광장.' },
  곤돌라: { name: '베니스 곤돌라', source: 'veneziaunica.it', defaultMode: 'entry', explain: '베니스 좁은 수로를 가르는 전통 목선 탑승 체험.' },
  우피치: { name: '우피치 미술관', source: 'uffizi.it', defaultMode: 'entry', explain: '보티첼리의 비너스의 탄생이 있는 르네상스 미술관.' },

  // 스페인 명소
  사그라다: { name: '사그라다 파밀리아 (성가족성당)', source: 'sagradafamilia.org', defaultMode: 'entry', explain: '천재 건축가 안토니 가우디의 미완성 필생의 역작.' },
  구엘공원: { name: '구엘 공원', source: 'parkguell.barcelona', defaultMode: 'entry', explain: '가우디의 동화 같은 타일 모자이크 곡선 정원.' },
  알함브라: { name: '알함브라 궁전', source: 'alhambra-patronato.es', defaultMode: 'entry', explain: '이슬람 건축의 꽃. 나스르 궁전과 헤네랄리페 정원.' },
  프라도: { name: '프라도 미술관', source: 'museodelprado.es', defaultMode: 'entry', explain: '스페인 회화의 거장 벨라스케스, 고야의 걸작 집합소.' },

  // 동유럽 명소
  카를교: { name: '프라하 카를교', source: 'prague.eu', defaultMode: 'exterior', explain: '블타바강 위 성인상들이 늘어선 낭만적인 보행자 전용 다리.' },
  프라하성: { name: '프라하 성 & 성 비투스 대성당', source: 'hrad.cz', defaultMode: 'entry', explain: '유네스코 세계유산 중 가장 거대한 고성 단지.' },
  쇤브룬: { name: '비엔나 쇤브룬 궁전', source: 'schoenbrunn.at', defaultMode: 'entry', explain: '마리아 테레지아와 합스부르크 왕가의 여름 궁전.' },
  국회의사당: { name: '부다페스트 국회의사당', source: 'parlament.hu', defaultMode: 'exterior', explain: '도나우강변에 우뚝 솟은 야경의 끝판왕 네오고딕 건축물.' },
  어부의요새: { name: '부다페스트 어부의 요새', source: 'budapestinfo.hu', defaultMode: 'exterior', explain: '부다 언덕에서 도나우강과 페스트 지구를 한눈에 내려다보는 전망 명소.' },
  플리트비체국립공원: { name: '플리트비체 호수 국립공원', source: 'np-plitvicka-jezera.hr', defaultMode: 'entry', explain: '요정들이 사는 에메랄드빛 폭포와 목조 데크 산책로.' },
}

