'use client';

import type { SajuData } from '@/lib/saju/engine';
import type { AgentResponse } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface AgentLogProps {
  agent: AgentResponse;
  isActive: boolean;
  order?: number;
  sajuData?: SajuData | null;
}

const AGENT_CONFIG = {
  T: {
    name: 'T형',
    subtitle: '논리로 따져보는',
    color: '#3182F6',
    bgColor: '#E8F3FF',
    bubbleColor: '#EFF6FF',
    icon: '🧠',
  },
  F: {
    name: 'F형',
    subtitle: '마음으로 느끼는',
    color: '#FF6B9D',
    bgColor: '#FFE8F0',
    bubbleColor: '#FFF1F5',
    icon: '💗',
  },
  SAJU: {
    name: '사주',
    subtitle: '운으로 읽어보는',
    color: '#9B59B6',
    bgColor: '#F3E8FF',
    bubbleColor: '#FAF5FF',
    icon: '🔮',
  },
} as const;

export function AgentLog({ agent, isActive, order, sajuData }: AgentLogProps) {
  const config = AGENT_CONFIG[agent.agent];
  const [showSajuDetail, setShowSajuDetail] = useState(false);
  const showSajuInfo = agent.agent === 'SAJU' && sajuData && agent.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex gap-3"
    >
      {/* 프로필 아바타 */}
      <div className="flex-shrink-0">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm"
          style={{ backgroundColor: config.bgColor }}
        >
          {config.icon}
        </div>
      </div>

      {/* 말풍선 영역 */}
      <div className="flex-1 max-w-[calc(100%-3.5rem)]">
        {/* 이름 */}
        <div className="flex items-center gap-2 mb-1.5">
          <span 
            className="font-semibold text-sm"
            style={{ color: config.color }}
          >
            {config.name}
          </span>
          <span className="text-[10px] text-[#8B95A1]">{config.subtitle}</span>
          {order !== undefined && agent.content && (
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: config.color }}
            >
              {order}번째
            </span>
          )}
        </div>

        {/* 말풍선 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          {/* 말풍선 꼬리 */}
          <div 
            className="absolute -left-2 top-3 w-0 h-0"
            style={{
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: `8px solid ${config.bubbleColor}`,
            }}
          />
          
          {/* 말풍선 본체 */}
          <div 
            className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
            style={{ backgroundColor: config.bubbleColor }}
          >
            {agent.content ? (
              <div className="text-[#191F28] text-sm leading-relaxed markdown-content [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-0.5">
                <ReactMarkdown>{agent.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-[#8B95A1] ml-1">생각 중...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* 사주 에이전트 만세력 정보 */}
        {showSajuInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2"
          >
            <button
              onClick={() => setShowSajuDetail(!showSajuDetail)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-[#9B59B6] hover:text-[#7B3A9B] transition-colors px-2 py-1 rounded-full bg-[#F3E8FF]"
            >
              <span>📊 만세력 분석 보기</span>
              <motion.span
                animate={{ rotate: showSajuDetail ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[8px]"
              >
                ▼
              </motion.span>
            </button>
            
            <AnimatePresence>
              {showSajuDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 bg-[#FAFBFC] rounded-xl text-xs space-y-2 border border-[#E5E8EB]">
                    {/* 사주팔자 */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="font-medium text-[#6B7684]">사주:</span>
                      {[sajuData.yearPillar, sajuData.monthPillar, sajuData.dayPillar, sajuData.hourPillar].filter(Boolean).map((pillar, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white rounded-md border border-[#E5E8EB] font-medium">{pillar}</span>
                      ))}
                    </div>
                    
                    {/* 일간 */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#6B7684]">일간:</span>
                      <span className="px-2 py-0.5 bg-[#9B59B6] text-white rounded-md font-medium">
                        {sajuData.dayMaster} ({sajuData.dayMasterElement})
                      </span>
                    </div>
                    
                    {/* 대운 */}
                    {sajuData.daewoon && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#6B7684]">현재 대운:</span>
                        <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#9B59B6] rounded-md font-medium">
                          {sajuData.daewoon.currentDaewoon}
                        </span>
                        <span className="text-[#8B95A1]">
                          ({sajuData.daewoon.currentDaewoonAge}~{sajuData.daewoon.nextDaewoonAge - 1}세)
                        </span>
                      </div>
                    )}
                    
                    {/* 세운 */}
                    {sajuData.currentSewoon && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#6B7684]">{sajuData.currentSewoon.year}년:</span>
                        <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#9B59B6] rounded-md font-medium">
                          {sajuData.currentSewoon.pillar}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-white font-medium ${
                          sajuData.currentSewoon.relation === '상생' ? 'bg-emerald-500' :
                          sajuData.currentSewoon.relation === '상극' ? 'bg-orange-500' :
                          sajuData.currentSewoon.relation === '비화' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          {sajuData.currentSewoon.relation}
                        </span>
                      </div>
                    )}
                    
                    {/* 향후 세운 */}
                    {sajuData.upcomingSewoon && sajuData.upcomingSewoon.length > 0 && (
                      <div className="pt-2 border-t border-[#E5E8EB]">
                        <span className="font-medium text-[#6B7684] block mb-1.5">향후 운세:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {sajuData.upcomingSewoon.map((sewoon) => (
                            <span 
                              key={sewoon.year}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                sewoon.relation === '상생' ? 'bg-emerald-100 text-emerald-700' :
                                sewoon.relation === '상극' ? 'bg-orange-100 text-orange-700' :
                                sewoon.relation === '비화' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {sewoon.year}년 {sewoon.relation}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
