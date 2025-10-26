# Persistent Publish Dialog State

## Overview
The publish dialog now remembers your selections even after closing and reopening, providing a seamless editing experience.

## What Was Fixed

### Problem Before
```
1. Open publish dialog
2. Select "Specific Classes"
3. Check 2 classes
4. Click "Cancel"
5. Reopen dialog
❌ Result: Resets to default state
```

### Solution Now
```
1. Open publish dialog
2. Select "Specific Classes"
3. Check 2 classes
4. Click "Cancel"
5. Reopen dialog
✅ Result: Still shows "Specific Classes" with 2 classes checked!
```

## How It Works

### State Persistence
The dialog maintains these states across open/close cycles:

1. **`publishType`** - Which radio option is selected (public/classes/code)
2. **`selectedClassIds`** - Which classes are checked
3. **`hasInitializedPublishDialog`** - Tracks if dialog has been initialized

### Initialization Logic

```javascript
// First time opening the dialog:
if (!hasInitializedPublishDialog) {
  // Set initial state based on exam's current configuration
  if (exam is public) → Select "Public"
  else if (exam has classes) → Select "Specific Classes" + check those classes
  else if (exam is published) → Select "Private with Code"
  else → Default to "Public"
  
  hasInitializedPublishDialog = true
}

// Subsequent times opening the dialog:
// Uses the last state the user set
// Remembers: Radio selection + Checked classes
```

## Detailed Behavior

### Scenario 1: First Time Opening (Fresh Exam)
```
Exam State: Not published yet

Click "Publish":
→ Dialog opens with "Public" selected (default)
→ User changes to "Specific Classes"
→ User checks COMP 101 and COMP 201
→ User clicks "Cancel"

Reopen dialog:
→ Still shows "Specific Classes" ✅
→ COMP 101 and COMP 201 still checked ✅
```

### Scenario 2: Already Published to Classes
```
Exam State: Published to 2 classes

Click "Publish":
→ Dialog opens with "Specific Classes" selected (from exam data)
→ Those 2 classes are checked (from exam data)
→ User adds COMP 301 to selection
→ User clicks "Cancel"

Reopen dialog:
→ Still shows "Specific Classes" ✅
→ All 3 classes still checked (including newly added) ✅
```

### Scenario 3: Switching Between Options
```
Click "Publish":
→ Select "Public"
→ Click "Cancel"

Reopen:
→ Shows "Public" ✅

Change to "Specific Classes":
→ Check 2 classes
→ Click "Cancel"

Reopen:
→ Shows "Specific Classes" ✅
→ 2 classes checked ✅

Change to "Private with Code":
→ Click "Cancel"

Reopen:
→ Shows "Private with Code" ✅
→ Previously checked classes still remembered if you switch back ✅
```

## State Lifecycle

### On Page Load
```
1. Exam data loaded from API
2. selectedClassIds = exam.class_id (from database)
3. hasInitializedPublishDialog = false
4. publishType = default ('public')
```

### First Dialog Open
```
1. Check if hasInitializedPublishDialog === false
2. If false:
   - Determine initial publishType from exam state
   - Set hasInitializedPublishDialog = true
3. Open dialog with determined state
```

### Subsequent Dialog Opens
```
1. Check if hasInitializedPublishDialog === false
2. If true (already initialized):
   - Skip initialization
   - Use current publishType and selectedClassIds
3. Open dialog with preserved state
```

### On Dialog Close (Cancel)
```
1. Close dialog
2. Keep all state variables unchanged:
   - publishType → Preserved ✅
   - selectedClassIds → Preserved ✅
   - hasInitializedPublishDialog → Stays true ✅
```

### On Successful Publish
```
1. Save exam with selected configuration
2. Update local state:
   - selectedClassIds updated if needed
   - isPublic updated
   - isPublished = true
3. Close dialog
4. State reflects new published configuration
```

## Benefits

### 1. **Better UX**
- No frustration from losing selections
- Feels natural and intuitive
- Matches user expectations

### 2. **Efficiency**
- Don't have to re-select everything
- Quick iterations when configuring
- Easy to make small adjustments

### 3. **Safety**
- Can review selections without fear of losing them
- Can cancel and come back
- Less chance of accidental changes

### 4. **Professional Feel**
- Matches behavior of modern apps
- Polished user experience
- Builds trust in the platform

## Technical Implementation

### State Management
```typescript
// Initialization flag
const [hasInitializedPublishDialog, setHasInitializedPublishDialog] = 
  useState<boolean>(false);

// Publish type persists
const [publishType, setPublishType] = 
  useState<'public' | 'classes' | 'code'>('public');

// Selected classes persist
const [selectedClassIds, setSelectedClassIds] = 
  useState<string[]>([]);
```

### Smart Initialization
```typescript
const handlePublishClick = () => {
  // Only initialize once, then remember user choices
  if (!hasInitializedPublishDialog) {
    // Set initial state from exam data
    // ...
    setHasInitializedPublishDialog(true);
  }
  
  setPublishDialogOpen(true);
};
```

### Non-Destructive Cancel
```typescript
<Button 
  variant="outline" 
  onClick={() => {
    // Just close, keep all state
    setPublishDialogOpen(false);
  }}
>
  Cancel
</Button>
```

## Edge Cases Handled

### ✅ Switching Between Exams
When navigating to a different exam:
- State resets for the new exam
- Each exam maintains its own state
- `hasInitializedPublishDialog` reset on new exam load

### ✅ Page Refresh
- State is lost on refresh (expected behavior)
- Re-initialized from database on reload
- User's unsaved changes appropriately discarded

### ✅ Concurrent Edits
- State reflects latest user actions
- Database saves only on "Publish Exam" click
- Cancel doesn't affect database

## Testing Checklist

- [ ] Open dialog, change selection, cancel, reopen → Selection preserved
- [ ] Select classes, cancel, reopen → Classes still checked
- [ ] Switch between radio options multiple times → Last selection kept
- [ ] Publish successfully → State updates to reflect new config
- [ ] Cancel and make multiple iterations → All changes preserved
- [ ] Navigate away and back → State reset appropriately
- [ ] First open shows exam's current state
- [ ] Subsequent opens show user's last choices

## Related Features

Works seamlessly with:
- ✅ Smart auto-selection from exam data
- ✅ Visual "Current" and "Currently: X" badges
- ✅ Class count badge on exam cards
- ✅ Assignment creation on publish
- ✅ Auto-save functionality

## User Feedback

Expected user reactions:
- 😊 "It remembers what I selected!"
- ✅ "I can experiment without losing my work"
- 👍 "Feels professional and polished"
- 💯 "This is how it should work"

