# Context Menu Implementation

## Overview
The shadcn context menu has been successfully implemented on your QuestionCard component in the exam editor. Users can now right-click on any question card to access quick actions. The context menu is **context-aware** and shows different options based on whether text is selected or not.

## Features Implemented

### 1. Context Menu Component
- **Location**: `src/components/ui/context-menu.tsx`
- **Status**: ✅ Already created with all necessary components
- **Dependency**: `@radix-ui/react-context-menu` (already installed)

### 2. Question Card Integration
- **Location**: `src/components/exam/QuestionCard.tsx`
- **Changes**:
  - Wrapped the entire Card component with `<ContextMenu>` and `<ContextMenuTrigger>`
  - Added intelligent text selection detection
  - **Context-Aware Menu**: Shows different options based on context

#### When NO text is selected (Question-level actions):
  1. **Duplicate Question** - Creates a copy of the question right after the original
  2. **Copy Question** - Copies the question data to clipboard as JSON with a marker
  3. **Paste Question** - Pastes a previously copied question after the current one
  4. **Delete Question** - Removes the question (destructive variant with red styling)

#### When text IS selected (Text-level actions):
  1. **Copy Text** - Copies the selected text to clipboard
  2. **Paste Text** - Pastes clipboard text at the cursor position

### 3. Handler Functions
- **Location**: `src/app/(withOutSidebarNav)/exam/[examId]/edit/page.tsx`
- **New Functions**:

#### `duplicateQuestion(index: number)`
- Creates a deep copy of the question at the specified index
- Generates a new unique `question_id` for the duplicate
- Inserts the duplicated question immediately after the original
- Shows a success toast notification
- Properly handles:
  - Options arrays
  - Correct answers (both single values and arrays)
  - Starter files for coding questions

#### `copyQuestion(index: number)`
- Copies the question data to the system clipboard as formatted JSON
- Adds a `__quizzerd_question__` marker to identify valid question data
- Removes the question_id (will be regenerated when pasted)
- Shows success/error toast notification
- Can be used to copy questions between exams

#### `pasteQuestion(afterIndex: number)`
- Reads question data from the clipboard
- Validates that the clipboard contains valid question JSON
- Checks for the `__quizzerd_question__` marker or `question_type` field
- Generates a new unique `question_id`
- Inserts the pasted question after the specified index
- Shows success/error toast notifications
- Handles malformed JSON gracefully with error messages

#### Text Selection Handlers (in QuestionCard)

##### `handleCopyText()`
- Copies selected text to clipboard
- Only available when text is selected
- Shows success/error toast notification

##### `handlePasteText()`
- Pastes text from clipboard at current cursor position
- Uses `document.execCommand` for proper insertion
- Works in text editors and input fields
- Shows success/error toast notification

### 4. Props Flow
```
EditExamPage (page.tsx)
  ↓ passes handlers to
QuestionsTab (QuestionsTab.tsx)
  ↓ passes handlers to
QuestionCard (QuestionCard.tsx)
  ↓ uses in
ContextMenu
```

## Usage

### For Users

#### Question-level Actions:
1. **Right-click** on any question card (without selecting text)
2. The context menu will show question-level actions:
   - Duplicate Question
   - Copy Question
   - Paste Question (if you have a question in clipboard)
   - Delete Question
3. Click an action to execute it

#### Text-level Actions:
1. **Select text** within any field in the question card
2. **Right-click** on the selected text
3. The context menu will show text-level actions:
   - Copy Text
   - Paste Text
4. Click an action to execute it

#### Workflow Examples:

**Copy & Paste Questions:**
1. Right-click a question → "Copy Question"
2. Right-click another question → "Paste Question"
3. The copied question appears after the selected one

**Copy Text Across Fields:**
1. Select text in one field → Right-click → "Copy Text"
2. Click in another field → Right-click → "Paste Text"
3. Text is inserted at cursor position

### For Developers
To add more context menu items, edit the `ContextMenuContent` in `QuestionCard.tsx`:

```tsx
<ContextMenuContent className="w-64">
  {/* Existing items */}
  
  {/* Add new items here */}
  <ContextMenuItem onClick={() => yourHandler(index)}>
    <YourIcon className="mr-2 h-4 w-4" />
    <span>Your Action</span>
  </ContextMenuItem>
</ContextMenuContent>
```

## Context Menu Components Available

From `src/components/ui/context-menu.tsx`, you can use:
- `ContextMenu` - Root wrapper
- `ContextMenuTrigger` - Element that triggers the menu (usually with `asChild`)
- `ContextMenuContent` - The popup menu container
- `ContextMenuItem` - Individual menu items (supports `variant="destructive"`)
- `ContextMenuCheckboxItem` - Checkable menu items
- `ContextMenuRadioGroup` & `ContextMenuRadioItem` - Radio button items
- `ContextMenuSeparator` - Visual separator between items
- `ContextMenuLabel` - Section labels
- `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent` - Nested menus
- `ContextMenuShortcut` - Keyboard shortcut display

## Styling
The context menu uses your existing theme variables and automatically adapts to light/dark mode. The destructive variant uses the `destructive` color from your theme for dangerous actions like delete.

## Testing

### Test Question-level Actions:
1. Navigate to the exam editor page
2. Add a question
3. Right-click on the question card (without selecting text)
4. You should see the context menu with:
   - ✅ Duplicate Question (with copy icon)
   - ✅ Copy Question (with clipboard icon)
   - ✅ Paste Question (with paste icon)
   - ✅ A separator
   - ✅ Delete Question (in red, with trash icon)

### Test Text-level Actions:
1. Select some text in a question field
2. Right-click on the selected text
3. You should see the context menu with:
   - ✅ Copy Text (with clipboard icon)
   - ✅ Paste Text (with paste icon)

### Test Copy & Paste Workflow:
1. Right-click a question → "Copy Question"
2. See success toast: "Question copied to clipboard"
3. Right-click the same or different question → "Paste Question"
4. See success toast: "Question pasted successfully"
5. Verify the question appears with a new ID

