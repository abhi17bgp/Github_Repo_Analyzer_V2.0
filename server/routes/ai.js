const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Helper function to validate and sanitize AI response
const validateAnalysisResponse = (analysis, fileName = '') => {
  const defaultResponse = {
    summary: "Analysis not available",
    keyFunctions: [],
    cleanCode: null,
    issues: [],
    improvements: [],
    libraries: []
  };

  if (!analysis || typeof analysis !== 'object') {
    return defaultResponse;
  }

  // Enhanced summary validation with fallback based on file type
  let summary = typeof analysis.summary === 'string' ? analysis.summary.trim() : defaultResponse.summary;
  
  // If summary is too generic, provide a more meaningful fallback
  if (summary === defaultResponse.summary || summary.length < 20) {
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const isReadme = fileName.toLowerCase().includes('readme');
    
    if (isReadme) {
      summary = "This README file contains project documentation, setup instructions, and important information about the repository.";
    } else if (fileExtension === 'json') {
      summary = "This JSON file contains structured data, likely configuration or package information.";
    } else if (fileExtension === 'md') {
      summary = "This Markdown file contains formatted documentation or project information.";
    } else if (fileExtension === 'js' || fileExtension === 'ts') {
      summary = "This JavaScript/TypeScript file contains executable code and logic.";
    } else if (fileExtension === 'py') {
      summary = "This Python file contains executable code and logic.";
    } else {
      summary = `This ${fileExtension.toUpperCase()} file contains structured content and information.`;
    }
  }

  return {
    summary: summary,
    keyFunctions: Array.isArray(analysis.keyFunctions) 
      ? analysis.keyFunctions.filter(func => 
          func && typeof func === 'object' && 
          typeof func.name === 'string' && 
          typeof func.description === 'string'
        ).map(func => ({
          name: func.name.trim(),
          description: func.description.trim()
        }))
      : defaultResponse.keyFunctions,
    cleanCode: typeof analysis.cleanCode === 'boolean' ? analysis.cleanCode : null,
    issues: Array.isArray(analysis.issues) 
      ? analysis.issues.filter(issue => typeof issue === 'string' && issue.trim().length > 0).map(issue => issue.trim())
      : defaultResponse.issues,
    improvements: Array.isArray(analysis.improvements) 
      ? analysis.improvements.filter(improvement => typeof improvement === 'string' && improvement.trim().length > 0).map(improvement => improvement.trim())
      : defaultResponse.improvements,
    libraries: Array.isArray(analysis.libraries) 
      ? analysis.libraries.filter(lib => typeof lib === 'string' && lib.trim().length > 0).map(lib => lib.trim())
      : defaultResponse.libraries
  };
};

// Analyze code with Gemini AI
router.post("/analyze-code", authMiddleware, async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;

    if (!fileContent) {
      return res.status(400).json({ message: "File content is required" });
    }

    if (!process.env.GEMINI_API_KEY || !genAI) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    // Get the generative model with generation config for better JSON output
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent output
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    // Detect file type and create context-aware prompt
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const isReadme = fileName.toLowerCase().includes('readme');
    const isConfig = ['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(fileExtension);
    const isDocumentation = ['md', 'markdown', 'rst', 'txt'].includes(fileExtension);
    const isScript = ['sh', 'bash', 'ps1', 'bat', 'cmd'].includes(fileExtension);
    const isPackage = ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle', 'cargo.toml'].some(pkg => fileName.toLowerCase().includes(pkg));

    let contextPrompt = '';
    
    if (isReadme) {
      contextPrompt = `This is a README file that contains project documentation, setup instructions, and project information. Analyze it as documentation rather than code.`;
    } else if (isConfig) {
      contextPrompt = `This is a configuration file (${fileExtension.toUpperCase()}) that defines settings, dependencies, or build configurations.`;
    } else if (isDocumentation) {
      contextPrompt = `This is a documentation file (${fileExtension.toUpperCase()}) that contains project information, guides, or explanations.`;
    } else if (isScript) {
      contextPrompt = `This is a script file (${fileExtension.toUpperCase()}) that contains executable commands or automation logic.`;
    } else if (isPackage) {
      contextPrompt = `This is a package/dependency management file that defines project dependencies and metadata.`;
    } else {
      contextPrompt = `This is a ${fileExtension.toUpperCase()} code file.`;
    }

    const prompt = `Analyze this file and return ONLY a valid JSON object. Do not include any other text.

Context: ${contextPrompt}

JSON format required:
{
  "summary": "Comprehensive description of what this file contains and its purpose",
  "keyFunctions": [{"name": "functionName", "description": "description"}] or [{"name": "sectionName", "description": "description"}] for non-code files,
  "cleanCode": true/false/null,
  "issues": ["any problems found"],
  "improvements": ["suggestions for improvement"],
  "libraries": ["frameworks, dependencies, or tools mentioned"]
}

File: ${fileName}
Content:
${fileContent}

JSON:`;

    // Try to get a valid JSON response with retry logic
    let rawAnalysis = "";
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        rawAnalysis = response.text();
        
        // Quick check if response looks like JSON
        if (rawAnalysis.trim().startsWith('{') && rawAnalysis.trim().endsWith('}')) {
          break; // Looks like valid JSON, proceed
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed, retrying...`);
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Parse the JSON response from AI
    let structuredAnalysis;
    try {
      // Clean the response in case there are any extra characters
      let cleanedResponse = rawAnalysis.trim();
      
      // Remove common markdown formatting that might interfere
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to find JSON object in the response if it's wrapped in other text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // Additional cleaning for common issues
      cleanedResponse = cleanedResponse.replace(/^[^{]*/, ''); // Remove text before first {
      cleanedResponse = cleanedResponse.replace(/[^}]*$/, ''); // Remove text after last }
      
      console.log("Cleaned AI response:", cleanedResponse);
      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      // Validate and sanitize the response
      structuredAnalysis = validateAnalysisResponse(parsedResponse, fileName);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw AI response:", rawAnalysis);
      
      // Try to extract some information from the raw response as fallback
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      const isReadme = fileName.toLowerCase().includes('readme');
      
      let fallbackSummary = "Analysis completed but response format was invalid";
      let fallbackIssues = ["AI response could not be parsed"];
      let fallbackImprovements = ["Please try analyzing the code again"];
      
      // Provide meaningful fallback based on file type
      if (isReadme) {
        fallbackSummary = "This README file contains project documentation, setup instructions, and important information about the repository. The AI analysis encountered a formatting issue but the file appears to be a standard README.";
        fallbackIssues = ["AI response formatting issue - content appears to be standard README documentation"];
        fallbackImprovements = ["Consider re-analyzing the file for detailed insights"];
      } else if (fileExtension === 'json') {
        fallbackSummary = "This JSON file contains structured data, likely configuration or package information. The AI analysis encountered a formatting issue.";
        fallbackIssues = ["AI response formatting issue - file appears to contain valid JSON data"];
        fallbackImprovements = ["Consider re-analyzing the file for detailed insights"];
      } else if (fileExtension === 'md') {
        fallbackSummary = "This Markdown file contains formatted documentation or project information. The AI analysis encountered a formatting issue.";
        fallbackIssues = ["AI response formatting issue - file appears to contain Markdown documentation"];
        fallbackImprovements = ["Consider re-analyzing the file for detailed insights"];
      }
      
      // Try to extract some meaningful content from the raw response
      if (rawAnalysis.toLowerCase().includes('error') || rawAnalysis.toLowerCase().includes('bug')) {
        fallbackIssues.push("Potential issues detected but could not be parsed");
      }
      
      // Fallback to structured response if JSON parsing fails
      structuredAnalysis = {
        summary: fallbackSummary,
        keyFunctions: [],
        cleanCode: null,
        issues: fallbackIssues,
        improvements: fallbackImprovements,
        libraries: []
      };
    }

    res.json({
      analysis: structuredAnalysis,
      fileName,
      timestamp: new Date().toISOString(),
      model: "gemini-1.5-flash",
      rawResponse: rawAnalysis // Include raw response for debugging
    });
  } catch (error) {
    console.error("Gemini AI analysis error:", error);
    res.status(500).json({
      message: "Failed to analyze code with AI",
      error: error.message,
    });
  }
});

// Get AI model status
router.get("/status", authMiddleware, (req, res) => {
  res.json({
    aiEnabled: !!genAI,
    model: "gemini-1.5-flash",
    provider: "Google Gemini",
  });
});

// Get analysis format schema for frontend developers
router.get("/format", authMiddleware, (req, res) => {
  res.json({
    description: "Expected format for AI code analysis response",
    format: {
      summary: "string - Short description of what the code does",
      keyFunctions: [
        {
          name: "string - Function or class name",
          description: "string - What the function/class does"
        }
      ],
      cleanCode: "boolean - Whether the code is clean and maintainable (null if undetermined)",
      issues: ["string - Array of detected bugs, code smells, or bad practices"],
      improvements: ["string - Array of suggestions to improve the code"],
      libraries: ["string - Array of libraries,Language or  frameworks used(if used)"]
    },
    example: {
      summary: "A React component that manages user authentication state",
      keyFunctions: [
        {
          name: "useAuth",
          description: "Custom hook that provides authentication state and methods"
        },
        {
          name: "AuthProvider",
          description: "Context provider component that wraps the app with auth state"
        }
      ],
      cleanCode: true,
      issues: [
        "Missing error handling in login function",
        "Hardcoded API endpoint should be configurable"
      ],
      improvements: [
        "Add try-catch blocks for async operations",
        "Extract API configuration to environment variables",
        "Add input validation for user credentials"
      ],
      libraries: ["react", "axios", "react-router-dom"]
    }
  });
});

// Test endpoint to debug AI responses
router.post("/test-parse", authMiddleware, async (req, res) => {
  try {
    const { testResponse } = req.body;
    
    if (!testResponse) {
      return res.status(400).json({ message: "testResponse is required" });
    }

    // Test the same parsing logic
    let cleanedResponse = testResponse.trim();
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    cleanedResponse = cleanedResponse.replace(/^[^{]*/, '');
    cleanedResponse = cleanedResponse.replace(/[^}]*$/, '');
    
    const parsed = JSON.parse(cleanedResponse);
    const validated = validateAnalysisResponse(parsed, req.body.fileName || '');
    
    res.json({
      success: true,
      original: testResponse,
      cleaned: cleanedResponse,
      parsed: parsed,
      validated: validated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      original: req.body.testResponse
    });
  }
});

// AI Chat endpoint for project assistant
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, context, conversationHistory, hasPreviousSessions } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY || !genAI) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    // Build context prompt
    const username = context.username || 'there';
    let contextPrompt = `You are a friendly, helpful AI companion named "CodeBuddy" who is assisting ${username} in understanding a GitHub repository. You should be warm, polite, and enthusiastic about helping them explore the project. Always address them by name when appropriate and maintain a supportive, encouraging tone.

You have access to the following project information:

Repository URL: ${context.repositoryUrl || 'Not available'}

`;

    if (context.readme) {
      contextPrompt += `README.md content:
${context.readme}

`;
    }

    if (context.packageJson) {
      contextPrompt += `Package.json content:
${JSON.stringify(context.packageJson, null, 2)}

`;
    }

    if (context.repoInfo) {
      contextPrompt += `Repository Information:
- Language: ${context.repoInfo.language || 'Not specified'}
- Description: ${context.repoInfo.description || 'No description'}
- Stars: ${context.repoInfo.stars || 0}
- Size: ${context.repoInfo.size || 0} KB
- Homepage: ${context.repoInfo.homepage || 'No homepage specified'}

`;
    }

    // Add website homepage context if available
    if (context.repoInfo && context.repoInfo.homepage) {
      contextPrompt += `WEBSITE HOMEPAGE CONTEXT:
This repository has a live website at: ${context.repoInfo.homepage}

When users ask about this project and there's no README file, you can:
1. Mention that this is a live website/project
2. Suggest they visit the homepage to see the project in action
3. Explain that the repository contains the source code for this website
4. Help them understand the project's purpose based on the website URL
5. Guide them on how to explore the codebase to understand the website's functionality

`;
    }

    if (context.fileTree) {
      contextPrompt += `File Tree Structure (first 50 files):
${JSON.stringify(context.fileTree, null, 2).substring(0, 2000)}...

`;
    }

    // Add conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      contextPrompt += `Previous conversation:
`;
      conversationHistory.slice(-5).forEach(msg => {
        contextPrompt += `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      contextPrompt += `\n`;
    }

    contextPrompt += `IMPORTANT INSTRUCTIONS:
1. Answer ONLY project-related conceptual questions about this repository
2. Do NOT generate, modify, or write code
3. Be warm, friendly, and enthusiastic - act like a helpful companion who genuinely cares about ${username}'s learning journey
4. Always address ${username} by name when appropriate (e.g., "Great question, ${username}!" or "I'd be happy to help you understand that, ${username}!")
5. Use emojis, bullet points, and formatting to make responses more readable and engaging
6. Don't just copy from README - provide your own insights and analysis with enthusiasm
7. If asked about future enhancements, be creative and suggest improvements based on the project's current state
8. Use markdown formatting for better structure (headers, lists, emphasis)
9. Be encouraging and supportive - make ${username} feel confident about exploring the project
10. If asked about code generation or modification, politely decline and redirect to conceptual questions
11. Keep responses informative but engaging and conversational
12. If you don't have enough information, say so politely and suggest what might help
13. Keep answers concise but warm and personal
14. If the repository has a homepage URL, mention it and suggest visiting the live website
15. For repositories without README files, use the homepage URL and file structure to explain the project's purpose
16. Help ${username} understand what the website does based on the repository structure and homepage
17. Always end responses with encouragement or a helpful follow-up question to keep the conversation flowing
18. Use phrases like "I'm excited to help you with this!" or "Let's explore this together!" to maintain a companion-like tone
${hasPreviousSessions ? `19. IMPORTANT: ${username} has analyzed this repository before and had previous conversations. You have access to the full conversation history for context, but only show responses for the current session. If ${username} asks about previous conversations or what they asked before, acknowledge that you remember and can reference previous discussions, but keep the current session clean and focused.` : ''}

${username}'s question: ${message}

Response (use markdown formatting for better readability and maintain a warm, companion-like tone):`;

    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Chat error:", error);
    res.status(500).json({
      message: "Failed to process chat message",
      error: error.message,
    });
  }
});

module.exports = router;
