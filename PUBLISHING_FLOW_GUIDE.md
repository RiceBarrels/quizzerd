# Exam Publishing Flow - Quick Guide

## Publishing Process

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Create/Edit Exam                                   │
│  Location: /exam/[examId]/edit                              │
│                                                              │
│  - Add exam details                                         │
│  - Add questions                                            │
│  - Configure settings                                       │
│  - Click "Publish" button                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Choose Publishing Destination                      │
│  Dialog: Publish Exam                                       │
│                                                              │
│  ○ Public                                                    │
│     └─> Visible to everyone in public exams section        │
│                                                              │
│  ○ Specific Classes (Select from list)                      │
│     └─> Creates assignments in selected classes            │
│                                                              │
│  ○ Private with Exam Code                                   │
│     └─> Only accessible via direct link                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Automatic Actions                                  │
│                                                              │
│  IF Public:                                                 │
│    ✓ Sets exam.is_public = true                            │
│    ✓ Clears exam.class_id array                            │
│    ✓ Sets status = 'published'                             │
│                                                              │
│  IF Specific Classes:                                       │
│    ✓ Sets exam.is_public = false                           │
│    ✓ Updates exam.class_id with selected classes           │
│    ✓ Creates class_assignments entries                     │
│    ✓ Sets status = 'published'                             │
│                                                              │
│  IF Private with Code:                                      │
│    ✓ Sets exam.is_public = false                           │
│    ✓ Clears exam.class_id array                            │
│    ✓ Sets status = 'published'                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: View in Class (for Class Publishing)               │
│  Location: /class/[classcode]                               │
│  Tab: Assignments                                           │
│                                                              │
│  Displays:                                                  │
│    • Assignment name                                        │
│    • Exam name and description                              │
│    • Duration and total points                              │
│    • Due date and publish date                              │
│    • "Take Exam" button (all members)                       │
│    • "Edit" button (admins/teachers only)                   │
└─────────────────────────────────────────────────────────────┘
```

## User Roles and Permissions

### Instructors (Admin/Teacher)
- ✅ Create and edit exams
- ✅ Publish exams to public, classes, or with code
- ✅ Select which classes to assign exams to
- ✅ View and edit assignments in class page
- ✅ Access "Edit" button on assignments

### Students
- ✅ View assignments in their classes
- ✅ Take exams via "Take Exam" button
- ✅ See due dates and exam details
- ❌ Cannot edit exams or create assignments

## API Endpoints

### POST /api/classes/assignments/create
Creates class assignments when publishing to specific classes.

**Request:**
```json
{
  "exam_id": "uuid",
  "class_ids": ["uuid1", "uuid2"],
  "name": "Assignment Name",
  "description": "Optional description",
  "publish_at": "2024-01-01T00:00:00Z",
  "due_at": "2024-01-15T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": [/* array of created assignments */],
  "message": "Successfully created 2 assignment(s)"
}
```

### GET /api/classes/assignments/get?classId={uuid}
Fetches all assignments for a specific class.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "assignment": "uuid",
      "name": "Assignment Name",
      "description": "Description",
      "exam_id": "uuid",
      "due_at": "2024-01-15T00:00:00Z",
      "publish_at": "2024-01-01T00:00:00Z",
      "exam": {
        "exam_id": "uuid",
        "exam_name": "Exam Name",
        "exam_description": "Description",
        "duration_minutes": 60,
        "total_points": 100,
        "status": "published"
      }
    }
  ]
}
```

## UI Components

### Publish Dialog (Exam Edit Page)
- Radio button selection for publishing type
- Conditional class selection list (when "Specific Classes" selected)
- Checkbox for each available class
- Publish button (disabled if classes selected but none checked)
- Cancel button

### Assignments Tab (Class Page)
- Loading state with spinner
- Empty state message
- Assignment cards with:
  - Assignment and exam names
  - Description
  - Metadata (duration, points, dates)
  - Action buttons (Take Exam, Edit)
- Hover effects for better UX
- Click to navigate to exam

## Testing Checklist

- [ ] Create a new exam
- [ ] Publish to public - verify it appears in public exams
- [ ] Publish to specific classes - verify assignments created
- [ ] Navigate to class page - verify assignment appears in Assignments tab
- [ ] As student, click "Take Exam" - verify navigation works
- [ ] As instructor, click "Edit" - verify navigation to edit page
- [ ] Verify permissions - students cannot edit, only admins/teachers can
- [ ] Test with multiple classes selected
- [ ] Test with no classes available
- [ ] Verify due dates and publish dates display correctly

