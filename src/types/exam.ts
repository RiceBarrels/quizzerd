// Exam item types
export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'short_answer'
  | 'long_answer'
  | 'true_false'
  | 'dropdown'
  | 'scale'
  | 'date'
  | 'time'
  | 'file_upload'
  | 'rating'
  | 'coding'
  | 'section_header'
  | 'page_break';

export interface ExamItem {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  required: boolean;
  options?: string[];
  correct_answer?: number | number[] | string | string[] | boolean;
  explanation?: string;
  // Scale type fields
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  // Date/Time type fields
  include_time?: boolean;
  include_year?: boolean;
  duration?: boolean;
  // File upload type fields
  max_files?: number;
  max_file_size?: number;
  allowed_types?: string[];
  // Rating type fields
  rating_scale?: number;
  rating_icon?: 'STAR' | 'HEART' | 'THUMB';
  // Coding type fields
  starter_files?: Array<{ name: string; content: string }>;
  test_cases?: string;
  // Section header fields
  description?: string;
  // Internal tracking
  index?: number;
  // Question tags (tag IDs)
  tags?: string[];
}

export interface Exam {
  exam_id: string;
  exam_name: string;
  exam_description: string;
  duration_minutes: number;
  attempts_allowed: number;
  passing_score: number;
  shuffle_items: boolean;
  show_results_immediately: boolean;
  is_public: boolean;
  is_published: boolean;
  start_date: string | null;
  end_date: string | null;
  items: ExamItem[];
  total_points: number;
  status: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
  // Practice mode settings
  is_practice_mode?: boolean;
  show_explanations?: boolean;
  allow_retry_questions?: boolean;
}

export interface QuestionTypeOption {
  value: QuestionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
