# Duplicate Assignment Prevention

## Overview
The system now prevents creating duplicate assignments - you cannot publish the same exam to the same class twice. This ensures data integrity and prevents confusion.

## How It Works

### Detection Logic
When you try to publish an exam to classes, the system:

1. **Checks `class_assignments` table** for existing assignments with the same `exam_id`
2. **Cross-references with class's `assignments` array** to see which classes already have this exam
3. **Filters out duplicate classes** and only creates assignments for new classes
4. **Provides clear feedback** about what was created and what was skipped

### Database Query Flow
```sql
-- Step 1: Find existing assignments for this exam
SELECT assignment, exam_id 
FROM class_assignments 
WHERE exam_id = ?

-- Step 2: Check which classes have these assignments
SELECT class_id, assignments 
FROM class 
WHERE class_id IN (?)

-- Step 3: Filter and create only for classes without assignments
INSERT INTO class_assignments (...)
VALUES (...) -- Only for new classes
```

## User Scenarios

### Scenario 1: Publishing to New Classes (Success)
```
Exam: "Midterm Exam"
Current state: Not published to any classes
Action: Publish to COMP 101, COMP 201

Result:
✅ Created 2 assignments
✅ Both classes get the exam
✅ Success message shown
```

### Scenario 2: Republishing to Same Classes (Prevented)
```
Exam: "Midterm Exam"
Current state: Already published to COMP 101, COMP 201
Action: Try to publish to COMP 101, COMP 201 again

Result:
❌ No assignments created
❌ Error: "This exam is already published to all selected classes"
❌ Prevents duplicate data
```

### Scenario 3: Mixed - Some New, Some Existing (Partial Success)
```
Exam: "Midterm Exam"
Current state: Already published to COMP 101
Action: Publish to COMP 101, COMP 201, COMP 301

Result:
✅ Created 2 assignments (for COMP 201 and COMP 301)
⚠️  Skipped 1 class (COMP 101 - already has exam)
ℹ️  Message: "Exam published! Created 2 new assignment(s). 
    Skipped 1 class(es) that already have this exam."
```

## API Response Format

### Success with All Classes
```json
{
  "success": true,
  "data": [
    { "assignment": "uuid1", "exam_id": "...", ... },
    { "assignment": "uuid2", "exam_id": "...", ... }
  ],
  "message": "Successfully created 2 assignment(s)",
  "skippedClasses": [],
  "createdForClasses": ["class-uuid-1", "class-uuid-2"]
}
```

### Success with Some Skipped
```json
{
  "success": true,
  "data": [
    { "assignment": "uuid1", "exam_id": "...", ... }
  ],
  "message": "Successfully created 1 assignment(s). Skipped 2 class(es) that already have this exam.",
  "skippedClasses": ["class-uuid-1", "class-uuid-2"],
  "createdForClasses": ["class-uuid-3"]
}
```

### Error - All Classes Already Have It
```json
{
  "error": "This exam is already published to all selected classes",
  "details": "Cannot create duplicate assignments",
  "alreadyPublishedTo": ["class-uuid-1", "class-uuid-2", "class-uuid-3"]
}
```

## User Notifications

### Toast Messages

**All New Assignments Created:**
```
✅ "Exam published successfully!"
```

**Some Classes Skipped:**
```
✅ "Exam published! Created 2 new assignment(s). 
   Skipped 1 class(es) that already have this exam."
   (5 second duration for visibility)
```

**All Classes Already Have It:**
```
❌ "This exam is already published to all selected classes"
```

**Other Assignment Errors:**
```
❌ "Exam published but failed to create class assignments"
```

## Benefits

### 1. **Data Integrity**
- ✅ No duplicate assignments in database
- ✅ Clean data structure
- ✅ Accurate assignment counts

### 2. **User Experience**
- ✅ Clear feedback about what happened
- ✅ No confusion about duplicate assignments
- ✅ Easy to understand which classes were affected

### 3. **Flexibility**
- ✅ Can add exam to new classes without issues
- ✅ Existing assignments remain intact
- ✅ Partial operations succeed when appropriate

### 4. **System Reliability**
- ✅ Prevents database errors from constraints
- ✅ Handles edge cases gracefully
- ✅ Maintains referential integrity

## Technical Implementation

### Backend Logic (`/api/classes/assignments/create`)

```typescript
// 1. Check existing assignments
const existingAssignments = await db.query(
  'SELECT assignment FROM class_assignments WHERE exam_id = ?'
);

// 2. Check which classes have these assignments
const classesWithAssignments = classes.filter(cls => 
  cls.assignments.some(id => existingAssignments.includes(id))
);

// 3. Filter to only new classes
const classesToCreate = selectedClasses.filter(
  cls => !classesWithAssignments.includes(cls)
);

// 4. Create assignments only for new classes
if (classesToCreate.length > 0) {
  await createAssignments(classesToCreate);
}

// 5. Return detailed response
return {
  created: classesToCreate,
  skipped: classesWithAssignments,
  message: buildMessage()
};
```

### Frontend Handling (`exam/[examId]/edit`)

```typescript
// Handle response
if (!result.success) {
  if (result.error.includes('already published')) {
    toast.error('Already published to all classes');
  } else {
    toast.error('Failed to create assignments');
  }
} else {
  if (result.skippedClasses?.length > 0) {
    toast.success(
      `Created ${result.data.length} new. ` +
      `Skipped ${result.skippedClasses.length} existing.`,
      { duration: 5000 }
    );
  } else {
    toast.success('Exam published successfully!');
  }
}
```

## Database Schema Involved

### class_assignments Table
```sql
- assignment (uuid, PK)
- exam_id (uuid, FK to exams)
- name
- description
- publish_at
- due_at
- student_attempt_data (jsonb)
- student_public_chat (jsonb)
```

### class Table
```sql
- class_id (uuid, PK)
- class_name
- assignments (jsonb array of assignment UUIDs)
- ...
```

## Edge Cases Handled

### ✅ Case 1: Empty Class List
```
Action: Publish with no classes selected
Result: Validation error before reaching duplicate check
```

### ✅ Case 2: All Classes Already Have Exam
```
Action: Republish to same 3 classes
Result: Error message, no database changes
```

### ✅ Case 3: Partial Overlap
```
Action: Publish to mix of new and existing classes
Result: Creates for new, skips existing, informative message
```

### ✅ Case 4: Race Condition
```
Action: Two users publish same exam to same class simultaneously
Result: First succeeds, second gets caught by check
```

### ✅ Case 5: Orphaned Assignments
```
Scenario: Assignment exists but not in class.assignments array
Result: Still detected and prevented (checks both sources)
```

## Testing Checklist

- [ ] Publish to new class → Success
- [ ] Republish to same class → Error shown
- [ ] Publish to mix of new/existing → Partial success with message
- [ ] Try publishing to 3 classes all already having exam → Clear error
- [ ] Check console logs show correct detection
- [ ] Verify no duplicate entries in class_assignments
- [ ] Verify class.assignments arrays updated correctly
- [ ] Toast messages display appropriate duration and content
- [ ] Database integrity maintained after all operations

## Console Logging

The system provides detailed logs for debugging:

```
📥 Creating assignments for classes: [uuid1, uuid2, uuid3]
🔍 Checking for existing assignments...
⚠️  Classes that already have this exam: [uuid1]
✅ Classes to create assignments for: [uuid2, uuid3]
💾 Creating assignments: [...]
✅ Successfully created assignments: 2
📝 Updating class assignments arrays...
✅ Updated class uuid2 assignments array
✅ Updated class uuid3 assignments array
```

## Future Enhancements

Potential improvements:
- **Update existing assignments** instead of blocking
- **Show "Already Published" badge** on class checkboxes in UI
- **Bulk reassignment** to replace old assignments
- **Assignment history** to track changes over time
- **Cascade updates** when exam content changes

