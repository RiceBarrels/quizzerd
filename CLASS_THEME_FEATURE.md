# Class Theme Feature

## Overview
Teachers and admins can now set custom themes for their classes. The selected theme will be applied to all members when they view that specific class page.

## Features

### Available Themes
1. **Default** - System default theme
2. **Neo Brutalism** - Bold and striking design with high contrast
3. **Solar Dusk** - Warm sunset colors with a modern feel

### User Permissions
- **Admins**: Can set and change class themes
- **Teachers**: Can set and change class themes
- **Students**: View the class with the selected theme (read-only)

## How It Works

### For Teachers/Admins

1. **Navigate to a class page** where you are a teacher or admin
2. **Click the "Theme" button** in the top-right corner
3. **Select a theme** from the dropdown menu
4. **Preview the theme** - The selected theme is applied immediately for preview
5. **Click "Save Theme"** to apply it permanently to the class
6. **Click "Cancel"** to revert to the current class theme

### Theme Application

- Themes are applied **dynamically** when viewing a class
- The theme **only affects the current class page**
- When you leave the class page, the theme is removed
- Each class can have its **own unique theme**

## Technical Details

### Theme Files
- Located in `/public/themes/`
- CSS files using CSS custom properties
- Format: `[theme-name].css`

### Available Themes:
```
/public/themes/
  ├── neo-brutalism.css
  └── solar-dusk.css
```

### API Endpoints

#### Update Class Theme
```
PATCH /api/classes/update
Body: {
  "class_id": "uuid",
  "theme": "neo-brutalism" | "solar-dusk" | "default"
}
```

**Permissions Required:**
- User must be an admin or teacher of the class

### Database Schema

The `class` table stores themes in the `class_settings` JSONB field:
```sql
class_settings JSONB DEFAULT '{"themeFont": "default", "themeColor": "#bc6a4a"}'::jsonb
```

**Theme is stored as:**
```json
{
  "themeFont": "default",
  "themeColor": "#bc6a4a",
  "theme": "neo-brutalism" // Added when theme is set
}
```

**Accepted theme values:**
- `'default'` (no custom theme)
- `'neo-brutalism'`
- `'solar-dusk'`

## Adding New Themes

To add a new theme:

1. **Create a CSS file** in `/public/themes/` with your theme name (e.g., `ocean-blue.css`)

2. **Define CSS variables** following this structure:
```css
:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
  /* ... other variables */
}
```

3. **Register the theme** in the class page component:
```typescript
const AVAILABLE_THEMES = [
  // ... existing themes
  { 
    value: 'ocean-blue', 
    label: 'Ocean Blue', 
    description: 'Cool ocean-inspired colors' 
  },
]
```

4. **Update the database** to allow the new theme value (if using enum constraints)

## User Experience

### Theme Selection Flow
1. Teacher opens theme dialog
2. Selects a theme from dropdown
3. Theme is applied immediately for preview
4. Teacher can:
   - Save to apply permanently
   - Cancel to revert
   - Try different themes before saving

### Theme Persistence
- Themes are **stored in the database**
- Applied **automatically** when anyone views the class
- Remains until changed by an admin/teacher

### Cleanup
- Themes are **automatically removed** when:
  - User navigates away from the class page
  - Component unmounts
  - Different theme is selected

## Benefits

1. **Personalization**: Teachers can customize their class appearance
2. **Branding**: Match class themes to subject matter or school colors
3. **Engagement**: Make classes more visually appealing
4. **Flexibility**: Easy to change themes at any time
5. **Non-intrusive**: Only affects individual class pages

## Troubleshooting

### Theme not saving
- **Check permissions**: Ensure you are an admin or teacher of the class
- **Check console**: Look for error messages in browser console
- **Verify class_id**: Ensure the class ID is valid and exists
- **Check API response**: Network tab should show 200 OK response

### Theme not applying
- **Check theme files**: Ensure CSS files exist in `/public/themes/`
- **Clear cache**: Hard refresh the page (Cmd/Ctrl + Shift + R)
- **Check browser console**: Look for 404 errors loading theme CSS
- **Verify path**: Theme files must be at `/public/themes/[theme-name].css`

### Common Errors

**"Failed to update class"**
- User doesn't have admin/teacher permissions
- Class ID is invalid or missing
- Network connection issue

**"Theme not loading"**
- CSS file missing from `/public/themes/`
- Incorrect theme name in database
- File path mismatch

## Future Enhancements

Potential improvements:
- [ ] Custom theme creator
- [ ] More pre-built themes
- [ ] Theme scheduling (e.g., seasonal themes)
- [ ] Student theme preferences override
- [ ] Dark mode variants for each theme
- [ ] Theme preview gallery
- [ ] Import/export custom themes
- [ ] Theme preview screenshots

