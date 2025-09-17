/**
 * Utility function to format JSON content and prevent unnecessary re-renders
 * @param content - The file content (string or object)
 * @param fileName - The name of the file
 * @returns Formatted content string
 */
export const formatFileContent = (content: string | object, fileName: string): string => {
  const isJsonFile = fileName.toLowerCase().endsWith('.json');
  
  if (isJsonFile) {
    try {
      // Handle both string and object content
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      
      // Try to parse and pretty-print JSON
      const parsed = JSON.parse(contentString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      // If parsing fails, return original content
      console.warn(`Failed to parse JSON file ${fileName}:`, error);
      return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    }
  }
  
  // For non-JSON files, return content as-is
  return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
};

/**
 * Check if a file is a JSON file
 * @param fileName - The name of the file
 * @returns boolean indicating if it's a JSON file
 */
export const isJsonFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.json');
};

/**
 * Safely parse JSON content with error handling
 * @param content - The content to parse
 * @returns Parsed object or null if parsing fails
 */
export const safeJsonParse = (content: string): object | null => {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
};

/**
 * Check if content is valid JSON
 * @param content - The content to check
 * @returns boolean indicating if content is valid JSON
 */
export const isValidJson = (content: string): boolean => {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}; 