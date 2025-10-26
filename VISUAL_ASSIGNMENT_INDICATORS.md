# Visual Assignment Indicators in Publish Dialog

## Overview
The publish dialog now shows visual indicators for classes that already have the exam published, making it immediately clear which classes are new and which already have assignments.

## Visual Design

### Classes Already Published
```
┌─────────────────────────────────────────────────────┐
│ [✓] jkhdfj kdh j  [✓ Already Published]            │  ← Green background
│     Description text                                 │     Checkbox disabled
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [✓] 1  [✓ Already Published]                       │  ← Green background
│                                                      │     Checkbox disabled
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [✓] AP CS  [✓ Already Published]                   │  ← Green background
│     Advanced Placement Computer Science              │     Checkbox disabled
└─────────────────────────────────────────────────────┘
```

### Classes Available for Publishing
```
┌─────────────────────────────────────────────────────┐
│ [ ] COMP 101                                        │  ← Normal background
│     Introduction to Programming                      │     Checkbox enabled
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [ ] COMP 201                                        │  ← Hover effect
│     Data Structures                                  │     Checkbox enabled
└─────────────────────────────────────────────────────┘
```

## Visual Indicators

### 1. **Background Color**
- **Already Published**: Light green background (`bg-green-50` / `dark:bg-green-950/20`)
- **Available**: Normal background with hover effect

### 2. **Border**
- **Already Published**: Green border (`border-green-200` / `dark:border-green-900`)
- **Available**: No border

### 3. **Badge**
- Shows "✓ Already Published" in green
- Only appears on classes that already have the exam
- Color: Green text on green background

### 4. **Checkbox**
- **Already Published**: Disabled and checked (grayed out)
- **Available**: Enabled and interactive

### 5. **Opacity**
- **Already Published**: Slightly faded (70% opacity)
- **Available**: Full opacity (100%)

### 6. **Cursor**
- **Already Published**: `cursor-not-allowed`
- **Available**: `cursor-pointer`

## How It Works

### Data Flow
```
1. Open publish dialog
   ↓
2. Fetch all classes user has access to
   ↓
3. Check which classes already have this exam
   (API: /api/classes/assignments/check?examId=...)
   ↓
4. Mark classes with existing assignments
   ↓
5. Render with visual indicators
```

### API Endpoint: `/api/classes/assignments/check`

**Request:**
```
GET /api/classes/assignments/check?examId={uuid}
```

**Response:**
```json
{
  "success": true,
  "classIds": [
    "class-uuid-1",
    "class-uuid-2",
    "class-uuid-3"
  ],
  "count": 3
}
```

**Logic:**
1. Query `class_assignments` table for all assignments with this `exam_id`
2. Get the assignment IDs
3. Query `class` table to find which classes have these assignment IDs
4. Return list of class IDs

### Frontend State Management

```typescript
// State for classes that already have assignments
const [classesWithExistingAssignments, setClassesWithExistingAssignments] = 
  useState<string[]>([]);

// Check on initial load
const fetchClasses = async () => {
  const classes = await getClasses();
  await checkExistingAssignments(classes);
};

// Determine if class is already published
const isAlreadyPublished = classesWithExistingAssignments.includes(cls.class_id);
```

## User Experience Benefits

### 1. **Instant Visual Feedback**
```
Before: Need to try publishing to see error
After: See immediately which classes already have it
```

### 2. **Prevents Mistakes**
- Can't accidentally check already-published classes
- Disabled checkboxes prevent user error
- Clear visual distinction between states

### 3. **Better Understanding**
- Understand exam distribution at a glance
- Know which classes are new targets
- Avoid confusion about duplicate attempts

### 4. **Improved Workflow**
```
Scenario: Want to add exam to 2 more classes

Without indicators:
1. Check 5 classes
2. Click publish
3. Get error about 3 duplicates
4. Go back, uncheck those 3
5. Try again

With indicators:
1. See 3 are already published (green with badge)
2. Check only the 2 new ones
3. Click publish
4. Success! ✅
```

## Styling Details

### Light Mode
```css
Already Published:
- Background: bg-green-50 (very light green)
- Border: border-green-200 (light green)
- Badge: bg-green-100, text-green-700

Available:
- Background: transparent → hover:bg-accent/50
- Border: none
- Badge: none
```

### Dark Mode
```css
Already Published:
- Background: dark:bg-green-950/20 (very dark green, 20% opacity)
- Border: dark:border-green-900 (dark green)
- Badge: dark:bg-green-900/30, dark:text-green-300

Available:
- Background: transparent → hover:bg-accent/50
- Border: none
- Badge: none
```

## States Summary

| Class State | Checkbox | Background | Border | Badge | Cursor | Opacity |
|------------|----------|------------|--------|-------|--------|---------|
| Already Published | Disabled ✓ | Green | Green | "Already Published" | not-allowed | 70% |
| Available | Enabled | Normal | None | None | pointer | 100% |

## Code Example

```tsx
{classes.map((cls) => {
  const isAlreadyPublished = classesWithExistingAssignments.includes(cls.class_id);
  
  return (
    <div className={`
      ${isAlreadyPublished 
        ? 'bg-green-50 border border-green-200' 
        : 'hover:bg-accent/50'}
    `}>
      <Checkbox
        disabled={isAlreadyPublished}
        checked={selectedClassIds.includes(cls.class_id)}
      />
      
      <Label className={
        isAlreadyPublished ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      }>
        {cls.class_name}
        
        {isAlreadyPublished && (
          <Badge>
            <CheckIcon /> Already Published
          </Badge>
        )}
      </Label>
    </div>
  );
})}
```

## Performance Considerations

### Optimization
- Single API call to check all assignments
- Cached during dialog session
- No repeated checks on re-open

### Network Request
```
Load Dialog:
  1 request: GET /api/classes/get (get all classes)
  1 request: GET /api/classes/assignments/check (check existing)
  
Total: 2 requests, loaded once per dialog session
```

## Future Enhancements

Potential improvements:
- **Tooltip on hover** - Show when assignment was created
- **Assignment count** - If multiple assignments exist
- **Update button** - Option to update existing assignment instead of create new
- **Visual timeline** - When each class received the assignment
- **Bulk operations** - Unpublish from selected classes

## User Feedback

Expected user reactions:
- 😊 "I can see which classes already have it!"
- ✅ "No more duplicate errors"
- 👍 "Much clearer what's happening"
- 💯 "Love the green badges"

## Testing Checklist

- [ ] Fresh exam (no assignments) → All classes available
- [ ] Exam published to 1 class → That class shows green badge
- [ ] Exam published to all classes → All show green badges
- [ ] Try to check disabled class → Checkbox doesn't change
- [ ] Hover over disabled class → Shows not-allowed cursor
- [ ] Badge appears with check icon
- [ ] Colors work in both light and dark mode
- [ ] API call happens on dialog open
- [ ] State persists during dialog session
- [ ] Visual feedback is immediate and clear

