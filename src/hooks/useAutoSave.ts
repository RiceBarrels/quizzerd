import { useRef, useCallback, useEffect } from 'react';

interface UseAutoSaveOptions {
  dependencies: any[];
  saveFn: (isAutoSave: boolean) => Promise<void>;
  enabled: boolean;
  debounceMs?: number;
}

/**
 * Performs a deep equality check between two dependency arrays
 * @param {any[]} prev - Previous dependency array
 * @param {any[]} current - Current dependency array
 * @returns {boolean} True if arrays are deeply equal, false otherwise
 */
function areDependenciesEqual(prev: any[], current: any[]): boolean {
  if (prev.length !== current.length) return false;
  
  for (let i = 0; i < prev.length; i++) {
    const prevVal = prev[i];
    const currentVal = current[i];
    
    // Handle primitives
    if (prevVal === currentVal) continue;
    
    // Handle null/undefined
    if (prevVal == null || currentVal == null) return false;
    
    // Handle arrays - recursively check each element
    if (Array.isArray(prevVal) && Array.isArray(currentVal)) {
      if (prevVal.length !== currentVal.length) return false;
      if (!areDependenciesEqual(prevVal, currentVal)) return false;
      continue;
    }
    
    // Handle objects - deep comparison
    if (typeof prevVal === 'object' && typeof currentVal === 'object') {
      // Use JSON.stringify for complex nested structures to ensure accurate comparison
      // This handles arrays of objects, nested objects, etc.
      try {
        const prevStr = JSON.stringify(prevVal, (key, value) => {
          // Sort object keys for consistent comparison
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((acc: any, k) => {
              acc[k] = value[k];
              return acc;
            }, {});
          }
          return value;
        });
        const currentStr = JSON.stringify(currentVal, (key, value) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((acc: any, k) => {
              acc[k] = value[k];
              return acc;
            }, {});
          }
          return value;
        });
        
        if (prevStr !== currentStr) return false;
        continue;
      } catch (e) {
        // Fallback to reference equality if stringify fails
        if (prevVal !== currentVal) return false;
        continue;
      }
    }
    
    // Values are different
    return false;
  }
  
  return true;
}

/**
 * Custom hook for automatic saving with debouncing and deep dependency comparison
 * @param {UseAutoSaveOptions} options - Configuration options for auto-save
 * @param {any[]} options.dependencies - Array of dependencies to watch for changes
 * @param {(isAutoSave: boolean) => Promise<void>} options.saveFn - Function to call when saving is triggered
 * @param {boolean} options.enabled - Whether auto-save is enabled
 * @param {number} [options.debounceMs=1000] - Debounce delay in milliseconds
 * @returns {Object} Object containing auto-save state and control functions
 */
export function useAutoSave({ dependencies, saveFn, enabled, debounceMs = 1000 }: UseAutoSaveOptions) {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const prevDependenciesRef = useRef<any[] | null>(null);
  const isInitialMountRef = useRef<boolean>(true);
  const saveFnRef = useRef(saveFn);
  
  // Keep saveFn ref updated
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);
  
  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Mark as having unsaved changes
    hasUnsavedChangesRef.current = true;
    
    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        saveFnRef.current(true);
      }
    }, debounceMs);
  }, [debounceMs]);
  
  // Watch for changes and trigger auto-save only when values actually change
  useEffect(() => {
    if (!enabled) return;
    
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDependenciesRef.current = dependencies;
      return;
    }
    
    // Check if dependencies actually changed
    if (prevDependenciesRef.current !== null) {
      if (areDependenciesEqual(prevDependenciesRef.current, dependencies)) {
        // No actual change, just update the ref
        prevDependenciesRef.current = dependencies;
        return;
      }
    }
    
    // Dependencies changed, trigger auto-save
    prevDependenciesRef.current = dependencies;
    triggerAutoSave();
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [...dependencies, triggerAutoSave, enabled]);
  
  const triggerManualSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Mark as having unsaved changes
    hasUnsavedChangesRef.current = true;
    
    // Set new timer with debounce delay
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        saveFnRef.current(true);
      }
    }, debounceMs);
  }, [debounceMs]);
  
  return {
    hasUnsavedChanges: hasUnsavedChangesRef.current,
    clearUnsavedChanges: () => {
      hasUnsavedChangesRef.current = false;
    },
    triggerSave: triggerManualSave
  };
}

