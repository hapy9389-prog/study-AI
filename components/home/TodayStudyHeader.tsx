"use client";

import { useState } from "react";
import { formatTotalStudyTime } from "@/lib/mockData";
import { getTodayStudyMinutes, loadStudyRecords } from "@/lib/studyRecords";

// 홈 idle 최상단 "오늘 상태" 한 줄. Hero 위에서 composition 을 아래로 내리고,
// 오늘 얼마나 함께했는지만 조용히 알려준다. 새 저장소 없이 StudyRecord 를 합산한다.
// idle phase 진입 시 마운트되어 최신 StudyRecord 를 읽는다.
// "내 공간"의 누적시간(평생)과는 의미가 다른 "오늘치" 값이다.
export default function TodayStudyHeader() {
  const [todayMinutes] = useState(() =>
    getTodayStudyMinutes(loadStudyRecords(), Date.now()),
  );

  // 상단 label "오늘의 공부"가 이미 "오늘" 맥락을 주므로 문구에서 반복하지 않는다.
  const summary =
    todayMinutes >= 1
      ? `${formatTotalStudyTime(todayMinutes)} 함께 공부했어요`
      : "아직 첫 공부 전이에요";

  return (
    <section className="px-6">
      <p className="text-xs font-medium text-warm-gray">오늘의 공부</p>
      <p className="mt-1 text-sm text-cocoa">{summary}</p>
    </section>
  );
}
