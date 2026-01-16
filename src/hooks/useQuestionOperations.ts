import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { ExamItem } from '@/types/exam';

// Maximum number of history states to keep
const MAX_HISTORY_SIZE = 50;
const HISTORY_STORAGE_KEY = 'quizzerd_question_history';

/**
 * Custom hook for managing question operations in an exam
 * @param {ExamItem[]} items - Array of exam items/questions
 * @param {React.Dispatch<React.SetStateAction<ExamItem[]>>} setItems - State setter function for updating the items array
 * @param {string} [examId] - Optional exam ID for unique session storage key
 * @returns {Object} Object containing various question operation functions
 */
export function useQuestionOperations(
  items: ExamItem[],
  setItems: React.Dispatch<React.SetStateAction<ExamItem[]>>,
  examId?: string
) {
  // History management for undo/redo
  const historyRef = useRef<ExamItem[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);

  // Generate storage key based on examId
  const storageKey = examId ? `${HISTORY_STORAGE_KEY}_${examId}` : HISTORY_STORAGE_KEY;

  // Load history from sessionStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.history && Array.isArray(parsed.history)) {
          historyRef.current = parsed.history;
          historyIndexRef.current = parsed.index ?? parsed.history.length - 1;
          console.log(`📜 [History] Loaded from sessionStorage | Index: ${historyIndexRef.current} | Total: ${historyRef.current.length}`);
        }
      }
    } catch (error) {
      console.error('📜 [History] Failed to load from sessionStorage:', error);
    }
  }, [storageKey]);

  // Save history to sessionStorage
  const saveHistoryToStorage = useCallback(() => {
    try {
      const data = {
        history: historyRef.current,
        index: historyIndexRef.current,
        timestamp: Date.now()
      };
      sessionStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`📜 [History] Saved to sessionStorage | Index: ${historyIndexRef.current} | Total: ${historyRef.current.length}`);
    } catch (error) {
      console.error('📜 [History] Failed to save to sessionStorage:', error);
    }
  }, [storageKey]);

  /**
   * Saves the current state to history (called before making changes)
   * @param {ExamItem[]} currentItems - The current items state to save
   */
  const saveToHistory = useCallback((currentItems: ExamItem[]) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      console.log('📜 [History] Skipping save (undo/redo in progress)');
      return;
    }

    // If we're not at the end of history, truncate forward history
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const truncated = historyRef.current.length - 1 - historyIndexRef.current;
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      console.log(`📜 [History] Truncated ${truncated} future states`);
    }

    // Add current state to history
    historyRef.current.push(JSON.parse(JSON.stringify(currentItems)));
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
      historyIndexRef.current--;
      console.log(`📜 [History] Exceeded max size, removed oldest state`);
    }

    console.log(`📜 [History] Saved state | Index: ${historyIndexRef.current} | Total: ${historyRef.current.length} | Questions: ${currentItems.length}`);

    // Persist to sessionStorage
    saveHistoryToStorage();
  }, [saveHistoryToStorage]);

  /**
   * Undoes the last operation
   * @returns {boolean} Whether undo was successful
   */
  const undo = useCallback(() => {
    console.log(`⏪ [Undo] Attempting | Current Index: ${historyIndexRef.current} | Total: ${historyRef.current.length}`);

    if (historyIndexRef.current <= 0) {
      console.log('⏪ [Undo] Nothing to undo');
      toast.info('Nothing to undo');
      return false;
    }

    // Save current state if this is the first undo
    if (historyIndexRef.current === historyRef.current.length - 1) {
      historyRef.current.push(JSON.parse(JSON.stringify(items)));
      console.log('⏪ [Undo] Saved current state before undoing');
    }

    historyIndexRef.current--;
    const previousState = historyRef.current[historyIndexRef.current];

    if (previousState) {
      isUndoRedoRef.current = true;
      setItems(JSON.parse(JSON.stringify(previousState)));
      console.log(`⏪ [Undo] Restored to Index: ${historyIndexRef.current} | Questions: ${previousState.length}`);
      saveHistoryToStorage();
      toast.success('Undone');
      return true;
    }
    return false;
  }, [items, setItems, saveHistoryToStorage]);

  /**
   * Redoes the last undone operation
   * @returns {boolean} Whether redo was successful
   */
  const redo = useCallback(() => {
    console.log(`⏩ [Redo] Attempting | Current Index: ${historyIndexRef.current} | Total: ${historyRef.current.length}`);

    if (historyIndexRef.current >= historyRef.current.length - 1) {
      console.log('⏩ [Redo] Nothing to redo');
      toast.info('Nothing to redo');
      return false;
    }

    historyIndexRef.current++;
    const nextState = historyRef.current[historyIndexRef.current];

    if (nextState) {
      isUndoRedoRef.current = true;
      setItems(JSON.parse(JSON.stringify(nextState)));
      console.log(`⏩ [Redo] Restored to Index: ${historyIndexRef.current} | Questions: ${nextState.length}`);
      saveHistoryToStorage();
      toast.success('Redone');
      return true;
    }
    return false;
  }, [setItems, saveHistoryToStorage]);

  /**
   * Checks if undo is available
   */
  const canUndo = useCallback(() => {
    return historyIndexRef.current > 0;
  }, []);

  /**
   * Checks if redo is available
   */
  const canRedo = useCallback(() => {
    return historyIndexRef.current < historyRef.current.length - 1;
  }, []);
  /**
   * Updates a specific field of a question at the given index
   * @param {number} index - The index of the question to update
   * @param {keyof ExamItem} field - The field name to update
   * @param {any} value - The new value for the field
   */
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

  /**
   * Adds a new empty option to a question
   * @param {number} questionIndex - The index of the question to add an option to
   */
  const addOption = useCallback((questionIndex: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options!.push('');
      }
      return updatedItems;
    });
  }, [setItems]);

  /**
   * Updates the value of a specific option in a question
   * @param {number} questionIndex - The index of the question containing the option
   * @param {number} optionIndex - The index of the option to update
   * @param {string} value - The new value for the option
   */
  const updateOption = useCallback((questionIndex: number, optionIndex: number, value: string) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options![optionIndex] = value;
      }
      return updatedItems;
    });
  }, [setItems]);

  /**
   * Removes an option from a question and adjusts the correct answer if needed
   * @param {number} questionIndex - The index of the question containing the option
   * @param {number} optionIndex - The index of the option to remove
   */
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

  /**
   * Removes a question from the exam
   * @param {number} index - The index of the question to remove
   */
  const removeQuestion = useCallback((index: number) => {
    saveToHistory(items);
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  }, [items, setItems, saveToHistory]);

  /**
   * Creates a duplicate of a question and inserts it right after the original
   * @param {number} index - The index of the question to duplicate
   */
  const duplicateQuestion = useCallback((index: number) => {
    saveToHistory(items);
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
  }, [items, setItems, saveToHistory]);

  /**
   * Copies one or more questions to the clipboard
   * @param {number | number[]} index - Single question index or array of question indices to copy
   */
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

  /**
   * Pastes question(s) from clipboard after the specified index
   * @param {number} afterIndex - The index after which to insert the pasted question(s)
   */
  const pasteQuestion = useCallback(async (afterIndex: number) => {
    try {
      saveToHistory(items);
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
  }, [items, setItems, saveToHistory]);

  /**
   * Cuts one or more questions (copies to clipboard and removes from exam)
   * @param {number | number[]} index - Single question index or array of question indices to cut
   */
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
        saveToHistory(items);
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
  }, [items, setItems, saveToHistory]);

  /**
   * Moves a question up one position in the list
   * @param {number} index - The index of the question to move up
   */
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;

    saveToHistory(items);
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      return newItems;
    });

    toast.success('Question moved up');
  }, [items, setItems, saveToHistory]);

  /**
   * Moves a question down one position in the list
   * @param {number} index - The index of the question to move down
   */
  const moveDown = useCallback((index: number) => {
    if (index >= items.length - 1) return;

    saveToHistory(items);
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      return newItems;
    });

    toast.success('Question moved down');
  }, [items, setItems, saveToHistory]);

  /**
   * Inserts a new empty question above the specified index
   * @param {number} index - The index above which to insert the new question
   */
  const insertAbove = useCallback((index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };

    saveToHistory(items);
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index, 0, newQuestion);
      return updatedItems;
    });

    toast.success('New question inserted above');
  }, [items, setItems, saveToHistory]);

  /**
   * Inserts a new empty question below the specified index
   * @param {number} index - The index below which to insert the new question
   */
  const insertBelow = useCallback((index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };

    saveToHistory(items);
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index + 1, 0, newQuestion);
      return updatedItems;
    });

    toast.success('New question inserted below');
  }, [items, setItems, saveToHistory]);

  /**
   * Resets a question to an empty state, clearing text, options, and answers
   * @param {number} index - The index of the question to reset
   */
  const resetQuestion = useCallback((index: number) => {
    const question = items[index];
    if (!question) return;

    const resetQ: ExamItem = {
      ...question,
      question_text: '',
      options: question.options ? question.options.map(() => '') : undefined,
      correct_answer: undefined,
      explanation: '',
    };

    saveToHistory(items);
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = resetQ;
      return updatedItems;
    });

    toast.success('Question reset to empty state');
  }, [items, setItems, saveToHistory]);

  /**
   * Randomly shuffles the options of a question using Fisher-Yates algorithm
   * @param {number} index - The index of the question whose options to shuffle
   */
  const shuffleOptions = useCallback((index: number) => {
    const question = items[index];
    if (!question || !question.options) return;

    // Fisher-Yates shuffle algorithm
    const shuffled = [...question.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    saveToHistory(items);
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        options: shuffled,
      };
      return updatedItems;
    });

    toast.success('Options shuffled');
  }, [items, setItems, saveToHistory]);

  /**
   * Clears all options of a question, resetting to two empty options
   * @param {number} index - The index of the question whose options to clear
   */
  const clearOptions = useCallback((index: number) => {
    const question = items[index];
    if (!question || !question.options) return;

    saveToHistory(items);
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
  }, [items, setItems, saveToHistory]);

  /**
   * Exports a question as a JSON file for download
   * @param {number} index - The index of the question to export
   */
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

  /**
   * Reorders all questions by replacing the entire items array
   * @param {ExamItem[]} newItems - The new array of questions in the desired order
   */
  const reorderQuestions = useCallback((newItems: ExamItem[]) => {
    saveToHistory(items);
    setItems(newItems);
  }, [items, setItems, saveToHistory]);

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
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

