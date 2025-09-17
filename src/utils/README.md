# JSON Content Optimization

This directory contains utilities for optimizing JSON content rendering and preventing unnecessary re-renders in React components.

## Files

### `jsonFormatter.ts`
Contains utility functions for formatting and handling JSON content:

- `formatFileContent(content, fileName)` - Formats JSON content with proper indentation
- `isJsonFile(fileName)` - Checks if a file is a JSON file
- `safeJsonParse(content)` - Safely parses JSON with error handling
- `isValidJson(content)` - Validates if content is valid JSON

### `useJsonContent.ts` (in `../hooks/`)
Custom React hook for optimizing JSON content rendering:

- `useJsonContent({ content, fileName })` - Returns formatted content with memoization

## Usage

```tsx
import { useJsonContent } from '../hooks/useJsonContent';

const MyComponent = ({ file }) => {
  const formattedContent = useJsonContent({
    content: file.content,
    fileName: file.name,
  });

  return (
    <pre className="...">
      {formattedContent}
    </pre>
  );
};
```

## Benefits

1. **Prevents Re-renders**: Uses `useMemo` to cache formatted content
2. **JSON Detection**: Automatically detects and formats JSON files
3. **Error Handling**: Gracefully handles invalid JSON
4. **Performance**: Optimizes rendering for large JSON files
5. **Type Safety**: Full TypeScript support 