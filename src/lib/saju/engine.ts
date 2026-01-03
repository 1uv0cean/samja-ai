// 만세력 계산 로직
// korean-lunar-calendar 라이브러리를 사용한 사주팔자 계산
// 한국천문연구원(KARI) 기준 정확한 간지 계산

import KoreanLunarCalendar from 'korean-lunar-calendar';

// 천간(天干) - 10개
const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
// 지지(地支) - 12개
const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

// 오행(五行)
const FIVE_ELEMENTS: Record<string, string> = {
  갑: '목(木)', 을: '목(木)',
  병: '화(火)', 정: '화(火)',
  무: '토(土)', 기: '토(土)',
  경: '금(金)', 신: '금(金)',
  임: '수(水)', 계: '수(水)',
};

// 띠 (12지신)
const ZODIAC_ANIMALS: Record<string, string> = {
  자: '쥐', 축: '소', 인: '호랑이', 묘: '토끼',
  진: '용', 사: '뱀', 오: '말', 미: '양',
  신: '원숭이', 유: '닭', 술: '개', 해: '돼지',
};

// 시간대별 시주 지지 (시간 → 지지 인덱스)
const HOUR_TO_BRANCH_INDEX: Record<number, number> = {
  23: 0, 0: 0,   // 자시 (23-01시)
  1: 1, 2: 1,    // 축시 (01-03시)
  3: 2, 4: 2,    // 인시 (03-05시)
  5: 3, 6: 3,    // 묘시 (05-07시)
  7: 4, 8: 4,    // 진시 (07-09시)
  9: 5, 10: 5,   // 사시 (09-11시)
  11: 6, 12: 6,  // 오시 (11-13시)
  13: 7, 14: 7,  // 미시 (13-15시)
  15: 8, 16: 8,  // 신시 (15-17시)
  17: 9, 18: 9,  // 유시 (17-19시)
  19: 10, 20: 10, // 술시 (19-21시)
  21: 11, 22: 11, // 해시 (21-23시)
};

// 오행 상생상극 관계
const ELEMENT_RELATIONS: Record<string, Record<string, '상생' | '상극' | '비화'>> = {
  '목': { '목': '비화', '화': '상생', '토': '상극', '금': '상극', '수': '상생' },
  '화': { '목': '상생', '화': '비화', '토': '상생', '금': '상극', '수': '상극' },
  '토': { '목': '상극', '화': '상생', '토': '비화', '금': '상생', '수': '상극' },
  '금': { '목': '상극', '화': '상극', '토': '상생', '금': '비화', '수': '상생' },
  '수': { '목': '상생', '화': '상극', '토': '상극', '금': '상생', '수': '비화' },
};

// 오행 추출 (한글에서)
function getElementFromKorean(element: string): string {
  const match = element.match(/([목화토금수])/);
  return match ? match[1] : '';
}

// 대운 데이터
export interface DaewoonData {
  startAge: number;          // 대운 시작 나이
  pillars: string[];         // 대운 간지 리스트 (10개)
  currentDaewoon: string;    // 현재 대운
  currentDaewoonAge: number; // 현재 대운 시작 나이
  nextDaewoonAge: number;    // 다음 대운 시작 나이
  currentDaewoonElement: string; // 현재 대운의 오행
  isForward: boolean;        // 순행 여부
}

// 세운 데이터
export interface SewoonData {
  year: number;
  pillar: string;
  element: string;
  relation: '상생' | '상극' | '비화' | '중립';
  description: string;
}

export interface SajuData {
  yearPillar: string;   // 년주
  monthPillar: string;  // 월주
  dayPillar: string;    // 일주
  hourPillar: string;   // 시주 (시간 모름일 경우 빈 문자열)
  dayMaster: string;    // 일간 (본인 기준)
  dayMasterElement: string; // 일간의 오행
  zodiacAnimal: string; // 띠
  isHourUnknown: boolean; // 시간 모름 여부
  // 대운/세운 (확장 필드)
  daewoon?: DaewoonData;
  currentSewoon?: SewoonData;
  upcomingSewoon?: SewoonData[];
}

export interface BirthInfo {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;        // -1이면 시간 모름
  minute: number;      // 분 (시간 모름일 경우 0)
  isLunar: boolean;
  isLeapMonth: boolean; // 윤달 여부
  gender: 'male' | 'female';
}

/**
 * 간지 문자열에서 천간과 지지를 분리
 * 예: "갑자년" -> { stem: "갑", branch: "자" }
 */
function parseGapja(gapjaString: string): { stem: string; branch: string } {
  // "갑자년", "병오월", "임오일" 형식에서 추출
  const stem = gapjaString.charAt(0);
  const branch = gapjaString.charAt(1);
  return { stem, branch };
}

/**
 * 천간의 인덱스 반환
 */
function getStemIndex(stem: string): number {
  return HEAVENLY_STEMS.indexOf(stem as typeof HEAVENLY_STEMS[number]);
}

/**
 * 시주 천간 계산 (일간에 따라 결정)
 * 갑기일 → 갑자시 시작, 을경일 → 병자시 시작, 병신일 → 무자시 시작, 정임일 → 경자시 시작, 무계일 → 임자시 시작
 */
function getHourStem(dayStemIndex: number, hourBranchIndex: number): number {
  const hourStemBase = [0, 2, 4, 6, 8]; // 갑, 을, 병, 정, 무 순서별 자시 시작 천간
  const baseIndex = hourStemBase[dayStemIndex % 5];
  return (baseIndex + hourBranchIndex) % 10;
}

/**
 * 지지의 인덱스 반환
 */
function getBranchIndex(branch: string): number {
  return EARTHLY_BRANCHES.indexOf(branch as typeof EARTHLY_BRANCHES[number]);
}

/**
 * 60갑자에서 간지 생성
 */
function getGapjaByIndex(index: number): string {
  const normalizedIndex = ((index % 60) + 60) % 60;
  const stemIndex = normalizedIndex % 10;
  const branchIndex = normalizedIndex % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * 간지에서 60갑자 인덱스 계산
 */
function getGapjaIndex(stem: string, branch: string): number {
  const stemIndex = getStemIndex(stem);
  const branchIndex = getBranchIndex(branch);
  
  // 60갑자 순환에서 위치 찾기
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stemIndex && i % 12 === branchIndex) {
      return i;
    }
  }
  return 0;
}

/**
 * 순행/역행 결정
 * 남자 + 양년생(갑병무경임) → 순행
 * 남자 + 음년생(을정기신계) → 역행
 * 여자는 반대
 */
function isForwardDaewoon(gender: 'male' | 'female', yearStem: string): boolean {
  const yangStems = ['갑', '병', '무', '경', '임'];
  const isYangYear = yangStems.includes(yearStem);
  
  if (gender === 'male') {
    return isYangYear; // 남자 양년생 = 순행
  } else {
    return !isYangYear; // 여자 음년생 = 순행
  }
}

/**
 * 대운 시작 나이 계산 (간소화 버전)
 * 실제로는 생일~절기 사이 일수를 계산해야 하지만
 * 여기서는 월 기준 근사 계산 사용
 */
function calculateDaewoonStartAge(birthMonth: number, isForward: boolean): number {
  // 절기 기준 근사 계산: 해당 월에서 절기까지의 거리를 기반으로
  // 간소화: 1~3세 사이로 시작 (실제로는 더 정밀하게 계산해야 함)
  const monthOffset = isForward ? (12 - birthMonth) : birthMonth;
  const startAge = Math.round(monthOffset / 3) + 1;
  return Math.max(1, Math.min(startAge, 9)); // 1~9세 사이
}

/**
 * 대운(大運) 계산
 */
function calculateDaewoon(
  birthInfo: BirthInfo,
  monthPillar: string,
  yearStem: string,
): DaewoonData {
  const isForward = isForwardDaewoon(birthInfo.gender, yearStem);
  const startAge = calculateDaewoonStartAge(birthInfo.month, isForward);
  
  // 월주에서 대운 시작
  const monthStem = monthPillar.charAt(0);
  const monthBranch = monthPillar.charAt(1);
  const startIndex = getGapjaIndex(monthStem, monthBranch);
  
  // 10개 대운 생성 (100세까지)
  const pillars: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const index = isForward ? startIndex + i : startIndex - i;
    pillars.push(getGapjaByIndex(index));
  }
  
  // 현재 나이 계산
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthInfo.year + 1; // 만 나이가 아닌 세는 나이
  
  // 현재 대운 찾기
  let currentDaewoonIndex = 0;
  let currentDaewoonAge = startAge;
  
  for (let i = 0; i < pillars.length; i++) {
    const daewoonAge = startAge + (i * 10);
    if (currentAge >= daewoonAge && currentAge < daewoonAge + 10) {
      currentDaewoonIndex = i;
      currentDaewoonAge = daewoonAge;
      break;
    }
    if (currentAge < daewoonAge) {
      currentDaewoonIndex = Math.max(0, i - 1);
      currentDaewoonAge = startAge + (currentDaewoonIndex * 10);
      break;
    }
  }
  
  const currentDaewoon = pillars[currentDaewoonIndex] || pillars[0];
  const currentDaewoonStem = currentDaewoon.charAt(0);
  
  return {
    startAge,
    pillars,
    currentDaewoon,
    currentDaewoonAge,
    nextDaewoonAge: currentDaewoonAge + 10,
    currentDaewoonElement: FIVE_ELEMENTS[currentDaewoonStem] || '',
    isForward,
  };
}

/**
 * 특정 연도의 세운(歲運) 계산
 */
function calculateSewoonForYear(year: number, dayMasterElement: string): SewoonData {
  // 년도에서 간지 계산 (1984년 = 갑자년 기준)
  const baseYear = 1984;
  const yearDiff = year - baseYear;
  const gapjaIndex = ((yearDiff % 60) + 60) % 60;
  
  const stemIndex = gapjaIndex % 10;
  const branchIndex = gapjaIndex % 12;
  
  const pillar = HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
  const yearStem = HEAVENLY_STEMS[stemIndex];
  const yearElement = FIVE_ELEMENTS[yearStem] || '';
  
  // 일간 오행과 세운 오행의 관계 분석
  const dayElement = getElementFromKorean(dayMasterElement);
  const sewoonElement = getElementFromKorean(yearElement);
  
  let relation: '상생' | '상극' | '비화' | '중립' = '중립';
  let description = '';
  
  if (dayElement && sewoonElement && ELEMENT_RELATIONS[dayElement]) {
    relation = ELEMENT_RELATIONS[dayElement][sewoonElement] || '중립';
    
    switch (relation) {
      case '상생':
        description = '운의 흐름이 좋고 새로운 시작에 유리한 시기';
        break;
      case '상극':
        description = '도전과 변화가 있을 수 있는 시기, 신중함 필요';
        break;
      case '비화':
        description = '비슷한 기운이 모여 힘이 강해지는 시기';
        break;
      default:
        description = '평온한 흐름의 시기';
    }
  }
  
  return {
    year,
    pillar,
    element: yearElement,
    relation,
    description,
  };
}

/**
 * 생년월일시로부터 사주팔자를 계산
 * 한국천문연구원(KARI) 기준 만세력 데이터 사용
 */
export function calculateSaju(birthInfo: BirthInfo): SajuData {
  const calendar = new KoreanLunarCalendar();
  
  // 날짜 설정
  if (birthInfo.isLunar) {
    calendar.setLunarDate(birthInfo.year, birthInfo.month, birthInfo.day, birthInfo.isLeapMonth);
  } else {
    calendar.setSolarDate(birthInfo.year, birthInfo.month, birthInfo.day);
  }
  
  // 한국천문연구원 기준 간지 가져오기
  const koreanGapja = calendar.getKoreanGapja();
  
  // 년주, 월주, 일주 파싱
  const yearGapja = parseGapja(koreanGapja.year);
  const monthGapja = parseGapja(koreanGapja.month);
  const dayGapja = parseGapja(koreanGapja.day);
  
  const yearPillar = yearGapja.stem + yearGapja.branch;
  const monthPillar = monthGapja.stem + monthGapja.branch;
  const dayPillar = dayGapja.stem + dayGapja.branch;
  const dayMaster = dayGapja.stem;
  const dayMasterElement = FIVE_ELEMENTS[dayMaster] || '';
  
  // 시주 계산 (시간을 모르면 빈 문자열)
  let hourPillar = '';
  const isHourUnknown = birthInfo.hour < 0;
  
  if (!isHourUnknown) {
    const dayStemIndex = getStemIndex(dayMaster);
    const hourBranchIndex = HOUR_TO_BRANCH_INDEX[birthInfo.hour];
    const hourStemIndex = getHourStem(dayStemIndex, hourBranchIndex);
    hourPillar = HEAVENLY_STEMS[hourStemIndex] + EARTHLY_BRANCHES[hourBranchIndex];
  }
  
  // 띠 계산 (년지 기준)
  const zodiacAnimal = ZODIAC_ANIMALS[yearGapja.branch] || '';
  
  // 대운 계산
  const daewoon = calculateDaewoon(birthInfo, monthPillar, yearGapja.stem);
  
  // 세운 계산 (현재 연도 + 향후 3년)
  const currentYear = new Date().getFullYear();
  const currentSewoon = calculateSewoonForYear(currentYear, dayMasterElement);
  const upcomingSewoon: SewoonData[] = [];
  for (let i = 1; i <= 3; i++) {
    upcomingSewoon.push(calculateSewoonForYear(currentYear + i, dayMasterElement));
  }
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterElement,
    zodiacAnimal,
    isHourUnknown,
    daewoon,
    currentSewoon,
    upcomingSewoon,
  };
}

/**
 * 사주 데이터를 기반으로 간단한 운세 해석
 */
export function interpretSaju(sajuData: SajuData): string {
  const { dayMaster, dayMasterElement, zodiacAnimal, yearPillar, monthPillar, dayPillar, hourPillar, isHourUnknown } = sajuData;
  
  const pillars = isHourUnknown 
    ? `${yearPillar}년 ${monthPillar}월 ${dayPillar}일 (시주 미상)`
    : `${yearPillar}년 ${monthPillar}월 ${dayPillar}일 ${hourPillar}시`;
  
  return `사주팔자: ${pillars}
일간(日干): ${dayMaster} (${dayMasterElement})
띠: ${zodiacAnimal}띠

당신의 일간은 ${dayMaster}(${dayMasterElement})입니다. 이것이 당신의 본성과 성향을 나타냅니다.`;
}

/**
 * 사주 데이터를 본능 에이전트용 컨텍스트로 변환
 */
export function formatSajuForAgent(birthInfo: BirthInfo, sajuData: SajuData): string {
  const genderText = birthInfo.gender === 'male' ? '남성' : '여성';
  const calendarText = birthInfo.isLunar ? '음력' : '양력';
  
  const timeText = sajuData.isHourUnknown 
    ? '(시간 미상)' 
    : `${birthInfo.hour.toString().padStart(2, '0')}:${birthInfo.minute.toString().padStart(2, '0')}`;
  
  // 대운 정보 문자열
  let daewoonInfo = '';
  if (sajuData.daewoon) {
    const { currentDaewoon, currentDaewoonAge, nextDaewoonAge, currentDaewoonElement, isForward } = sajuData.daewoon;
    daewoonInfo = `
## 대운(大運) 정보 - 10년 단위 운세 흐름
- 현재 대운: ${currentDaewoon} (${currentDaewoonElement})
- 대운 기간: ${currentDaewoonAge}세 ~ ${nextDaewoonAge - 1}세
- 운행 방향: ${isForward ? '순행' : '역행'}
- 대운 의미: 현재 ${currentDaewoonElement.replace(/[()]/g, '')} 기운이 강한 시기`;
  }
  
  // 세운 정보 문자열
  let sewoonInfo = '';
  if (sajuData.currentSewoon) {
    const { year, pillar, element, relation, description } = sajuData.currentSewoon;
    sewoonInfo = `
## 세운(歲運) 정보 - 연도별 운세
### ${year}년 (올해) - ${pillar} (${element})
- 일간과의 관계: ${relation}
- 해석: ${description}`;
  }
  
  // 향후 세운 예측
  let upcomingSewoonInfo = '';
  if (sajuData.upcomingSewoon && sajuData.upcomingSewoon.length > 0) {
    upcomingSewoonInfo = `
### 향후 운세 흐름`;
    for (const sewoon of sajuData.upcomingSewoon) {
      upcomingSewoonInfo += `
- ${sewoon.year}년 ${sewoon.pillar}: ${sewoon.relation} (${sewoon.description})`;
    }
  }
  
  // 좋은 시기 찾기
  let goodTimingAdvice = '';
  if (sajuData.upcomingSewoon) {
    const goodYears = sajuData.upcomingSewoon.filter(s => s.relation === '상생' || s.relation === '비화');
    const challengingYears = sajuData.upcomingSewoon.filter(s => s.relation === '상극');
    
    if (goodYears.length > 0) {
      goodTimingAdvice += `\n✅ 좋은 시기: ${goodYears.map(y => y.year + '년').join(', ')} - 새로운 시작에 유리`;
    }
    if (challengingYears.length > 0) {
      goodTimingAdvice += `\n⚠️ 신중할 시기: ${challengingYears.map(y => y.year + '년').join(', ')} - 준비와 계획 필요`;
    }
  }
  
  return `# 사용자 사주 정보
이름: ${birthInfo.name}
성별: ${genderText}
생년월일시: ${calendarText} ${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${timeText}

## 사주 명식 (한국천문연구원 만세력 기준)
- 년주(年柱): ${sajuData.yearPillar}
- 월주(月柱): ${sajuData.monthPillar}
- 일주(日柱): ${sajuData.dayPillar}
- 시주(時柱): ${sajuData.hourPillar || '미상'}

일간(日干/Day Master): ${sajuData.dayMaster} (${sajuData.dayMasterElement})
띠: ${sajuData.zodiacAnimal}띠
${daewoonInfo}
${sewoonInfo}
${upcomingSewoonInfo}
${goodTimingAdvice}

⚠️ 중요: 위 대운/세운 정보를 기반으로 구체적인 시기(연도)를 언급할 때는 반드시 이 데이터를 참조하라. 
임의로 시기를 만들어내지 말고, 상생/상극/비화 관계에 따라 적절한 조언을 제공하라.`;
}
