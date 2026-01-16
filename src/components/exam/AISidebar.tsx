'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Sparkles,
    Plus,
    Check,
    X,
    PanelRightClose,
    CircleDot,
    ToggleLeft,
    TextCursorInput,
    FileText,
    Code2,
    CheckCircle2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExamItem, QuestionType } from '@/types/exam';
import { useSidebar } from '@/components/ui/sidebar';
import { motion, AnimatePresence } from 'motion/react';

interface AISidebarProps {
    activeTab: string;
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

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function AISidebar({ activeTab, onAddQuestions }: AISidebarProps) {
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [questionType, setQuestionType] = useState('mixed');
    const [count, setCount] = useState(5);
    const [difficulty, setDifficulty] = useState('medium');
    const [programmingLanguage, setProgrammingLanguage] = useState('python');
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
    const [collapsed, setCollapsed] = useState(false);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
    const { open } = useSidebar();

    const getQuestionTypeInfo = (type: string) => {
        const types: Record<string, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
            'multiple_choice': { icon: CircleDot, label: 'MCQ', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
            'multiple_select': { icon: CheckCircle2, label: 'Multi', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
            'true_false': { icon: ToggleLeft, label: 'T/F', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
            'fill_blank': { icon: TextCursorInput, label: 'Fill', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
            'short_answer': { icon: FileText, label: 'Short', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
            'essay': { icon: FileText, label: 'Essay', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
            'coding': { icon: Code2, label: 'Code', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
        };
        return types[type] || { icon: FileText, label: type, color: 'bg-muted text-muted-foreground' };
    };

    const toggleExpanded = (index: number) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

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
                    language: 'English',
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

    const mapQuestionType = (type: string): QuestionType => {
        const mapping: Record<string, QuestionType> = {
            'multiple_choice': 'multiple_choice',
            'multiple_select': 'multiple_select',
            'true_false': 'true_false',
            'fill_blank': 'short_answer',
            'short_answer': 'short_answer',
            'essay': 'long_answer',
            'coding': 'coding'
        };
        return mapping[type] || 'short_answer';
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

            if ((q.type === 'multiple_choice' || q.type === 'multiple_select') && q.options) {
                baseItem.options = q.options.map(opt =>
                    opt.replace(/^[A-D]\)\s*/, '')
                );

                if (q.type === 'multiple_select') {
                    // Multiple correct answers - parse as array of indices
                    const correctLetters = q.correct_answer
                        ?.toUpperCase()
                        .split(/[,\s]+/)
                        .map(l => l.trim())
                        .filter(l => l.length === 1) || [];
                    const correctIndices = correctLetters
                        .map(letter => letter.charCodeAt(0) - 65)
                        .filter(idx => idx >= 0 && idx < baseItem.options!.length);
                    baseItem.correct_answer = correctIndices.length > 0 ? correctIndices : [0];
                } else {
                    // Single correct answer
                    const correctLetter = q.correct_answer.charAt(0).toUpperCase();
                    const correctIndex = correctLetter.charCodeAt(0) - 65;
                    if (correctIndex >= 0 && correctIndex < baseItem.options.length) {
                        baseItem.correct_answer = correctIndex;
                    } else {
                        baseItem.correct_answer = 0;
                    }
                }
            }

            if (q.type === 'true_false') {
                baseItem.correct_answer = q.correct_answer.toLowerCase() === 'true';
            }

            if (q.type === 'fill_blank') {
                baseItem.correct_answer = q.correct_answer;
            }

            if (q.type === 'coding') {
                if (q.starter_files && q.starter_files.length > 0) {
                    baseItem.starter_files = q.starter_files;
                }
                if (q.test_cases) {
                    baseItem.test_cases = q.test_cases;
                }
            }

            if (q.explanation) {
                baseItem.explanation = q.explanation;
            }

            return baseItem;
        });

        onAddQuestions(examItems);
        toast.success(`Added ${examItems.length} questions to exam`);
        setGeneratedQuestions([]);
        setTopic('');
    };

    if (activeTab !== 'questions') return null;

    return (
        <AnimatePresence initial={false} mode="wait">
            <motion.div
                key="ai-sidebar"
                className="z-50 fixed right-8"
                style={{ top: '120px' }}
                initial={{ opacity: 0, x: "32rem", filter: "blur(8px)" }}
                animate={{
                    opacity: 1,
                    x: open ? "-1rem" : "0",
                    width: collapsed ? 'auto' : '288px',
                    filter: "blur(0px)"
                }}
                transition={{ duration: 0.3, type: "spring", visualDuration: 0.25, bounce: 0.3 }}
                exit={{ opacity: 0, x: "32rem", filter: "blur(8px)" }}
            >
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="bg-card border rounded-lg shadow-lg flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                        title="Open AI Sidebar"
                    >
                        <Sparkles className="h-4 w-4" />
                        <div className="flex flex-col items-start text-left">
                            <span className="text-xs font-medium">AI Generate</span>
                            {generatedQuestions.length > 0 ? (
                                <span className="text-[10px] text-primary">
                                    {generatedQuestions.filter(q => q.selected).length} ready to add
                                </span>
                            ) : loading ? (
                                <span className="text-[10px] text-muted-foreground">
                                    Generating...
                                </span>
                            ) : (
                                <span className="text-[10px] text-muted-foreground">
                                    Click to generate
                                </span>
                            )}
                        </div>
                    </button>
                ) : (
                <div
                    className="bg-card overflow-y-auto border rounded-lg shadow-lg scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
                    style={{ maxHeight: 'calc(100vh - 160px)' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-card border-b px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">AI Generate</h3>
                            <button
                                onClick={() => setCollapsed(true)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                title="Hide AI Sidebar"
                            >
                                <PanelRightClose className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Topic Input */}
                        <div className="space-y-2">
                            <Label className="text-xs">Topic</Label>
                            <Textarea
                                placeholder="e.g., Python basics, World War II..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                rows={2}
                                className="text-sm resize-none"
                            />
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Type</Label>
                                <Select value={questionType} onValueChange={setQuestionType}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mixed">Mixed</SelectItem>
                                        <SelectItem value="multiple_choice">MCQ</SelectItem>
                                        <SelectItem value="multiple_select">Multi-Select</SelectItem>
                                        <SelectItem value="true_false">T/F</SelectItem>
                                        <SelectItem value="short_answer">Short</SelectItem>
                                        <SelectItem value="coding">Code</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Difficulty</Label>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Count</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {questionType === 'coding' && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Language</Label>
                                    <Select value={programmingLanguage} onValueChange={setProgrammingLanguage}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python">Python</SelectItem>
                                            <SelectItem value="javascript">JS</SelectItem>
                                            <SelectItem value="java">Java</SelectItem>
                                            <SelectItem value="cpp">C++</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={generateQuestions}
                            disabled={loading || !topic.trim()}
                            className="w-full h-8 text-xs gap-1.5"
                            size="sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3 w-3" />
                                    Generate
                                </>
                            )}
                        </Button>

                        {/* Generated Questions */}
                        {generatedQuestions.length > 0 && (
                            <div className="space-y-3 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {generatedQuestions.filter(q => q.selected).length}/{generatedQuestions.length}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">selected</span>
                                    </div>
                                    <button
                                        onClick={() => setGeneratedQuestions(prev =>
                                            prev.map(q => ({ ...q, selected: true }))
                                        )}
                                        className="text-[10px] text-primary hover:text-primary/80 font-medium"
                                    >
                                        Select all
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {generatedQuestions.map((q, index) => {
                                        const typeInfo = getQuestionTypeInfo(q.type);
                                        const TypeIcon = typeInfo.icon;
                                        const isExpanded = expandedQuestions.has(index);
                                        const correctLetter = q.correct_answer?.charAt(0)?.toUpperCase();

                                        return (
                                            <div
                                                key={index}
                                                className={`border rounded-lg text-xs transition-all duration-200 overflow-hidden ${
                                                    q.selected
                                                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                                                        : 'bg-muted/20 border-border/50 opacity-60'
                                                }`}
                                            >
                                                {/* Header */}
                                                <div className="p-2.5">
                                                    <div className="flex items-start gap-2">
                                                        <button
                                                            onClick={() => toggleQuestion(index)}
                                                            className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                                q.selected
                                                                    ? 'bg-primary border-primary'
                                                                    : 'border-muted-foreground/40 hover:border-muted-foreground'
                                                            }`}
                                                        >
                                                            {q.selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[9px] px-1.5 py-0 h-4 gap-1 ${typeInfo.color}`}
                                                                >
                                                                    <TypeIcon className="h-2.5 w-2.5" />
                                                                    {typeInfo.label}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {q.points} pts
                                                                </span>
                                                            </div>
                                                            <p className={`font-medium leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                                {q.question}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            {(q.options || q.explanation) && (
                                                                <button
                                                                    onClick={() => toggleExpanded(index)}
                                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                                >
                                                                    {isExpanded
                                                                        ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                                                        : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                    }
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteQuestion(index)}
                                                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-border/50 mt-1">
                                                        {/* Options for MCQ and Multiple Select */}
                                                        {(q.type === 'multiple_choice' || q.type === 'multiple_select') && q.options && (
                                                            <div className="space-y-1 pt-2">
                                                                {q.options.map((opt, optIndex) => {
                                                                    const letter = String.fromCharCode(65 + optIndex);
                                                                    // For multiple_select, correct_answer might be "A, C" or "A,C,D"
                                                                    const correctLetters = q.correct_answer
                                                                        ?.toUpperCase()
                                                                        .split(/[,\s]+/)
                                                                        .map(l => l.trim())
                                                                        .filter(l => l.length === 1) || [];
                                                                    const isCorrect = q.type === 'multiple_select'
                                                                        ? correctLetters.includes(letter)
                                                                        : letter === correctLetter;
                                                                    const optionText = opt.replace(/^[A-D]\)\s*/, '');
                                                                    const isMultiSelect = q.type === 'multiple_select';

                                                                    return (
                                                                        <div
                                                                            key={optIndex}
                                                                            className={`flex items-start gap-2 p-1.5 rounded ${
                                                                                isCorrect
                                                                                    ? 'bg-green-500/10 border border-green-500/20'
                                                                                    : 'bg-muted/30'
                                                                            }`}
                                                                        >
                                                                            <div className={`w-4 h-4 ${isMultiSelect ? 'rounded' : 'rounded-full'} flex items-center justify-center shrink-0 text-[9px] font-bold ${
                                                                                isCorrect
                                                                                    ? 'bg-green-500 text-white'
                                                                                    : 'bg-muted-foreground/20 text-muted-foreground'
                                                                            }`}>
                                                                                {isCorrect ? <Check className="h-2.5 w-2.5" /> : letter}
                                                                            </div>
                                                                            <span className={`flex-1 text-[11px] ${isCorrect ? 'font-medium' : ''}`}>
                                                                                {optionText}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* True/False Answer */}
                                                        {q.type === 'true_false' && (
                                                            <div className="flex items-center gap-2 pt-2">
                                                                <span className="text-[10px] text-muted-foreground">Answer:</span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] ${
                                                                        q.correct_answer.toLowerCase() === 'true'
                                                                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                                    }`}
                                                                >
                                                                    {q.correct_answer}
                                                                </Badge>
                                                            </div>
                                                        )}

                                                        {/* Fill in blank / Short answer */}
                                                        {(q.type === 'fill_blank' || q.type === 'short_answer') && q.correct_answer && (
                                                            <div className="pt-2">
                                                                <span className="text-[10px] text-muted-foreground">Answer: </span>
                                                                <span className="text-[11px] font-medium text-green-600">{q.correct_answer}</span>
                                                            </div>
                                                        )}

                                                        {/* Explanation */}
                                                        {q.explanation && (
                                                            <div className="pt-1.5 border-t border-border/30">
                                                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                                    <span className="font-medium">Explanation:</span> {q.explanation}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Coding info */}
                                                        {q.type === 'coding' && (
                                                            <div className="flex items-center gap-2 pt-2">
                                                                {q.starter_files && q.starter_files.length > 0 && (
                                                                    <Badge variant="outline" className="text-[9px] gap-1 bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
                                                                        <Code2 className="h-2 w-2" />
                                                                        Starter code
                                                                    </Badge>
                                                                )}
                                                                {q.test_cases && (
                                                                    <Badge variant="outline" className="text-[9px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                                        <CheckCircle2 className="h-2 w-2" />
                                                                        Test cases
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button
                                    onClick={addSelectedQuestions}
                                    className="w-full h-9 text-xs gap-1.5"
                                    size="sm"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add {generatedQuestions.filter(q => q.selected).length} Questions
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
