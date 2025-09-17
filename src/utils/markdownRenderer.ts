// Simple markdown renderer for README preview
export const renderMarkdown = (content: string): string => {
  if (!content) return '';

  return content
    // Headers
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-white border-b border-gray-600 pb-2">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 text-white mt-6">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2 text-white mt-4">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-medium mb-2 text-white mt-3">$1</h4>')
    .replace(/^##### (.*$)/gim, '<h5 class="text-base font-medium mb-2 text-white mt-2">$1</h5>')
    .replace(/^###### (.*$)/gim, '<h6 class="text-sm font-medium mb-2 text-white mt-2">$1</h6>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic text-gray-300">$1</em>')
    .replace(/__(.*?)__/gim, '<strong class="font-bold text-white">$1</strong>')
    .replace(/_(.*?)_/gim, '<em class="italic text-gray-300">$1</em>')
    
    // Code blocks
    .replace(/```([^`]+)```/gim, '<pre class="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code class="text-green-400 font-mono text-sm">$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code class="bg-gray-700 px-2 py-1 rounded text-green-400 font-mono text-sm">$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 border border-gray-600" />')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
    .replace(/^\+ (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 my-4 text-gray-300 italic">$1</blockquote>')
    
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="border-gray-600 my-6" />')
    .replace(/^\*\*\*$/gim, '<hr class="border-gray-600 my-6" />')
    
    // Line breaks
    .replace(/\n\n/gim, '</p><p class="text-gray-300 mb-4">')
    .replace(/\n/gim, '<br>')
    
    // Wrap in paragraph tags
    .replace(/^(.*)$/gim, '<p class="text-gray-300 mb-4">$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p class="text-gray-300 mb-4"><\/p>/gim, '')
    .replace(/<p class="text-gray-300 mb-4"><br><\/p>/gim, '')
    
    // Clean up list items that are already wrapped
    .replace(/<p class="text-gray-300 mb-4"><li/gim, '<li')
    .replace(/<\/li><\/p>/gim, '</li>')
    
    // Clean up headers that are already wrapped
    .replace(/<p class="text-gray-300 mb-4">(<h[1-6][^>]*>.*<\/h[1-6]>)<\/p>/gim, '$1')
    
    // Clean up code blocks that are already wrapped
    .replace(/<p class="text-gray-300 mb-4">(<pre[^>]*>.*<\/pre>)<\/p>/gim, '$1')
    
    // Clean up blockquotes that are already wrapped
    .replace(/<p class="text-gray-300 mb-4">(<blockquote[^>]*>.*<\/blockquote>)<\/p>/gim, '$1')
    
    // Clean up horizontal rules that are already wrapped
    .replace(/<p class="text-gray-300 mb-4">(<hr[^>]*\/>)<\/p>/gim, '$1');
};

// Extract title from markdown content
export const extractTitle = (content: string): string => {
  const match = content.match(/^# (.*$)/m);
  return match ? match[1] : 'README';
};

// Extract description from markdown content
export const extractDescription = (content: string): string => {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('`')) {
      return line;
    }
  }
  return 'No description available';
};
