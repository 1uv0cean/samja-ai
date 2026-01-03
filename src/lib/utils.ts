import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 타이핑 효과를 위한 딜레이 유틸리티
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 텍스트를 글자 단위로 스트리밍하기 위한 제너레이터
 */
export async function* streamText(
  text: string,
  charDelay: number = 30
): AsyncGenerator<string> {
  for (const char of text) {
    yield char;
    await delay(charDelay);
  }
}
