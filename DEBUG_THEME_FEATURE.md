# Debug Guide: Theme Feature

## Current Status

I've added comprehensive logging to help identify the issue. The error "Theme update failed: {}" suggests the response body is empty or not being parsed correctly.

## How to Debug

### Step 1: Check Browser Console

When you click "Save Theme", you should now see detailed logs:

```
Saving theme: { class_id: "...", theme: "neo-brutalism" }
Response status: XXX StatusText
Response data: {...}
```

**Look for:**
- ❌ If response status is **401**: Authentication issue
- ❌ If response status is **403**: Permission issue  
- ❌ If response status is **404**: Class not found
- ❌ If response status is **500**: Server error
- ✅ If response status is **200**: Success!

### Step 2: Check Server Console

In your terminal where Next.js is running, you should see:

```
Update class request: { class_id: "...", theme: "...", userId: "..." }
Class data fetched: { ... }
Permission check: { userId: "...", isAdmin: true/false, isTeacher: true/false }
Theme update prepared: { ... }
Final updates object: { ... }
Class updated successfully: { ... }
```

**Common Issues:**

#### Issue 1: "Unauthorized: No userId"
```
Update class - Unauthorized: No userId
```
**Solution:** User is not logged in properly with Clerk. Check authentication.

#### Issue 2: "No class_id provided"
```
Update class - No class_id provided
```
**Solution:** `classData.class_id` is undefined. Check if class data loaded correctly.

#### Issue 3: "Class not found"
```
Update class - Fetch error: { code: "...", message: "..." }
```
**Solution:** 
- Check if the class_id exists in the database
- Verify Supabase connection
- Check if `class` table exists

#### Issue 4: "Permission denied"
```
Update class - Permission denied: { userId: "...", isAdmin: false, isTeacher: false }
```
**Solution:**
- User is not an admin or teacher of this class
- Check `admin_ids` and `teacher_ids` in the database
- Verify the userId matches what's stored in the database

#### Issue 5: "Supabase update error"
```
Supabase update error: { ... }
```
**Solution:**
- Check Supabase permissions (RLS policies)
- Verify the update query syntax
- Check if all columns exist in the table

## Testing Checklist

Run through these tests:

### ✅ Test 1: Check Authentication
1. Open browser DevTools → Application → Cookies
2. Look for Clerk session cookies
3. If missing, try logging out and back in

### ✅ Test 2: Check Class Data
1. Open browser DevTools → Console
2. Navigate to class page
3. Type: `console.log(window)` (class data should be loaded)
4. Check if `class_id` is present

### ✅ Test 3: Check Permissions
1. Verify you're a teacher or admin of the class
2. Check the database directly:
```sql
SELECT admin_ids, teacher_ids FROM class WHERE class_id = 'your-class-id';
```
3. Ensure your Clerk userId is in one of those arrays

### ✅ Test 4: Check Supabase Connection
1. Open browser DevTools → Network tab
2. Click "Save Theme"
3. Look for the `/api/classes/update` request
4. Check the request payload and response

### ✅ Test 5: Check Database Schema
```sql
-- Verify class_settings column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class' 
AND column_name = 'class_settings';
```

## Quick Fixes

### Fix 1: Clear Cache
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Fix 2: Check Environment Variables
```bash
# Verify Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Fix 3: Test API Directly
```bash
# Use curl to test the endpoint
curl -X PATCH http://localhost:3000/api/classes/update \
  -H "Content-Type: application/json" \
  -d '{"class_id": "your-class-id", "theme": "neo-brutalism"}'
```

## Expected Logs (Success Case)

### Browser Console:
```
Saving theme: { class_id: "abc-123", theme: "neo-brutalism" }
Response status: 200 OK
Response data: { success: true, data: {...}, message: "Class updated successfully" }
```

### Server Console:
```
Update class request: { class_id: "abc-123", theme: "neo-brutalism", userId: "user_xyz" }
Class data fetched: { class_id: "abc-123", hasAdmin: true, hasTeacher: true, hasSettings: true }
Permission check: { userId: "user_xyz", isAdmin: true, isTeacher: false }
Theme update prepared: { currentSettings: {...}, newSettings: {...} }
Final updates object: { updated_at: "...", class_settings: {...} }
Class updated successfully: { class_id: "abc-123", theme: "neo-brutalism" }
```

## Next Steps

1. **Try saving a theme again** - Check both browser and server consoles
2. **Copy all the logs** - Share them if you need help
3. **Look for the first error** - The first error message usually tells you what's wrong
4. **Check the specific error code** - Use the issue numbers above to find solutions

## Common Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| "Unauthorized" | Not logged in | Check Clerk authentication |
| "Class ID is required" | Missing class_id | Verify class data loaded |
| "Class not found" | Invalid class_id | Check database |
| "Permission denied" | Not admin/teacher | Verify user role |
| "Failed to update class" | Database error | Check Supabase/RLS |
| "Internal server error" | Unexpected error | Check server logs |

## Need More Help?

Share these details:
1. ✅ All browser console logs
2. ✅ All server console logs  
3. ✅ Your role in the class (admin/teacher/student)
4. ✅ Database schema for the `class` table
5. ✅ Any RLS policies on the `class` table

