import { useMemo } from 'react';
import { formatFileContent } from '../utils/jsonFormatter';

interface UseJsonContentProps {
  content: string | object;
  fileName: string;
}

/**
 * Custom hook to optimize JSON content rendering and prevent unnecessary re-renders
 * @param content - The file content (string or object)
 * @param fileName - The name of the file
 * @returns Formatted content string
 */
export const useJsonContent = ({ content, fileName }: UseJsonContentProps): string => {
  return useMemo(() => {
    return formatFileContent(content, fileName);
  }, [content, fileName]);
}; 