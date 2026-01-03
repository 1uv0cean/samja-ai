'use client';

import type { BirthInfo } from '@/lib/saju/engine';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface BirthInfoModalProps {
  onSubmit: (birthInfo: BirthInfo) => void;
}

export function BirthInfoModal({ onSubmit }: BirthInfoModalProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [isLunar, setIsLunar] = useState(false);
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [timeInput, setTimeInput] = useState('12:00');  // HH:MM 형식
  const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM');
  const [isTimeUnknown, setIsTimeUnknown] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false);

  // 시간 문자열에서 시/분 추출
  const parseTime = () => {
    const [h, m] = timeInput.split(':').map(Number);
    return { hour12: isNaN(h) ? 12 : Math.max(1, Math.min(12, h)), minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)) };
  };

  // 12시간제 -> 24시간제 변환
  const getHour24 = () => {
    const { hour12, minute } = parseTime();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-gray-900 border border-orange-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            사주 정보 입력
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            정확한 조언을 위해 생년월일시를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          {/* 성별 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">성별</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-3 rounded-lg font-medium transition-all ${
                  gender === 'male'
                    ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                    : 'bg-black/50 border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                남성 ♂
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-3 rounded-lg font-medium transition-all ${
                  gender === 'female'
                    ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                    : 'bg-black/50 border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                여성 ♀
              </button>
            </div>
          </div>

          {/* 양력/음력 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">달력</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsLunar(false)}
                className={`py-3 rounded-lg font-medium transition-all ${
                  !isLunar
                    ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                    : 'bg-black/50 border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                양력 ☀️
              </button>
              <button
                type="button"
                onClick={() => setIsLunar(true)}
                className={`py-3 rounded-lg font-medium transition-all ${
                  isLunar
                    ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                    : 'bg-black/50 border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                음력 🌙
              </button>
            </div>
            
            {/* 윤달 체크 */}
            {isLunar && (
              <label className="flex items-center gap-2 mt-3 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLeapMonth}
                  onChange={(e) => setIsLeapMonth(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                />
                윤달
              </label>
            )}
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">생년월일</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
          </div>

          {/* 태어난 시간 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">태어난 시간</label>
            <div className="flex items-center gap-2">
              {/* 시간 입력 (HH:MM) */}
              <input
                type="text"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="12:00"
                disabled={isTimeUnknown}
                className={`flex-1 px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white text-center focus:border-orange-500 focus:outline-none ${
                  isTimeUnknown ? 'opacity-50' : ''
                }`}
              />
              {/* AM/PM */}
              <select
                value={amPm}
                onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
                disabled={isTimeUnknown}
                className={`px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none ${
                  isTimeUnknown ? 'opacity-50' : ''
                }`}
              >
                <option value="AM">오전</option>
                <option value="PM">오후</option>
              </select>
            </div>
            {/* 시주 안내 */}
            {!isTimeUnknown && (
              <p className="text-xs text-gray-500 mt-2">
                시주: {(() => {
                  const h = getHour24();
                  if (h >= 23 || h < 1) return '자시(子時) 23:00-01:00';
                  if (h >= 1 && h < 3) return '축시(丑時) 01:00-03:00';
                  if (h >= 3 && h < 5) return '인시(寅時) 03:00-05:00';
                  if (h >= 5 && h < 7) return '묘시(卯時) 05:00-07:00';
                  if (h >= 7 && h < 9) return '진시(辰時) 07:00-09:00';
                  if (h >= 9 && h < 11) return '사시(巳時) 09:00-11:00';
                  if (h >= 11 && h < 13) return '오시(午時) 11:00-13:00';
                  if (h >= 13 && h < 15) return '미시(未時) 13:00-15:00';
                  if (h >= 15 && h < 17) return '신시(申時) 15:00-17:00';
                  if (h >= 17 && h < 19) return '유시(酉時) 17:00-19:00';
                  if (h >= 19 && h < 21) return '술시(戌時) 19:00-21:00';
                  return '해시(亥時) 21:00-23:00';
                })()}
              </p>
            )}
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isTimeUnknown}
                onChange={(e) => setIsTimeUnknown(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
              />
              태어난 시간을 모름
            </label>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="w-full py-4 mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            시작하기 ✨
          </button>
        </form>

        {/* 안내 문구 */}
        <p className="text-center text-xs text-gray-500 mt-4">
          입력하신 정보는 브라우저에만 저장되며, 서버로 전송되지 않습니다.
        </p>
      </motion.div>
    </div>
  );
}
