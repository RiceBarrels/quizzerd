# Smart Publish Dialog - Auto-Selection Feature

## Overview
The publish dialog now intelligently pre-selects options based on the exam's current published state, making it easy to see and update where an exam is published.

## Features Implemented

### 1. **Auto-Detect Current Publishing State**
When you click "Publish" on an already published exam, the dialog automatically:
- ✅ Selects the correct radio option based on current state
- ✅ Pre-checks the classes it's already published to
- ✅ Shows visual badges indicating the current configuration

### 2. **Visual Indicators**

#### **Current State Badges**
Each publishing option shows a "Current" badge when it's the active configuration:

- 🌍 **Public** → Shows "Current" badge if `is_public = true`
- 📚 **Specific Classes** → Shows "Currently: X" badge with class count if published to classes
- 🔑 **Private with Exam Code** → Shows "Current" badge if published but not public and no classes

#### **Class Selection Info**
When "Specific Classes" is selected:
- Shows count of selected classes in the label ("Currently: 2")
- Displays selected count at the top of the class list
- Shows an info banner if already published to classes:
  ```
  ℹ️ This exam is currently published to 2 classes.
  You can update the selection below.
  ```

### 3. **Smart Logic**

The dialog determines the initial selection using this logic:

```javascript
if (exam.is_public === true) {
  → Select "Public"
} else if (exam.class_id.length > 0) {
  → Select "Specific Classes" + pre-check those classes
} else if (exam.is_published === true) {
  → Select "Private with Exam Code"
} else {
  → Default to "Public" (first time publishing)
}
```

## User Experience

### **First Time Publishing**
- Dialog defaults to "Public" option
- Clean, simple interface
- Clear descriptions of each option

### **Republishing / Updating**
- Opens with current state pre-selected ✨
- Visual badges show what's currently active
- Classes are already checked if published to them
- Easy to modify and update

### **Example Scenarios**

#### Scenario 1: Exam Published to 2 Classes
```
Publishing Dialog Opens:

○ Public
● Specific Classes [Currently: 2]
○ Private with Exam Code

ℹ️ This exam is currently published to 2 classes.
You can update the selection below.

☑ COMP 101 - Intro to Programming
☑ COMP 201 - Data Structures
☐ COMP 301 - Algorithms

[2 classes selected]
```

#### Scenario 2: Exam Published as Public
```
Publishing Dialog Opens:

● Public [Current]
○ Specific Classes
○ Private with Exam Code
```

#### Scenario 3: Exam Published with Code Only
```
Publishing Dialog Opens:

○ Public
○ Specific Classes
● Private with Exam Code [Current]
```

## Benefits

1. **✅ Clarity** - Immediately see how exam is currently published
2. **✅ Efficiency** - No need to re-select classes every time
3. **✅ Safety** - Less chance of accidentally changing publishing settings
4. **✅ Flexibility** - Easy to update and modify settings
5. **✅ Professional UX** - Matches expectations of modern applications

## Technical Implementation

### Files Modified
- `src/app/(withOutSidebarNav)/exam/[examId]/edit/page.tsx`

### Key Changes
1. Added `handlePublishClick()` logic to determine initial state
2. Added visual badges using `<Badge>` component
3. Added info banner for class selection
4. Moved class count display to top of selection area
5. Classes remain checked based on `selectedClassIds` state

### State Management
- `publishType`: Automatically set based on exam state
- `selectedClassIds`: Loaded from exam data, persists between dialog opens
- `isPublic`: Used to determine "Public" option selection
- `isPublished`: Used to show "Current" badges

## Testing Checklist

- [ ] First time publishing - defaults to Public
- [ ] Republishing public exam - shows "Current" on Public
- [ ] Republishing to classes - pre-selects and checks classes
- [ ] Republishing private - shows "Current" on Private
- [ ] Can change selection after opening dialog
- [ ] Badges update correctly when switching options
- [ ] Class count displays accurately
- [ ] Info banner appears when classes are pre-selected
- [ ] Can add/remove class selections
- [ ] Publish button works with all options

## Future Enhancements

Potential improvements for the future:
- Show class names in the badge tooltip
- Add a "View Assignments" link in the info banner
- History of publishing changes
- Bulk update multiple exams at once
- Schedule publishing changes

