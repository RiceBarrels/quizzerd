# Class Count Badge Feature

## Overview
Exam cards now display a persistent "Classes: X" badge showing how many classes each exam is published to, making it easy to see publishing status at a glance.

## Visual Example

### Exam Card Display
```
┌─────────────────────────────────────────┐
│  Introduction to Programming            │
│  Learn the basics of coding...          │
│                                          │
│  [Published] [Private] [Classes: 2]     │
│  👥 COMP 101, COMP 201                   │
│  🕐 60 minutes                           │
│  📝 100 points                           │
└─────────────────────────────────────────┘
```

## Badge Display Logic

The badge appears based on the exam's `class_id` array:

| Scenario | Badge Display |
|----------|---------------|
| Not published to any classes | ❌ No badge shown |
| Published to 1 class | ✅ `Classes: 1` |
| Published to 2 classes | ✅ `Classes: 2` |
| Published to 5 classes | ✅ `Classes: 5` |

## Features

### 1. **Always Visible**
- Shows on exam cards in the list view
- Persists even after leaving the exam
- No need to open the publish dialog to see the count

### 2. **Clear Visual Indicator**
- Uses secondary badge variant (subtle, not overwhelming)
- Icon (📄) helps identify it quickly
- Positioned with other status badges (Published, Public/Private)

### 3. **Complementary Information**
The badge works together with the existing class names display:
- **Badge**: Shows the count (`Classes: 2`)
- **Text below**: Shows actual class names (`COMP 101, COMP 201`)

## Where It Appears

### ✅ Exam List Page (`/exam`)
```
My Exams tab:
- All your exams show the class count badge
- Easy to scan and see which exams are assigned
- Quick visual overview of your published exams

Public Exams tab:
- Badge shows for exams published to classes
- Helps identify multi-class exams

Shared with Me tab:
- See which exams are shared across multiple classes
```

### ✅ Publish Dialog
```
When you click "Publish":
- Specific Classes option shows "Currently: 2"
- Matches the badge count from the list
- Consistent experience throughout the app
```

## Implementation Details

### Code Added to `/exam/page.tsx`
```jsx
{exam.class_id && Array.isArray(exam.class_id) && exam.class_id.length > 0 && (
  <Badge variant="secondary" className="gap-1">
    <FileTextIcon className="h-3 w-3" />
    Classes: {exam.class_id.length}
  </Badge>
)}
```

### Data Source
- Uses `exam.class_id` array from the database
- Already fetched by the existing API
- No additional API calls needed
- Real-time reflection of database state

### Badge Styling
- **Variant**: `secondary` (subtle gray)
- **Icon**: `FileTextIcon` (document/class icon)
- **Size**: Small, matches other badges
- **Positioning**: In the badge row with Published/Public badges

## User Experience Flow

### Before Publishing
```
Exam Card:
[Draft] [Private]
```

### After Publishing to 2 Classes
```
Exam Card:
[Published] [Private] [Classes: 2]
👥 COMP 101, COMP 201
```

### Navigating Away and Back
```
1. Publish exam to 2 classes
2. Navigate to another page
3. Come back to /exam page
4. Badge still shows "Classes: 2" ✅
```

## Benefits

1. **✅ Quick Overview** - See all exam distributions at a glance
2. **✅ No Extra Clicks** - Don't need to open each exam to check
3. **✅ Visual Clarity** - Color-coded badges are easy to scan
4. **✅ Persistent State** - Information always available
5. **✅ Consistent UX** - Matches publish dialog terminology

## Comparison

### Before This Feature
```
To see how many classes an exam is published to:
1. Click on exam card
2. Click "Publish" button
3. Look at selected classes
4. Close dialog
5. Go back to list
```

### After This Feature
```
To see how many classes an exam is published to:
1. Just look at the card! 👀
```

## Related Features

This badge complements these features:
- ✅ Smart publish dialog (auto-selects current state)
- ✅ Class names display (shows which specific classes)
- ✅ Assignment creation (automatic when publishing to classes)
- ✅ Assignment display in class pages

## Future Enhancements

Potential improvements:
- **Tooltip on hover**: Show class names in a tooltip
- **Click badge**: Quick link to see which classes
- **Color coding**: Different colors for different ranges (1-2 classes = blue, 3-5 = green, 6+ = orange)
- **Quick actions**: Right-click badge to add/remove classes

