'use client';

import type { BirthInfo } from '@/lib/saju/engine';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface BirthInfoModalProps {
  onSubmit: (birthInfo: BirthInfo) => void;
}

type Step = 'name' | 'gender' | 'calendar' | 'date' | 'time';

const STEPS: Step[] = ['name', 'gender', 'calendar', 'date', 'time'];

export function BirthInfoModal({ onSubmit }: BirthInfoModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [direction, setDirection] = useState(1);
  
  // Form data
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [isLunar, setIsLunar] = useState<boolean | null>(null);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [timeInput, setTimeInput] = useState('12:00');
  const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM');
  const [isTimeUnknown, setIsTimeUnknown] = useState(false);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const parseTime = () => {
    const [h, m] = timeInput.split(':').map(Number);
    return { 
      hour12: isNaN(h) ? 12 : Math.max(1, Math.min(12, h)), 
      minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)) 
    };
  };

  const getHour24 = () => {
    const { hour12 } = parseTime();
    if (amPm === 'AM') {
      return hour12 === 12 ? 0 : hour12;
    } else {
      return hour12 === 12 ? 12 : hour12 + 12;
    }
  };

  const getMinute = () => parseTime().minute;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setDirection(1);
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setDirection(-1);
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'name': return name.trim().length > 0;
      case 'gender': return gender !== null;
      case 'calendar': return isLunar !== null;
      case 'date': return true;
      case 'time': return true;
      default: return false;
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || gender === null || isLunar === null) return;

    const birthInfo: BirthInfo = {
      name: name.trim(),
      gender,
      isLunar,
      isLeapMonth: isLunar && isLeapMonth,
      year,
      month,
      day,
      hour: isTimeUnknown ? -1 : getHour24(),
      minute: isTimeUnknown ? 0 : getMinute(),
    };

    onSubmit(birthInfo);
  };

  const getSiJu = () => {
    if (isTimeUnknown) return '';
    const h = getHour24();
    if (h >= 23 || h < 1) return '자시(子時)';
    if (h >= 1 && h < 3) return '축시(丑時)';
    if (h >= 3 && h < 5) return '인시(寅時)';
    if (h >= 5 && h < 7) return '묘시(卯時)';
    if (h >= 7 && h < 9) return '진시(辰時)';
    if (h >= 9 && h < 11) return '사시(巳時)';
    if (h >= 11 && h < 13) return '오시(午時)';
    if (h >= 13 && h < 15) return '미시(未時)';
    if (h >= 15 && h < 17) return '신시(申時)';
    if (h >= 17 && h < 19) return '유시(酉時)';
    if (h >= 19 && h < 21) return '술시(戌時)';
    return '해시(亥時)';
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 md:backdrop-blur-sm md:p-6">
      {/* 모달 컨테이너 - 모바일: 전체화면, 데스크탑: 중앙 모달 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[90vh] md:w-full md:max-w-lg bg-white md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden"
      >
        {/* 헤더 */}
        <header className="flex items-center px-4 py-3 relative shrink-0">
          {currentStepIndex > 0 && (
            <button
              onClick={goBack}
              className="w-10 h-10 flex items-center justify-center text-[#191F28] -ml-2 hover:bg-[#F4F4F5] rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="flex-1" />
        </header>

        {/* 진행 바 */}
        <div className="h-1 bg-[#F4F4F5] mx-4 rounded-full overflow-hidden shrink-0">
          <motion.div
            className="h-full bg-[#3182F6] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-hidden relative min-h-[300px] md:min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-0 px-6 pt-8 pb-24 flex flex-col overflow-y-auto"
            >
              {/* Step: 이름 */}
              {currentStep === 'name' && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] mb-2">
                    이름이 뭐예요?
                  </h1>
                  <p className="text-[#6B7684] text-sm md:text-base mb-8">
                    정확한 상담을 위해 이름을 알려주세요
                  </p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canProceed()) {
                        e.preventDefault();
                        goNext();
                      }
                    }}
                    placeholder="이름을 입력하세요"
                    autoFocus
                    className="text-2xl md:text-3xl font-medium text-[#191F28] placeholder-[#D1D5DB] border-b-2 border-[#E5E8EB] focus:border-[#3182F6] outline-none py-3 transition-colors bg-transparent"
                  />
                </>
              )}

              {/* Step: 성별 */}
              {currentStep === 'gender' && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] mb-2">
                    성별을 선택해주세요
                  </h1>
                  <p className="text-[#6B7684] text-sm md:text-base mb-8">
                    사주 분석에 필요해요
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`w-full p-5 rounded-2xl text-left font-medium transition-all flex items-center gap-4 ${
                        gender === 'male'
                          ? 'bg-[#E8F3FF] border-2 border-[#3182F6] text-[#3182F6]'
                          : 'bg-[#F4F4F5] border-2 border-transparent text-[#191F28] hover:bg-[#E5E5EA]'
                      }`}
                    >
                      <span className="text-2xl">👨</span>
                      <span className="text-lg">남성</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`w-full p-5 rounded-2xl text-left font-medium transition-all flex items-center gap-4 ${
                        gender === 'female'
                          ? 'bg-[#FFE8F0] border-2 border-[#FF6B9D] text-[#FF6B9D]'
                          : 'bg-[#F4F4F5] border-2 border-transparent text-[#191F28] hover:bg-[#E5E5EA]'
                      }`}
                    >
                      <span className="text-2xl">👩</span>
                      <span className="text-lg">여성</span>
                    </button>
                  </div>
                </>
              )}

              {/* Step: 달력 */}
              {currentStep === 'calendar' && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] mb-2">
                    양력인가요, 음력인가요?
                  </h1>
                  <p className="text-[#6B7684] text-sm md:text-base mb-8">
                    생년월일의 달력 유형을 선택해주세요
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => { setIsLunar(false); setIsLeapMonth(false); }}
                      className={`w-full p-5 rounded-2xl text-left font-medium transition-all flex items-center gap-4 ${
                        isLunar === false
                          ? 'bg-[#E8F3FF] border-2 border-[#3182F6] text-[#3182F6]'
                          : 'bg-[#F4F4F5] border-2 border-transparent text-[#191F28] hover:bg-[#E5E5EA]'
                      }`}
                    >
                      <span className="text-2xl">☀️</span>
                      <div>
                        <span className="text-lg">양력</span>
                        <p className={`text-sm font-normal ${isLunar === false ? 'text-[#3182F6]/70' : 'text-[#8B95A1]'}`}>
                          일반적인 달력이에요
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLunar(true)}
                      className={`w-full p-5 rounded-2xl text-left font-medium transition-all flex items-center gap-4 ${
                        isLunar === true
                          ? 'bg-[#F3E8FF] border-2 border-[#9B59B6] text-[#9B59B6]'
                          : 'bg-[#F4F4F5] border-2 border-transparent text-[#191F28] hover:bg-[#E5E5EA]'
                      }`}
                    >
                      <span className="text-2xl">🌙</span>
                      <div>
                        <span className="text-lg">음력</span>
                        <p className={`text-sm font-normal ${isLunar === true ? 'text-[#9B59B6]/70' : 'text-[#8B95A1]'}`}>
                          구력 또는 음력으로 알고 있어요
                        </p>
                      </div>
                    </button>
                  </div>
                  
                  {isLunar && (
                    <motion.label 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 mt-6 text-[#6B7684] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isLeapMonth}
                        onChange={(e) => setIsLeapMonth(e.target.checked)}
                        className="w-5 h-5 rounded-md border-[#E5E8EB] text-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                      <span>윤달이에요</span>
                    </motion.label>
                  )}
                </>
              )}

              {/* Step: 생년월일 */}
              {currentStep === 'date' && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] mb-2">
                    생년월일을 알려주세요
                  </h1>
                  <p className="text-[#6B7684] text-sm md:text-base mb-8">
                    {isLunar ? '음력' : '양력'} 기준으로 입력해주세요
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B7684] mb-2">년도</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full p-4 bg-[#F4F4F5] rounded-2xl text-[#191F28] text-lg font-medium border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none transition-all"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>{y}년</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[#6B7684] mb-2">월</label>
                        <select
                          value={month}
                          onChange={(e) => setMonth(Number(e.target.value))}
                          className="w-full p-4 bg-[#F4F4F5] rounded-2xl text-[#191F28] text-lg font-medium border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none transition-all"
                        >
                          {months.map((m) => (
                            <option key={m} value={m}>{m}월</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#6B7684] mb-2">일</label>
                        <select
                          value={day}
                          onChange={(e) => setDay(Number(e.target.value))}
                          className="w-full p-4 bg-[#F4F4F5] rounded-2xl text-[#191F28] text-lg font-medium border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none transition-all"
                        >
                          {days.map((d) => (
                            <option key={d} value={d}>{d}일</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step: 시간 */}
              {currentStep === 'time' && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] mb-2">
                    태어난 시간을 알려주세요
                  </h1>
                  <p className="text-[#6B7684] text-sm md:text-base mb-8">
                    모르면 아래 체크박스를 선택해주세요
                  </p>
                  
                  {!isTimeUnknown && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmit();
                            }
                          }}
                          placeholder="12:00"
                          className="flex-1 p-4 bg-[#F4F4F5] rounded-2xl text-[#191F28] text-lg font-medium text-center border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none transition-all"
                        />
                        <select
                          value={amPm}
                          onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
                          className="w-28 p-4 bg-[#F4F4F5] rounded-2xl text-[#191F28] text-lg font-medium text-center border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none transition-all"
                        >
                          <option value="AM">오전</option>
                          <option value="PM">오후</option>
                        </select>
                      </div>
                      {getSiJu() && (
                        <p className="text-center text-[#3182F6] font-medium">
                          {getSiJu()}
                        </p>
                      )}
                    </motion.div>
                  )}
                  
                  <label className="flex items-center gap-3 mt-6 text-[#6B7684] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTimeUnknown}
                      onChange={(e) => setIsTimeUnknown(e.target.checked)}
                      className="w-5 h-5 rounded-md border-[#E5E8EB] text-[#3182F6] focus:ring-[#3182F6]"
                    />
                    <span>태어난 시간을 모르겠어요</span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 하단 버튼 */}
        <div className="p-5 pb-8 md:p-8 md:pb-10 shrink-0 bg-white safe-area-bottom mb-4">
          {currentStep === 'time' ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="w-full py-4 bg-[#3182F6] text-white font-semibold text-lg rounded-2xl 
                         disabled:bg-[#E5E8EB] disabled:text-[#8B95A1] 
                         hover:bg-[#1B64DA] active:scale-[0.98] transition-all"
            >
              시작하기
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="w-full py-4 bg-[#3182F6] text-white font-semibold text-lg rounded-2xl 
                         disabled:bg-[#E5E8EB] disabled:text-[#8B95A1] 
                         hover:bg-[#1B64DA] active:scale-[0.98] transition-all"
            >
              다음
            </button>
          )}
          
          {currentStep === 'name' && (
            <p className="text-center text-xs text-[#8B95A1] mt-4">
              입력하신 정보는 브라우저에만 저장됩니다
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
