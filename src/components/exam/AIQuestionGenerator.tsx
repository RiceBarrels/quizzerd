'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExamItem, QuestionType } from '@/types/exam';

// Simple ID generator
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface AIQuestionGeneratorProps {
    onAddQuestions: (questions: ExamItem[]) => void;
}

interface GeneratedQuestion {
    question: string;
    type: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string;
    points: number;
    selected?: boolean;
    starter_files?: Array<{ name: string; content: string }>;
    test_cases?: string;
}

export default function AIQuestionGenerator({ onAddQuestions }: AIQuestionGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [questionType, setQuestionType] = useState('mixed');
    const [count, setCount] = useState(5);
    const [difficulty, setDifficulty] = useState('medium');
    const [language, setLanguage] = useState('English');
    const [programmingLanguage, setProgrammingLanguage] = useState('python');
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

    const generateQuestions = async () => {
        if (!topic.trim()) {
            toast.error('Please enter a topic');
            return;
        }

        setLoading(true);
        setGeneratedQuestions([]);

        try {
            const response = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    questionType,
                    count,
                    difficulty,
                    language,
                    programmingLanguage: questionType === 'coding' ? programmingLanguage : undefined
                })
            });

            const result = await response.json();

            if (result.success && result.questions) {
                setGeneratedQuestions(result.questions.map((q: GeneratedQuestion) => ({
                    ...q,
                    selected: true
                })));
                toast.success(`Generated ${result.questions.length} questions!`);
            } else {
                throw new Error(result.error || 'Failed to generate questions');
            }
        } catch (error) {
            console.error('Error generating questions:', error);
            toast.error('Failed to generate questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.map((q, i) =>
            i === index ? { ...q, selected: !q.selected } : q
        ));
    };

    const deleteQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const addSelectedQuestions = () => {
        const selected = generatedQuestions.filter(q => q.selected);
        if (selected.length === 0) {
            toast.error('Please select at least one question');
            return;
        }

        const examItems: ExamItem[] = selected.map(q => {
            const baseItem: ExamItem = {
                question_id: generateId(),
                question_text: q.question,
                question_type: mapQuestionType(q.type),
                points: q.points || 1,
                required: true,
            };

            // Add options for multiple choice
            if (q.type === 'multiple_choice' && q.options) {
                // Options are strings, remove A), B), C), D) prefixes
                baseItem.options = q.options.map(opt =>
                    opt.replace(/^[A-D]\)\s*/, '')
                );
                // Find correct answer index from letter (A=0, B=1, C=2, D=3)
                const correctLetter = q.correct_answer.charAt(0).toUpperCase();
                const correctIndex = correctLetter.charCodeAt(0) - 65;
                if (correctIndex >= 0 && correctIndex < baseItem.options.length) {
                    baseItem.correct_answer = correctIndex;
                } else {
                    baseItem.correct_answer = 0;
                }
            }

            // Add correct answer for true/false
            if (q.type === 'true_false') {
                baseItem.correct_answer = q.correct_answer.toLowerCase() === 'true';
            }

            // Add correct answer for fill_blank
            if (q.type === 'fill_blank') {
                baseItem.correct_answer = q.correct_answer;
            }

            // Add starter files and test cases for coding questions
            if (q.type === 'coding') {
                if (q.starter_files && q.starter_files.length > 0) {
                    baseItem.starter_files = q.starter_files;
                }
                if (q.test_cases) {
                    baseItem.test_cases = q.test_cases;
                }
            }

            // Add explanation if available
            if (q.explanation) {
                baseItem.explanation = q.explanation;
            }

            return baseItem;
        });

        onAddQuestions(examItems);
        toast.success(`Added ${examItems.length} questions to exam`);
        setOpen(false);
        setGeneratedQuestions([]);
        setTopic('');
    };

    const mapQuestionType = (type: string): QuestionType => {
        const mapping: Record<string, QuestionType> = {
            'multiple_choice': 'multiple_choice',
            'true_false': 'true_false',
            'fill_blank': 'short_answer',
            'short_answer': 'short_answer',
            'essay': 'long_answer',
            'coding': 'coding'
        };
        return mapping[type] || 'short_answer';
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Ask AI to generate questions...</span>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Generate Questions
                    </DialogTitle>
                    <DialogDescription>
                        Describe the topic and customize settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Topic Input */}
                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic / Subject</Label>
                        <Textarea
                            id="topic"
                            placeholder="e.g., World War II history, Python programming basics, Calculus derivatives..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Question Type</Label>
                            <Select value={questionType} onValueChange={setQuestionType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                    <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="essay">Essay</SelectItem>
                                    <SelectItem value="coding">Coding</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Number of Questions</Label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Chinese">中文</SelectItem>
                                    <SelectItem value="Spanish">Español</SelectItem>
                                    <SelectItem value="French">Français</SelectItem>
                                    <SelectItem value="German">Deutsch</SelectItem>
                                    <SelectItem value="Japanese">日本語</SelectItem>
                                    <SelectItem value="Korean">한국어</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Programming Language Selector (for coding questions) */}
                    {questionType === 'coding' && (
                        <div className="space-y-2">
                            <Label>Programming Language</Label>
                            <Select value={programmingLanguage} onValueChange={setProgrammingLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="typescript">TypeScript</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                    <SelectItem value="c">C</SelectItem>
                                    <SelectItem value="csharp">C#</SelectItem>
                                    <SelectItem value="go">Go</SelectItem>
                                    <SelectItem value="rust">Rust</SelectItem>
                                    <SelectItem value="ruby">Ruby</SelectItem>
                                    <SelectItem value="php">PHP</SelectItem>
                                    <SelectItem value="swift">Swift</SelectItem>
                                    <SelectItem value="kotlin">Kotlin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={generateQuestions}
                        disabled={loading || !topic.trim()}
                        className="w-full gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate
                            </>
                        )}
                    </Button>

                    {/* Generated Questions Preview */}
                    {generatedQuestions.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <Label>Generated Questions ({generatedQuestions.filter(q => q.selected).length} selected)</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setGeneratedQuestions(prev =>
                                        prev.map(q => ({ ...q, selected: true }))
                                    )}
                                >
                                    Select All
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {generatedQuestions.map((q, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 border rounded-lg transition-colors ${
                                            q.selected
                                                ? 'bg-primary/5 border-primary'
                                                : 'bg-muted/30 hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center cursor-pointer ${
                                                    q.selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                                }`}
                                                onClick={() => toggleQuestion(index)}
                                            >
                                                {q.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => toggleQuestion(index)}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">
                                                        {q.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {q.points} pts
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium">{q.question}</p>
                                                {q.options && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {q.options.slice(0, 2).join(' | ')}
                                                        {q.options.length > 2 && ` +${q.options.length - 2} more`}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteQuestion(index);
                                                }}
                                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    {generatedQuestions.length > 0 && (
                        <Button onClick={addSelectedQuestions} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add {generatedQuestions.filter(q => q.selected).length} Questions
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
