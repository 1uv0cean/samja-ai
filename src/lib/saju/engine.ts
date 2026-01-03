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

export interface SajuData {
  yearPillar: string;   // 년주
  monthPillar: string;  // 월주
  dayPillar: string;    // 일주
  hourPillar: string;   // 시주 (시간 모름일 경우 빈 문자열)
  dayMaster: string;    // 일간 (본인 기준)
  dayMasterElement: string; // 일간의 오행
  zodiacAnimal: string; // 띠
  isHourUnknown: boolean; // 시간 모름 여부
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
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterElement: FIVE_ELEMENTS[dayMaster] || '',
    zodiacAnimal,
    isHourUnknown,
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
  
  return `# 사용자 사주 정보
이름: ${birthInfo.name}
성별: ${genderText}
생년월일시: ${calendarText} ${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${timeText}

사주 명식 (한국천문연구원 만세력 기준):
- 년주(年柱): ${sajuData.yearPillar}
- 월주(月柱): ${sajuData.monthPillar}
- 일주(日柱): ${sajuData.dayPillar}
- 시주(時柱): ${sajuData.hourPillar || '미상'}

일간(日干/Day Master): ${sajuData.dayMaster} (${sajuData.dayMasterElement})
띠: ${sajuData.zodiacAnimal}띠

이 사주 정보를 바탕으로 사용자의 질문에 운명론적 관점에서 조언하라.`;
}
