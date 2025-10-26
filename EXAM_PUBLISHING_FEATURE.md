# Exam Publishing Feature

## Overview
This feature allows instructors to publish exams to specific destinations: public, specific classes, or private with an exam code. Published exams assigned to classes automatically appear in the class assignments section.

## Changes Made

### 1. Exam Edit Page (`src/app/(withOutSidebarNav)/exam/[examId]/edit/page.tsx`)
- **Added Publish Dialog**: When clicking "Publish", users now see a dialog with three publishing options:
  - **Public**: Makes the exam visible to everyone in the public exams section
  - **Specific Classes**: Assigns the exam to selected classes (creates assignments)
  - **Private with Exam Code**: Only accessible via direct link/code
  
- **New State Variables**:
  - `publishDialogOpen`: Controls the publish dialog visibility
  - `publishType`: Tracks selected publishing option ('public', 'classes', or 'code')
  - `selectedClassIds`: Array of class IDs for class-based publishing
  - `classes`: List of available classes fetched from API
  - `loadingClasses`: Loading state for classes

- **New Functions**:
  - `fetchClasses()`: Fetches all classes the user has access to
  - `handlePublishClick()`: Opens the publish dialog
  - `handlePublishConfirm()`: Handles the actual publishing logic based on selected option

### 2. API Routes Created

#### `/api/classes/assignments/create/route.tsx`
- **Purpose**: Creates class assignments when exams are published to specific classes
- **Method**: POST
- **Request Body**:
  ```typescript
  {
    exam_id: string,
    class_ids: string[],
    name: string,
    description: string,
    publish_at: string (ISO date),
    due_at: string | null (ISO date)
  }
  ```
- **Permissions**: User must be admin or teacher of all selected classes
- **Database Table**: Inserts into `class_assignments` table

#### `/api/classes/assignments/get/route.tsx`
- **Purpose**: Fetches all assignments for a specific class with exam details
- **Method**: GET
- **Query Parameters**: `classId` (required)
- **Response**: Array of assignments with embedded exam information
- **Permissions**: User must be a member (admin, teacher, or student) of the class

### 3. Class Page Updates (`src/app/(sidebarNav)/class/[classcode]/page.tsx`)
- **New State Variables**:
  - `assignments`: Array of class assignments
  - `loadingAssignments`: Loading state for assignments

- **New Function**:
  - `fetchAssignments()`: Fetches assignments for the current class

- **Updated Assignments Tab**: Now displays:
  - Assignment name and exam name
  - Assignment description
  - Exam details (duration, total points)
  - Due date and publish date
  - "Take Exam" button for all members
  - "Edit" button for admins and teachers

## How to Use

### For Instructors:

1. **Create an Exam**:
   - Go to the Exams page
   - Click "Create Exam" or "Import from Google Forms"
   - Add questions and configure settings

2. **Publish the Exam**:
   - Click the "Publish" button in the exam editor
   - Choose one of three publishing options:
     - **Public**: Anyone can access
     - **Specific Classes**: Select classes to assign to
     - **Private with Exam Code**: Only accessible via direct link
   - If publishing to classes, select the classes from the list
   - Click "Publish Exam"

3. **View in Class**:
   - Navigate to the class page
   - Click on the "Assignments" tab
   - See all published exams assigned to that class

### For Students:

1. **Access Assignments**:
   - Navigate to your class page
   - Click on the "Assignments" tab
   - View all assigned exams with due dates

2. **Take an Exam**:
   - Click "Take Exam" button on any assignment
   - Complete the exam before the due date

## Database Schema

### class_assignments Table
```sql
- assignment (uuid, primary key)
- name (text, not null)
- description (text, nullable)
- exam_id (uuid, foreign key to exams)
- student_attempt_data (jsonb)
- student_public_chat (jsonb)
- due_at (timestamp, nullable)
- publish_at (timestamp, not null)
- created_at (timestamp, not null)
```

### Updated exams Table
- `class_id`: JSONB array storing class IDs the exam is assigned to
- `is_public`: Boolean indicating if exam is publicly accessible

## Features

✅ Publish dialog with three distinct publishing options
✅ Class selection interface with checkboxes
✅ Automatic assignment creation when publishing to classes
✅ Assignment display in class page with exam details
✅ Different buttons for students (Take Exam) and instructors (Edit)
✅ Loading states and error handling
✅ Permission checks at API level
✅ Responsive UI with proper styling

## Future Enhancements

- Add assignment analytics (completion rates, average scores)
- Allow instructors to set specific publish/due dates in the publish dialog
- Add assignment notifications for students
- Implement assignment grading interface
- Add ability to update/delete assignments
- Show student progress on assignments
- Add assignment reminders before due dates

