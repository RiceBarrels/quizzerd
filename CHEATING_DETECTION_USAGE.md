# Cheating Detection System - Usage Guide

## Overview

The `CheatingDetection` component provides comprehensive monitoring and detection of suspicious activities during exams. It includes multiple detection mechanisms that can be individually enabled or disabled.

## Features

### 1. **Developer Console Detection**
- Detects when students open browser developer tools
- Uses debugger timing to identify console usage
- Provides warnings and logs violations

### 2. **Tab Switch Detection (Visibility Change)**
- Monitors when students switch tabs or minimize the window
- Counts violations and can trigger automatic submission after threshold
- Uses Page Visibility API

### 3. **Translation Detection**
- Detects Google Translate and other translation tools
- Monitors DOM for translation elements
- Checks for language attribute changes
- Observes mutations in real-time

### 4. **Word-by-Word Translation/Definition Control**
- Allows or disables text selection
- Controls right-click context menu access
- Prevents dictionary/translation lookups on selected text

### 5. **Location Tracking**
- Uses Geolocation API to monitor student location
- Alerts if student moves more than 100 meters during exam
- Requires user permission for geolocation

## Usage

### Basic Usage

```tsx
import CheatingDetection from "@/components/ui/cheating-detection";

export default function ExamPage() {
  return (
    <div>
      {/* Your exam content */}
      
      <CheatingDetection
        isTesting={false}
        consoleDetection={true}
        visibilityChangeDetection={true}
        translationDetection={true}
        allowWordByWordTranslation={false}
        allowWordByWordDefinition={false}
        locationDetection={false}
        examLanguage="en-US"
      />
    </div>
  );
}
```

### With Violation Callback

```tsx
import CheatingDetection from "@/components/ui/cheating-detection";

export default function ExamPage() {
  const handleViolation = (violation) => {
    console.log('Violation detected:', violation);
    
    // Save to database
    fetch('/api/exams/log-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: '123',
        userId: 'user-456',
        violationType: violation.type,
        timestamp: violation.timestamp
      })
    });
  };

  return (
    <div>
      <CheatingDetection
        isTesting={false}
        consoleDetection={true}
        visibilityChangeDetection={true}
        translationDetection={true}
        allowWordByWordTranslation={false}
        allowWordByWordDefinition={false}
        locationDetection={true}
        examLanguage="en-US"
        onViolation={handleViolation}
      />
    </div>
  );
}
```

### Testing Mode

```tsx
<CheatingDetection
  isTesting={true}  // Shows different warnings and logs violations
  consoleDetection={true}
  visibilityChangeDetection={true}
  translationDetection={false}
  allowWordByWordTranslation={true}
  allowWordByWordDefinition={true}
  locationDetection={false}
  examLanguage="en-US"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isTesting` | boolean | `false` | Enable testing mode with gentler warnings |
| `consoleDetection` | boolean | `false` | Detect developer console usage |
| `translationDetection` | boolean | `false` | Detect translation tools |
| `allowWordByWordTranslation` | boolean | `false` | Allow text selection for translation |
| `allowWordByWordDefinition` | boolean | `false` | Allow text selection for definitions |
| `visibilityChangeDetection` | boolean | `false` | Detect tab switching |
| `locationDetection` | boolean | `false` | Monitor student location |
| `examLanguage` | string | `"en-US"` | Expected exam language |
| `onViolation` | function | `undefined` | Callback when violation occurs |

## Violation Types

```typescript
type ViolationType = 
  | 'console'        // Developer tools opened
  | 'visibility'     // Tab switched/window minimized
  | 'translation'    // Translation tool detected
  | 'location'       // Location changed significantly
  | 'context_menu';  // Unauthorized right-click on selected text
```

## Integration with Exam Settings

The `ExamSettingsTab` component now includes all cheating detection settings:

```tsx
<ExamSettingsTab
  durationMinutes={60}
  attemptsAllowed={1}
  passingScore={70}
  shuffleItems={true}
  showResultsImmediately={false}
  isPublic={false}
  // Cheating detection
  consoleDetection={true}
  translationDetection={true}
  allowWordByWordTranslation={false}
  allowWordByWordDefinition={false}
  visibilityChangeDetection={true}
  locationDetection={false}
  onDurationChange={setDuration}
  onAttemptsChange={setAttempts}
  onPassingScoreChange={setPassingScore}
  onShuffleChange={setShuffle}
  onShowResultsChange={setShowResults}
  onPublicChange={setPublic}
  // Cheating detection handlers
  onConsoleDetectionChange={setConsoleDetection}
  onTranslationDetectionChange={setTranslationDetection}
  onAllowWordByWordTranslationChange={setAllowWordTranslation}
  onAllowWordByWordDefinitionChange={setAllowWordDefinition}
  onVisibilityChangeDetectionChange={setVisibilityDetection}
  onLocationDetectionChange={setLocationDetection}
/>
```

## Best Practices

1. **Testing Mode**: Always test with `isTesting={true}` first to understand the behavior
2. **Geolocation Permission**: Location detection requires explicit user permission
3. **Multiple Violations**: Consider implementing auto-submission after N violations
4. **Database Logging**: Store violations in database for review by instructors
5. **Student Awareness**: Inform students about monitoring before exam starts
6. **Privacy**: Be transparent about what data is collected and how it's used

## Privacy Considerations

- Location tracking requires explicit user consent
- Violation logs should be stored securely
- Students should be informed about monitoring measures
- Consider GDPR/FERPA compliance in your region

## Technical Notes

- Console detection uses `debugger` statement timing
- Translation detection checks for DOM mutations
- Location tracking uses Haversine formula for distance calculation
- Visibility detection uses Page Visibility API
- All detections run in useEffect hooks with proper cleanup

