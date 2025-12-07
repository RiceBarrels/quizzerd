import { ReactNode } from "react";

export interface ScrollPosition {
  details: number;
  questions: number;
  settings: number;
}

export default function ExamIdLayout({ children }: { children: ReactNode }){
    return children;
}