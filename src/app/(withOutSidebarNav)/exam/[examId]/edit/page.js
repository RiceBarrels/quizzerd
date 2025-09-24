'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TextEditor from '@/components/ui/text-editor';
import FloatingFormatDock from '@/components/ui/floating-format-dock';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, GripVertical, Save, Eye, Calendar, Clock, ListTodoIcon, ListChecksIcon, TextAlignStartIcon, NotepadTextIcon, CircleSlashIcon } from 'lucide-react';

const questionTypes = [
  { value: 'multiple_choice', label: <><ListTodoIcon /> Multiple Choice</> },
  { value: 'multiple_select', label: <><ListChecksIcon /> Multiple Select</> },
  { value: 'short_answer', label: <><TextAlignStartIcon /> Short Answer</> },
  { value: 'long_answer', label: <><NotepadTextIcon /> Long Answer</> },
  { value: 'true_false', label: <><CircleSlashIcon />True/False</> },
];

export default function EditExamPage({ params }) {
  const router = useRouter();
  const { examId } = params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form states
  const [examName, setExamName] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [passingScore, setPassingScore] = useState(70);
  const [shuffleItems, setShuffleItems] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Items (questions)
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/get?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        const examData = result.data;
        
        // Populate form fields
        setExamName(examData.exam_name || '');
        setExamDescription(examData.exam_description || '');
        setDurationMinutes(examData.duration_minutes || 60);
        setAttemptsAllowed(examData.attempts_allowed || 1);
        setPassingScore(examData.passing_score || 70);
        setShuffleItems(examData.shuffle_items || false);
        setShowResultsImmediately(examData.show_results_immediately !== false);
        setIsPublic(examData.is_public || false);
        setIsPublished(examData.is_published || false);
        setStartDate(examData.start_date ? new Date(examData.start_date).toISOString().slice(0, 16) : '');
        setEndDate(examData.end_date ? new Date(examData.end_date).toISOString().slice(0, 16) : '');
        setItems(examData.items || []);
      } else {
        toast.error('Failed to load exam');
        router.push('/exam');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Failed to load exam');
      router.push('/exam');
    } finally {
      setLoading(false);
    }
  };

  const addNewQuestion = () => {
    const newQuestion = {
      question_id: `q_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      correct_answer: 0,
      points: 10,
      explanation: '',
      required: true
    };
    setItems([...items, newQuestion]);
    setActiveTab('questions');
  };

  const updateQuestion = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setItems(updatedItems);
  };

  const addOption = (questionIndex) => {
    const updatedItems = [...items];
    updatedItems[questionIndex].options.push('');
    setItems(updatedItems);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedItems = [...items];
    updatedItems[questionIndex].options[optionIndex] = value;
    setItems(updatedItems);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedItems = [...items];
    updatedItems[questionIndex].options.splice(optionIndex, 1);
    // Adjust correct answer if needed
    if (updatedItems[questionIndex].correct_answer >= optionIndex && updatedItems[questionIndex].correct_answer > 0) {
      updatedItems[questionIndex].correct_answer--;
    }
    setItems(updatedItems);
  };

  const removeQuestion = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const calculateTotalPoints = () => {
    return items.reduce((sum, item) => sum + (item.points || 0), 0);
  };

  const saveExam = async (publish = false) => {
    setSaving(true);
    
    try {
      const response = await fetch(`/api/exams/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_id: examId,
          exam_name: examName,
          exam_description: examDescription,
          duration_minutes: durationMinutes,
          attempts_allowed: attemptsAllowed,
          passing_score: passingScore,
          shuffle_items: shuffleItems,
          show_results_immediately: showResultsImmediately,
          is_public: isPublic,
          is_published: publish ? true : isPublished,
          start_date: startDate || null,
          end_date: endDate || null,
          items: items,
          total_points: calculateTotalPoints(),
          status: publish ? 'published' : 'draft'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(publish ? 'Exam published successfully!' : 'Exam saved successfully!');
        if (publish) {
          setIsPublished(true);
        }
      } else {
        toast.error(result.error || 'Failed to save exam');
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <FloatingFormatDock />
      <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Exam</h1>
          <p className="text-muted-foreground">
            Modify exam details and questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/exam/${examId}/preview`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={() => saveExam(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={() => saveExam(true)}
            disabled={saving || !examName || items.length === 0}
            variant={isPublished ? "secondary" : "default"}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isPublished ? 'Update Published' : 'Publish'}
          </Button>
        </div>
      </div>

      {isPublished && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
             This exam is published and available to students.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Exam Details</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({items.length})
            {items.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {calculateTotalPoints()} pts
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Exam Information</CardTitle>
              <CardDescription>
                Basic details about your exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-name">Exam Name *</Label>
                <Input
                  id="exam-name"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="Enter exam name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam-description">Description</Label>
                <TextEditor
                  id="exam-description"
                  value={examDescription}
                  onChange={(value) => setExamDescription(value)}
                  placeholder="Enter exam description"
                  minHeight={100}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Questions</CardTitle>
              <CardDescription>
                Add and manage exam questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <Card key={item.question_id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline">Question {index + 1}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={item.question_type}
                          onValueChange={(value) => updateQuestion(index, 'question_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={item.points}
                          onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <TextEditor
                        id={`question-${item.question_id}`}
                        value={item.question_text}
                        onChange={(value) => updateQuestion(index, 'question_text', value)}
                        placeholder="Enter your question"
                        minHeight={80}
                      />
                    </div>

                    {(item.question_type === 'multiple_choice' || item.question_type === 'multiple_select') && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {item.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2 items-center">
                            {item.question_type === 'multiple_choice' ? (
                              <RadioGroup value={item.correct_answer?.toString()} onValueChange={(value) => updateQuestion(index, 'correct_answer', parseInt(value))}>
                                <RadioGroupItem value={optionIndex.toString()} />
                              </RadioGroup>
                            ) : (
                              <Checkbox
                                checked={Array.isArray(item.correct_answer) && item.correct_answer.includes(optionIndex)}
                                onCheckedChange={(checked) => {
                                  const currentAnswers = Array.isArray(item.correct_answer) ? item.correct_answer : [];
                                  if (checked) {
                                    updateQuestion(index, 'correct_answer', [...currentAnswers, optionIndex]);
                                  } else {
                                    updateQuestion(index, 'correct_answer', currentAnswers.filter(a => a !== optionIndex));
                                  }
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <TextEditor
                                id={`question-${item.question_id}-option-${optionIndex}`}
                                value={option}
                                onChange={(value) => updateOption(index, optionIndex, value)}
                                placeholder={`Option ${optionIndex + 1}`}
                                minHeight={50}
                              />
                            </div>
                            {item.options.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(index, optionIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(index)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {item.question_type === 'true_false' && (
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <RadioGroup 
                          value={item.correct_answer?.toString()} 
                          onValueChange={(value) => updateQuestion(index, 'correct_answer', value === 'true')}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" />
                            <Label>True</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" />
                            <Label>False</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Explanation (Optional)</Label>
                      <TextEditor
                        id={`question-${item.question_id}-explanation`}
                        value={item.explanation}
                        onChange={(value) => updateQuestion(index, 'explanation', value)}
                        placeholder="Provide an explanation for the answer"
                        minHeight={80}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={addNewQuestion}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Exam Settings</CardTitle>
              <CardDescription>
                Configure exam behavior and scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attempts">Attempts Allowed</Label>
                  <Input
                    id="attempts"
                    type="number"
                    value={attemptsAllowed}
                    onChange={(e) => setAttemptsAllowed(parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing-score">Passing Score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Questions</Label>
                    <p className="text-sm text-muted-foreground">
                      Randomize question order for each attempt
                    </p>
                  </div>
                  <Switch
                    checked={shuffleItems}
                    onCheckedChange={setShuffleItems}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Results Immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      Display results right after submission
                    </p>
                  </div>
                  <Switch
                    checked={showResultsImmediately}
                    onCheckedChange={setShowResultsImmediately}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Exam</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to view and take this exam
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}