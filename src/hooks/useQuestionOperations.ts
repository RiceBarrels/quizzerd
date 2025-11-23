import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ExamItem } from '@/types/exam';

export function useQuestionOperations(
  items: ExamItem[],
  setItems: React.Dispatch<React.SetStateAction<ExamItem[]>>
) {
  const updateQuestion = useCallback((index: number, field: keyof ExamItem, value: any) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      return updatedItems;
    });
  }, [setItems]);

  const addOption = useCallback((questionIndex: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options!.push('');
      }
      return updatedItems;
    });
  }, [setItems]);

  const updateOption = useCallback((questionIndex: number, optionIndex: number, value: string) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options![optionIndex] = value;
      }
      return updatedItems;
    });
  }, [setItems]);

  const removeOption = useCallback((questionIndex: number, optionIndex: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options!.splice(optionIndex, 1);
        // Adjust correct answer if needed
        const correctAnswer = updatedItems[questionIndex].correct_answer;
        if (typeof correctAnswer === 'number' && correctAnswer >= optionIndex && correctAnswer > 0) {
          updatedItems[questionIndex].correct_answer = correctAnswer - 1;
        }
      }
      return updatedItems;
    });
  }, [setItems]);

  const removeQuestion = useCallback((index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  }, [setItems]);

  const duplicateQuestion = useCallback((index: number) => {
    setItems(prevItems => {
      const questionToDuplicate = prevItems[index];
      if (!questionToDuplicate) return prevItems;
      
      // Create a deep copy of the question with a new ID
      const duplicatedQuestion: ExamItem = {
        ...questionToDuplicate,
        question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        options: questionToDuplicate.options ? [...questionToDuplicate.options] : undefined,
        correct_answer: Array.isArray(questionToDuplicate.correct_answer) 
          ? ([...questionToDuplicate.correct_answer] as number[] | string[])
          : questionToDuplicate.correct_answer,
        starter_files: questionToDuplicate.starter_files 
          ? questionToDuplicate.starter_files.map(f => ({ ...f }))
          : undefined,
      };
      
      // Insert the duplicated question right after the original
      const updatedItems = [...prevItems];
      updatedItems.splice(index + 1, 0, duplicatedQuestion);
      
      toast.success('Question duplicated successfully');
      return updatedItems;
    });
  }, [setItems]);

  const copyQuestion = useCallback((index: number | number[]) => {
    // Support both single index and array of indices
    const indices = Array.isArray(index) ? index : [index];
    const questionsToCopy = indices
      .map(idx => items[idx])
      .filter(q => q !== undefined);
    
    if (questionsToCopy.length === 0) return;
    
    // Copy question data to clipboard with a marker
    const questionData = questionsToCopy.map(question => ({
      __quizzerd_question__: true,
      ...question,
      question_id: undefined, // Will be regenerated when pasted
    }));
    
    navigator.clipboard.writeText(JSON.stringify(questionData, null, 2))
      .then(() => {
        const count = questionData.length;
        toast.success(`${count} question${count === 1 ? '' : 's'} copied to clipboard`);
      })
      .catch(() => {
        toast.error('Failed to copy question');
      });
  }, [items]);

  const pasteQuestion = useCallback(async (afterIndex: number) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const parsedData = JSON.parse(clipboardText);
      
      // Handle both single question and array of questions
      let questionsToPaste: any[] = [];
      
      if (Array.isArray(parsedData)) {
        // Array of questions
        questionsToPaste = parsedData;
      } else if (parsedData.__quizzerd_question__ || parsedData.question_type) {
        // Single question
        questionsToPaste = [parsedData];
      } else {
        toast.error('Clipboard does not contain a valid question');
        return;
      }
      
      // Process all questions
      const newQuestions: ExamItem[] = questionsToPaste.map((questionData) => {
        const { __quizzerd_question__, question_id, ...question } = questionData;
        return {
          ...question,
          question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          question_type: question.question_type || 'short_answer',
          question_text: question.question_text || '',
          points: question.points || 1,
          required: question.required ?? true,
        };
      });
      
      // Insert all pasted questions after the specified index
      setItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems.splice(afterIndex + 1, 0, ...newQuestions);
        return updatedItems;
      });
      
      const count = newQuestions.length;
      toast.success(`${count} question${count === 1 ? '' : 's'} pasted successfully`);
    } catch (error) {
      toast.error('Failed to paste question - invalid format');
      console.error('Paste error:', error);
    }
  }, [setItems]);

  const cutQuestion = useCallback((index: number | number[]) => {
    // Support both single index and array of indices
    const indices = Array.isArray(index) ? index : [index];
    const questionsToCut = indices
      .map(idx => items[idx])
      .filter(q => q !== undefined);
    
    if (questionsToCut.length === 0) return;
    
    // Copy question data to clipboard with a marker
    const questionData = questionsToCut.map(question => ({
      __quizzerd_question__: true,
      ...question,
      question_id: undefined,
    }));
    
    navigator.clipboard.writeText(JSON.stringify(questionData, null, 2))
      .then(() => {
        // Remove the questions after copying (in reverse order to maintain correct indices)
        setItems(prevItems => {
          const sortedIndices = [...indices].sort((a, b) => b - a);
          return prevItems.filter((_, i) => !sortedIndices.includes(i));
        });
        const count = questionData.length;
        toast.success(`${count} question${count === 1 ? '' : 's'} cut to clipboard`);
      })
      .catch(() => {
        toast.error('Failed to cut question');
      });
  }, [items, setItems]);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      return newItems;
    });
    
    toast.success('Question moved up');
  }, [setItems]);

  const moveDown = useCallback((index: number) => {
    if (index >= items.length - 1) return;
    
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      return newItems;
    });
    
    toast.success('Question moved down');
  }, [items.length, setItems]);

  const insertAbove = useCallback((index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index, 0, newQuestion);
      return updatedItems;
    });
    
    toast.success('New question inserted above');
  }, [setItems]);

  const insertBelow = useCallback((index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index + 1, 0, newQuestion);
      return updatedItems;
    });
    
    toast.success('New question inserted below');
  }, [setItems]);

  const resetQuestion = useCallback((index: number) => {
    const question = items[index];
    if (!question) return;
    
    const resetQuestion: ExamItem = {
      ...question,
      question_text: '',
      options: question.options ? question.options.map(() => '') : undefined,
      correct_answer: undefined,
      explanation: '',
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = resetQuestion;
      return updatedItems;
    });
    
    toast.success('Question reset to empty state');
  }, [items, setItems]);

  const shuffleOptions = useCallback((index: number) => {
    const question = items[index];
    if (!question || !question.options) return;
    
    // Fisher-Yates shuffle algorithm
    const shuffled = [...question.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        options: shuffled,
      };
      return updatedItems;
    });
    
    toast.success('Options shuffled');
  }, [items, setItems]);

  const clearOptions = useCallback((index: number) => {
    const question = items[index];
    if (!question || !question.options) return;
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        options: ['', ''],
        correct_answer: undefined,
      };
      return updatedItems;
    });
    
    toast.success('All options cleared');
  }, [items, setItems]);

  const exportQuestion = useCallback((index: number) => {
    const question = items[index];
    if (!question) return;
    
    const exportData = {
      ...question,
      exported_at: new Date().toISOString(),
      app: 'QuizZerd'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-${question.question_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Question exported as JSON');
  }, [items]);

  const reorderQuestions = useCallback((newItems: ExamItem[]) => {
    setItems(newItems);
  }, [setItems]);

  return {
    updateQuestion,
    addOption,
    updateOption,
    removeOption,
    removeQuestion,
    duplicateQuestion,
    copyQuestion,
    pasteQuestion,
    cutQuestion,
    moveUp,
    moveDown,
    insertAbove,
    insertBelow,
    resetQuestion,
    shuffleOptions,
    clearOptions,
    exportQuestion,
    reorderQuestions,
  };
}

