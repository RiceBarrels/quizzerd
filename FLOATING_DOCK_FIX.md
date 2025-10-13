# Floating Format Dock Fix for Questions Tab

## Problem

The floating format dock (text formatting toolbar) was working in the Exam Details tab but **not appearing** in the Questions tab when editing questions in QuestionCard components.

## Root Causes

1. **Z-index conflict**: The dock had `z-[9999]` but needed to be higher to appear above all Radix UI components (Select, Popover, Context Menu) which use `z-50`

2. **Aggressive blur detection**: The dock was hiding when users interacted with Select dropdowns, Popovers, or Context Menus in the QuestionCard

3. **Focus management**: When Select components changed values, the editor would lose focus and the dock would disappear

## Solutions Implemented

### 1. Increased Z-Index
```tsx
// Before: z-[9999]
// After: z-[99999]
className="floating-format-dock ... z-[99999] ..."
style={{ isolation: 'isolate' }}
```

**Why**: Ensures the dock appears above all Radix UI components (z-50) and creates a new stacking context

### 2. Enhanced Blur Detection
Added detection for:
- `[data-radix-context-menu-content]` - Context menus
- `[data-radix-popover-content]` - Popover components
- `[data-slot="context-menu"]` - Context menu slots
- `.text-editor-wrapper` - Editor wrapper divs

**Why**: Prevents the dock from hiding when users interact with UI components in QuestionCard

### 3. Increased Blur Timeout
```tsx
// Before: 200ms
// After: 300ms
setTimeout(() => { ... }, 300);
```

**Why**: Gives more time for focus to transfer between components without hiding the dock

### 4. Select Component Improvements

Added `onOpenChange` handler:
```tsx
<Select
  onOpenChange={(open) => {
    if (open && dockInstance?.hideTimeout) {
      clearTimeout(dockInstance.hideTimeout);
      dockInstance.hideTimeout = undefined;
    }
  }}
  ...
>
```

**Why**: Cancels the hide timeout when Select dropdown opens

Added auto-refocus after selection:
```tsx
onValueChange={(value) => {
  // ... apply format ...
  
  // Keep editor focused after selection
  if (activeEditor?.ref?.current) {
    setTimeout(() => {
      activeEditor.ref.current?.focus();
    }, 50);
  }
}}
```

**Why**: Maintains editor focus after changing text styles, keeping the dock visible

### 5. Increased Select Dropdown Z-Index
```tsx
<SelectContent className="z-[100000]">
```

**Why**: Ensures Select dropdown appears above the floating dock when both are visible

## Technical Details

### Updated Files
1. **`src/components/editors/floating-format-dock.tsx`**
   - Increased dock z-index to `z-[99999]`
   - Added `isolation: 'isolate'` style
   - Enhanced blur detection with Context Menu and Popover support
   - Increased blur timeout from 200ms to 300ms
   - Added Select `onOpenChange` handler
   - Added auto-refocus after Select changes
   - Increased Select dropdown z-index to `z-[100000]`

### Z-Index Hierarchy
```
z-[100000] - Select dropdowns (when open)
z-[99999]  - Floating format dock
z-50       - Context menus, Popovers, Select triggers
z-0        - Normal content
```

### Blur Detection Chain
```javascript
Don't hide if related target is in:
1. .floating-format-dock
2. [role="dialog"]
3. [data-radix-select-content]
4. [data-radix-popover-content]
5. [data-radix-context-menu-content]
6. [data-slot="context-menu"]

Double-check active element is not in:
1. .floating-format-dock
2. [role="dialog"]
3. .ql-editor
4. [data-radix-select-content]
5. [data-radix-popover-content]
6. [data-radix-context-menu-content]
7. .text-editor-wrapper
```

## Testing

### Verify the fix works:

1. **Questions Tab - Question Text**
   - Navigate to Questions tab
   - Click into a question text editor
   - ✅ Floating dock should appear at bottom center
   - Apply formatting (bold, italic, etc.)
   - ✅ Formatting should apply correctly

2. **Questions Tab - Options**
   - Edit a multiple choice question
   - Click into an option text editor
   - ✅ Dock should appear
   - Change text styles
   - ✅ Styles should apply

3. **Questions Tab - With Select**
   - Focus a text editor (dock appears)
   - Open the "Points" or "Question Type" select
   - ✅ Dock should stay visible
   - Close select
   - ✅ Dock should still be visible

4. **Questions Tab - With Context Menu**
   - Focus a text editor (dock appears)
   - Right-click for context menu
   - ✅ Dock should stay visible
   - Close context menu
   - ✅ Dock should still be visible

5. **Dock Select Dropdown**
   - Focus a text editor
   - Click the heading dropdown in the dock
   - ✅ Dropdown should appear above dock
   - Select a heading
   - ✅ Editor should stay focused
   - ✅ Dock should stay visible

6. **Details Tab - Verify Still Works**
   - Navigate to Details tab
   - Click into exam description editor
   - ✅ Dock should appear and work normally

## Benefits

1. **Consistent UX**: Dock now works the same in all tabs
2. **Better Focus Management**: Dock stays visible when using Select/Popover components
3. **Improved Stability**: Less flickering and unexpected hiding
4. **Better Layering**: Proper z-index hierarchy prevents visual conflicts

## Notes

- The dock renders using `createPortal` to `document.body`, so it's not affected by parent overflow
- The increased z-index ensures it appears above all standard UI components
- The isolation style creates a new stacking context to prevent interference
- The 300ms blur timeout provides a good balance between responsiveness and stability

