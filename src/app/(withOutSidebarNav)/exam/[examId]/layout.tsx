import { ComponentProps } from "@/app/layout";

export interface ScrollPosition {
  details: number;
  questions: number;
  settings: number;
}

export default function ExamIdLayout({ children }:ComponentProps){
    return children;
}