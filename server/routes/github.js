const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const Repository = require('../models/Repository');
const Statistics = require('../models/Statistics');

const router = express.Router();

// Retry utility with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry on certain errors
      if (error.response?.status === 404 || error.response?.status === 403) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Helper function to parse GitHub URL
const parseGitHubUrl = (url) => {
  try {
    // Remove any trailing slashes and .git extension
    const cleanUrl = url.trim().replace(/\/$/, '').replace(/\.git$/, '');
    
    // Match GitHub URL pattern
    const regex = /github\.com\/([^\/\s]+)\/([^\/\s]+)/;
    const match = cleanUrl.match(regex);
    
    if (!match) {
      return null;
    }
    
    const owner = match[1];
    const repo = match[2];
    
    // Basic validation - owner and repo should not be empty and should contain valid characters
    if (!owner || !repo || owner.length === 0 || repo.length === 0) {
      return null;
    }
    
    // Check for invalid characters (GitHub usernames and repo names have specific rules)
    const validOwnerPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/;
    const validRepoPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-\._]*[a-zA-Z0-9])?$/;
    
    if (!validOwnerPattern.test(owner) || !validRepoPattern.test(repo)) {
      return null;
    }
    
    return { owner, repo };
  } catch (error) {
    return null;
  }
};

// Helper function to build file tree recursively
const buildFileTree = async (owner, repo, path = '', githubToken = null) => {
  try {
    const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    );

    const items = response.data;
    const tree = {
      name: path || repo,
      type: 'folder',
      children: []
    };

    for (const item of items) {
      if (item.type === 'dir') {
        // Recursively get folder contents
        const subTree = await buildFileTree(owner, repo, item.path, githubToken);
        tree.children.push({
          name: item.name,
          type: 'folder',
          path: item.path,
          children: subTree.children
        });
      } else {
        // File
        tree.children.push({
          name: item.name,
          type: 'file',
          path: item.path,
          download_url: item.download_url,
          size: item.size
        });
      }
    }

    return tree;
  } catch (error) {
    throw new Error(`GitHub API error: ${error.message}`);
  }
};

// Helper function to build file tree with cancellation support and enhanced nesting
const buildFileTreeWithCancellation = async (owner, repo, path = '', githubToken = null, analysisId = null, depth = 0, maxDepth = 10) => {
  try {
    // Check if analysis was cancelled
    if (analysisId && activeAnalyses.get(analysisId)?.cancelled) {
      throw new Error('Analysis cancelled by user');
    }

    // Update progress for deep analysis
    if (analysisId && depth >= 0) {
      // Progress should be based on how close we are to the max depth
      // Start at 10% and go up to 90% as we reach max depth
      const currentProgress = Math.min(10 + (depth / maxDepth) * 80, 90);
      const currentAnalysis = activeAnalyses.get(analysisId) || {};
      
      // Only update progress if it's higher than the current progress (prevent going backwards)
      const newProgress = Math.max(currentAnalysis.progress || 0, Math.round(currentProgress));
      
      activeAnalyses.set(analysisId, { 
        ...currentAnalysis,
        progress: newProgress,
        currentDepth: depth,
        currentPath: path,
        maxDepth: maxDepth,
        startTime: currentAnalysis.startTime || Date.now()
      });
    }

    // Check depth limit - stop when we reach the max depth (not exceed it)
    if (depth >= maxDepth) {
      return {
        name: path || repo,
        type: 'folder',
        children: [],
        truncated: true,
        message: `Maximum depth (${maxDepth}) reached`,
        actualDepth: depth,
        maxDepth: maxDepth
      };
    }

    const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
    
    // Add timeout and retry logic for GitHub API calls
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { 
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      }
    );

    // Handle GitHub API errors gracefully
    if (response.status === 404) {
      return {
        name: path || repo,
        type: 'folder',
        children: [],
        error: 'Directory not found or access denied',
        depth: depth
      };
    }

    if (response.status === 403) {
      return {
        name: path || repo,
        type: 'folder',
        children: [],
        error: 'Rate limit exceeded or access denied',
        depth: depth
      };
    }

    if (response.status >= 400) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const items = response.data;
    const tree = {
      name: path || repo,
      type: 'folder',
      children: [],
      depth: depth,
      actualDepth: depth,
      maxDepth: maxDepth
    };

    // Files/folders to skip for performance
    const skipPatterns = [
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
      'coverage', '.nyc_output', '.cache', '.parcel-cache',
      '*.log', '*.lock', '*.min.js', '*.min.css', '*.map'
    ];

    for (const item of items) {
      // Check for cancellation before processing each item
      if (analysisId && activeAnalyses.get(analysisId)?.cancelled) {
        throw new Error('Analysis cancelled by user');
      }

      // Skip certain files/folders for performance
      const shouldSkip = skipPatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(item.name);
        }
        return item.name === pattern;
      });

      if (shouldSkip) {
        continue;
      }

      if (item.type === 'dir') {
        // Recursively get folder contents with increased depth
        const subTree = await buildFileTreeWithCancellation(
          owner, 
          repo, 
          item.path, 
          githubToken, 
          analysisId, 
          depth + 1, 
          maxDepth
        );
        tree.children.push({
          name: item.name,
          type: 'folder',
          path: item.path,
          children: subTree.children,
          depth: depth + 1,
          actualDepth: subTree.actualDepth || depth + 1,
          maxDepth: maxDepth,
          truncated: subTree.truncated,
          message: subTree.message
        });
      } else {
        // File - include all files regardless of size
        tree.children.push({
          name: item.name,
          type: 'file',
          path: item.path,
          download_url: item.download_url,
          size: item.size,
          depth: depth,
          actualDepth: depth,
          maxDepth: maxDepth
        });
      }
    }

    return tree;
  } catch (error) {
    throw new Error(`GitHub API error: ${error.message}`);
  }
};

// Store active analysis requests
const activeAnalyses = new Map();

// Fetch repository structure
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { repoUrl, maxDepth = 15 } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }

    // Validate maxDepth
    const depth = Math.min(Math.max(parseInt(maxDepth) || 15, 1), 20); // Between 1 and 20

    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({ message: 'Invalid GitHub URL' });
    }

    const { owner, repo } = parsed;
    const githubToken = process.env.GITHUB_TOKEN;

    // Validate that the repository exists before proceeding
    const validateRepositoryExists = async (owner, repo, githubToken) => {
      try {
        const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
        
        const response = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}`,
          { 
            headers, 
            timeout: 10000,
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
          }
        );

        if (response.status === 404) {
          throw new Error(`Repository '${owner}/${repo}' not found. Please check the repository name and owner.`);
        }

        if (response.status === 403) {
          throw new Error(`Access denied to repository '${owner}/${repo}'. The repository may be private or you may not have permission to access it.`);
        }

        if (response.status >= 400) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        // Repository exists and is accessible
        const repoData = response.data;
        
        // Check if repository is empty
        if (repoData.size === 0) {
          throw new Error(`Repository '${owner}/${repo}' is empty and has no content to analyze.`);
        }
        
        // Check if repository has a default branch
        if (!repoData.default_branch) {
          throw new Error(`Repository '${owner}/${repo}' has no default branch and cannot be analyzed.`);
        }
        
        return {
          exists: true,
          isPrivate: repoData.private,
          defaultBranch: repoData.default_branch,
          description: repoData.description,
          language: repoData.language ? repoData.language.trim() : null,
          size: repoData.size,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count
        };
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error(`Repository '${owner}/${repo}' not found. Please check the repository name and owner.`);
        }
        if (error.response?.status === 403) {
          throw new Error(`Access denied to repository '${owner}/${repo}'. The repository may be private or you may not have permission to access it.`);
        }
        throw new Error(`Failed to validate repository: ${error.message}`);
      }
    };

    // Validate repository exists before starting analysis
    const repoInfo = await validateRepositoryExists(owner, repo, githubToken);
    console.log(`Repository validation successful: ${owner}/${repo} (${repoInfo.isPrivate ? 'private' : 'public'})`);

    // Create a unique ID for this analysis
    const analysisId = `${req.user.id}-${Date.now()}`;
    activeAnalyses.set(analysisId, { cancelled: false, progress: 0 });

    // Build file tree with cancellation support and enhanced depth
    const fileTree = await buildFileTreeWithCancellation(owner, repo, '', githubToken, analysisId, 0, depth);

    // Set progress to 100% before completing
    const currentAnalysis = activeAnalyses.get(analysisId) || {};
    activeAnalyses.set(analysisId, { 
      ...currentAnalysis,
      progress: 100,
      currentDepth: depth,
      currentPath: 'Analysis complete',
      maxDepth: depth,
      startTime: currentAnalysis.startTime || Date.now()
    });

    // Check if analysis was cancelled
    if (activeAnalyses.get(analysisId)?.cancelled) {
      activeAnalyses.delete(analysisId);
      return res.status(499).json({ message: 'Analysis cancelled by user' });
    }

    // Repository will be saved after statistics are calculated

    // Calculate actual depth reached (should never exceed the max depth we set)
    const calculateActualDepth = (node, currentDepth = 1) => {
      let maxActualDepth = currentDepth;
      if (node.children) {
        for (const child of node.children) {
          const childDepth = calculateActualDepth(child, currentDepth + 1);
          maxActualDepth = Math.max(maxActualDepth, childDepth);
        }
      }
      return maxActualDepth;
    };

    const actualDepthReached = Math.min(calculateActualDepth(fileTree), depth);
    
    // Calculate total file and folder counts using GitHub Tree API (much faster)
    const calculateTotalCounts = async (owner, repo, githubToken) => {
      try {
        const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
        
        // Files/folders to skip for performance (same as in buildFileTreeWithCancellation)
        const skipPatterns = [
          'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
          'coverage', '.nyc_output', '.cache', '.parcel-cache',
          '*.log', '*.lock', '*.min.js', '*.min.css', '*.map'
        ];
        
        // Get the default branch first with retry
        const repoResponse = await retryWithBackoff(async () => {
          return await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`,
            { headers, timeout: 10000 }
          );
        });
        const defaultBranch = repoResponse.data.default_branch;
        
        // Get the tree recursively from the default branch with retry
        const treeResponse = await retryWithBackoff(async () => {
          return await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            { headers, timeout: 15000 }
          );
        });
        
        let totalFiles = 0;
        let totalFolders = 0;
        let skippedFiles = 0;
        let skippedFolders = 0;
        let rootFolders = 0;
        
        // Count files and folders from the tree
        for (const item of treeResponse.data.tree) {
          // Skip files/folders that match skip patterns
          const shouldSkip = skipPatterns.some(pattern => {
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              return regex.test(item.path) || regex.test(item.path.split('/').pop());
            }
            return item.path === pattern || item.path.split('/').pop() === pattern;
          });
          
          if (shouldSkip) {
            if (item.type === 'blob') {
              skippedFiles++;
            } else if (item.type === 'tree') {
              skippedFolders++;
            }
            continue;
          }
          
          if (item.type === 'blob') {
            // It's a file
            totalFiles++;
          } else if (item.type === 'tree') {
            // It's a folder (but not the root)
            if (item.path !== '') {
              totalFolders++;
            } else {
              rootFolders++;
            }
          }
        }
        
        console.log('Tree API counting details - Total files:', totalFiles, 'Total folders:', totalFolders);
        console.log('Tree API counting details - Skipped files:', skippedFiles, 'Skipped folders:', skippedFolders);
        console.log('Tree API counting details - Root folders:', rootFolders);
        
        console.log('Total count calculation completed using Tree API:', { files: totalFiles, folders: totalFolders });
        return { files: totalFiles, folders: totalFolders };
      } catch (error) {
        console.error('Error calculating total counts with Tree API:', error.message);
        console.log('Falling back to tree-based counting...');
        // Fallback to counting from the truncated tree
        const stats = { totalFiles: 0, totalFolders: 0 };
        const countFromTree = (node, isRoot = false) => {
          if (node.type === 'file') {
            stats.totalFiles++;
          } else if (node.type === 'folder') {
            // Don't count the root folder itself (the repository root node)
            if (!isRoot) {
              stats.totalFolders++;
            }
            if (node.children) {
              node.children.forEach(child => countFromTree(child, false));
            }
          }
        };
        countFromTree(fileTree, true);
        console.log('Fallback counts:', stats);
        return { files: stats.totalFiles, folders: stats.totalFolders };
      }
    };

    const totalCounts = await calculateTotalCounts(owner, repo, githubToken);
    console.log('Total counts calculated:', totalCounts);
    
    // Calculate the real repository depth using Tree API (much faster)
    const calculateRealRepositoryDepth = async (owner, repo, githubToken) => {
      try {
        const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
        
        // Files/folders to skip for performance (same as in buildFileTreeWithCancellation)
        const skipPatterns = [
          'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
          'coverage', '.nyc_output', '.cache', '.parcel-cache',
          '*.log', '*.lock', '*.min.js', '*.min.css', '*.map'
        ];
        
        // Get the default branch first with retry
        const repoResponse = await retryWithBackoff(async () => {
          return await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`,
            { headers, timeout: 10000 }
          );
        });
        const defaultBranch = repoResponse.data.default_branch;
        
        // Get the tree recursively from the default branch with retry
        const treeResponse = await retryWithBackoff(async () => {
          return await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            { headers, timeout: 15000 }
          );
        });
        
        let maxDepth = 0;
        
        // Calculate depth from the tree paths
        for (const item of treeResponse.data.tree) {
          // Skip files/folders that match skip patterns
          const shouldSkip = skipPatterns.some(pattern => {
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              return regex.test(item.path) || regex.test(item.path.split('/').pop());
            }
            return item.path === pattern || item.path.split('/').pop() === pattern;
          });
          
          if (shouldSkip) {
            continue;
          }
          
          if (item.type === 'tree' && item.path !== '') {
            // Count the depth by counting path separators (add 1 for root level)
            const depth = item.path.split('/').length + 1;
            maxDepth = Math.max(maxDepth, depth);
          }
        }
        
        console.log('Real repository depth calculated using Tree API:', maxDepth);
        return maxDepth;
      } catch (error) {
        console.error('Error calculating real repository depth with Tree API:', error.message);
        // Fallback to the depth from the truncated tree
        return actualDepthReached;
      }
    };

    const realRepositoryDepth = await calculateRealRepositoryDepth(owner, repo, githubToken);
    
    // Calculate analyzed counts (what's actually in the tree)
    const analyzedCounts = { files: 0, folders: 0 };
    const countAnalyzed = (node, isRoot = false) => {
      if (node.type === 'file') {
        analyzedCounts.files++;
      } else if (node.type === 'folder') {
        // Don't count the root folder itself
        if (!isRoot) {
          analyzedCounts.folders++;
        }
        if (node.children) {
          node.children.forEach(child => countAnalyzed(child, false));
        }
      }
    };
    countAnalyzed(fileTree, true);
    
    // Ensure analyzed counts never exceed total counts
    analyzedCounts.files = Math.min(analyzedCounts.files, totalCounts.files);
    analyzedCounts.folders = Math.min(analyzedCounts.folders, totalCounts.folders);
    
    console.log('Analyzed counts calculated:', analyzedCounts);
    console.log('Analyzed counts breakdown - Files:', analyzedCounts.files, 'Folders:', analyzedCounts.folders);
    
    // The actual depth should not exceed the max depth we set or the real repository depth
    const finalActualDepth = Math.min(actualDepthReached, realRepositoryDepth);

    // Calculate total size from analyzed file tree
    const calculateTotalSize = (node) => {
      let totalSize = 0;
      if (node.type === 'file' && node.size && typeof node.size === 'number') {
        totalSize += node.size;
      }
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          totalSize += calculateTotalSize(child);
        }
      }
      return totalSize;
    };

    const calculatedTotalSize = calculateTotalSize(fileTree);

    // Fetch additional repository data for AI context
    let readmeContent = '';
    let packageJsonData = null;
    
    try {
      // Try to fetch README.md
      const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
      const readmeResponse = await axios.get(readmeUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        validateStatus: () => true
      });
      
      if (readmeResponse.status === 200 && readmeResponse.data.content) {
        readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
      }
    } catch (error) {
      console.log('Could not fetch README:', error.message);
    }

    try {
      // Try to fetch package.json
      const packageUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
      const packageResponse = await axios.get(packageUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        validateStatus: () => true
      });
      
      if (packageResponse.status === 200 && packageResponse.data.content) {
        const packageContent = Buffer.from(packageResponse.data.content, 'base64').toString('utf-8');
        packageJsonData = JSON.parse(packageContent);
      }
    } catch (error) {
      console.log('Could not fetch package.json:', error.message);
    }

    // Prepare repository statistics for storage
    const repositoryStats = {
      analyzedFiles: analyzedCounts.files,
      analyzedFolders: analyzedCounts.folders,
      totalFiles: totalCounts.files,
      totalFolders: totalCounts.folders,
      analyzedDepth: finalActualDepth,
      totalDepth: realRepositoryDepth,
      totalSize: calculatedTotalSize,
      isPrivate: repoInfo.isPrivate,
      language: repoInfo.language ? repoInfo.language.replace(/\s+\d+$/, '') : null,
      description: repoInfo.description,
      stars: repoInfo.stars,
      forks: repoInfo.forks,
      lastAnalyzed: new Date()
    };

    console.log('Repository stats being stored:', {
      originalLanguage: repoInfo.language,
      cleanedLanguage: repoInfo.language ? repoInfo.language.replace(/\s+\d+$/, '') : null,
      languageType: typeof repoInfo.language,
      languageLength: repoInfo.language ? repoInfo.language.length : 0,
      totalSize: calculatedTotalSize,
      stars: repoInfo.stars
    });

    // Save to database with statistics
    await Repository.create(req.user.id, repoUrl, fileTree, repositoryStats);

    // Increment analysis count in statistics
    await Statistics.incrementAnalyses();
    console.log('✅ Repository analysis trigger: Incremented analysis count');

    // Remove from active analyses after successful completion
    activeAnalyses.delete(analysisId);

    res.json({
      message: 'Repository analyzed successfully',
      repoInfo: { owner, repo },
      fileTree,
      analysisConfig: { 
        maxDepth: depth,
        actualDepth: finalActualDepth,
        analyzedFiles: analyzedCounts.files,
        analyzedFolders: analyzedCounts.folders,
        totalFiles: totalCounts.files,
        totalFolders: totalCounts.folders,
        realRepositoryDepth: realRepositoryDepth,
        wasTruncated: realRepositoryDepth > depth,
        repoUrl: repoUrl
      },
      // Additional data for AI assistant
      aiContext: {
        readme: readmeContent,
        packageJson: packageJsonData,
        repoInfo: {
          language: repoInfo.language,
          description: repoInfo.description,
          stars: repoInfo.stars,
          size: repoInfo.size
        }
      }
    });
  } catch (error) {
    // Clean up active analysis on error - find the analysisId for this user
    for (const [id, analysis] of activeAnalyses.entries()) {
      if (id.startsWith(req.user.id)) {
        activeAnalyses.delete(id);
        break;
      }
    }
    
    // Handle cancellation gracefully - don't log as error
    if (error.message === 'Analysis cancelled by user') {
      console.log('Analysis cancelled by user - this is normal user action');
      return res.status(499).json({ 
        message: 'Analysis cancelled by user',
        cancelled: true
      });
    }
    
    // Handle repository validation errors with specific status codes
    if (error.message.includes('not found') || error.message.includes('Repository')) {
      console.error('Repository validation error:', error.message);
      return res.status(404).json({ 
        message: error.message,
        error: 'Repository not found or inaccessible'
      });
    }
    
    // Handle GitHub API rate limiting
    if (error.response?.status === 403 && error.response?.data?.message?.includes('rate limit')) {
      console.error('GitHub API rate limit exceeded:', error.message);
      return res.status(429).json({ 
        message: 'GitHub API rate limit exceeded. Please try again later.',
        error: 'Rate limit exceeded'
      });
    }
    
    // Handle network/timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error during repository analysis:', error.message);
      return res.status(503).json({ 
        message: 'Network error. Please check your internet connection and try again.',
        error: 'Network error'
      });
    }
    
    // Only log actual errors
    console.error('GitHub analysis error:', error);
    res.status(500).json({ 
      message: 'Failed to analyze repository',
      error: error.message
    });
  }
});

// Validate repository endpoint for download functionality
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ 
        message: 'Repository URL is required',
        error: 'Missing repository URL'
      });
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({ 
        message: 'Invalid GitHub URL',
        error: 'Invalid URL format'
      });
    }

    const { owner, repo } = parsed;
    const githubToken = process.env.GITHUB_TOKEN;

    // Validate that the repository exists and get default branch
    const validateRepositoryExists = async (owner, repo, githubToken) => {
      try {
        const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
        
        const response = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}`,
          { 
            headers, 
            timeout: 10000,
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
          }
        );

        if (response.status === 404) {
          throw new Error(`Repository '${owner}/${repo}' not found. Please check the repository name and owner.`);
        }

        if (response.status === 403) {
          throw new Error(`Access denied to repository '${owner}/${repo}'. The repository may be private or you may not have permission to access it.`);
        }

        if (response.status >= 400) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        // Repository exists and is accessible
        const repoData = response.data;
        
        // Check if repository is empty
        if (repoData.size === 0) {
          throw new Error(`Repository '${owner}/${repo}' is empty and has no content to download.`);
        }
        
        // Check if repository has a default branch
        if (!repoData.default_branch) {
          throw new Error(`Repository '${owner}/${repo}' has no default branch and cannot be downloaded.`);
        }
        
        return {
          exists: true,
          isPrivate: repoData.private,
          defaultBranch: repoData.default_branch,
          description: repoData.description,
          language: repoData.language ? repoData.language.trim() : null,
          size: repoData.size,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count
        };
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error(`Repository '${owner}/${repo}' not found. Please check the repository name and owner.`);
        }
        if (error.response?.status === 403) {
          throw new Error(`Access denied to repository '${owner}/${repo}'. The repository may be private or you may not have permission to access it.`);
        }
        throw new Error(`Failed to validate repository: ${error.message}`);
      }
    };

    // Validate repository exists
    const repoInfo = await validateRepositoryExists(owner, repo, githubToken);
    console.log(`Repository validation successful: ${owner}/${repo} (${repoInfo.isPrivate ? 'private' : 'public'})`);

    res.json({
      exists: true,
      defaultBranch: repoInfo.defaultBranch,
      isPrivate: repoInfo.isPrivate,
      description: repoInfo.description,
      language: repoInfo.language,
      size: repoInfo.size,
      stars: repoInfo.stars,
      forks: repoInfo.forks
    });

  } catch (error) {
    // Handle repository validation errors with specific status codes
    if (error.message.includes('not found') || error.message.includes('Repository')) {
      console.error('Repository validation error:', error.message);
      return res.status(404).json({ 
        message: error.message,
        error: 'Repository not found or inaccessible'
      });
    }
    
    // Handle GitHub API rate limiting
    if (error.response?.status === 403 && error.response?.data?.message?.includes('rate limit')) {
      console.error('GitHub API rate limit exceeded:', error.message);
      return res.status(429).json({ 
        message: 'GitHub API rate limit exceeded. Please try again later.',
        error: 'Rate limit exceeded'
      });
    }
    
    // Handle network/timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error during repository validation:', error.message);
      return res.status(503).json({ 
        message: 'Network error. Please check your internet connection and try again.',
        error: 'Network error'
      });
    }
    
    // Only log actual errors
    console.error('Repository validation error:', error);
    res.status(500).json({ 
      message: 'Failed to validate repository',
      error: error.message
    });
  }
});

// Cancel analysis
router.post('/analyze/cancel', authMiddleware, async (req, res) => {
  try {
    const { analysisId } = req.body;
    
    // Find and cancel the analysis
    let cancelled = false;
    for (const [id, analysis] of activeAnalyses.entries()) {
      if (id.startsWith(req.user.id)) {
        analysis.cancelled = true;
        cancelled = true;
      }
    }
    
    res.json({ 
      message: cancelled ? 'Analysis cancellation requested' : 'No active analysis found',
      cancelled: cancelled
    });
  } catch (error) {
    console.error('Cancel analysis error:', error);
    res.status(500).json({ message: 'Failed to cancel analysis' });
  }
});

// Get analysis progress
router.get('/analyze/progress', authMiddleware, async (req, res) => {
  try {
    // Find active analysis for this user
    for (const [id, analysis] of activeAnalyses.entries()) {
      if (id.startsWith(req.user.id)) {
        return res.json({
          active: true,
          progress: analysis.progress || 0,
          currentDepth: analysis.currentDepth || 0,
          currentPath: analysis.currentPath || '',
          cancelled: analysis.cancelled || false
        });
      }
    }
    
    res.json({ active: false });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Failed to get analysis progress' });
  }
});

// Get file content
router.get('/file-content', authMiddleware, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    const response = await axios.get(url);
    res.json({ content: response.data });
  } catch (error) {
    console.error('File content error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch file content',
      error: error.message
    });
  }
});

// Get user's repositories
router.get('/repositories', authMiddleware, async (req, res) => {
  try {
    const repositories = await Repository.findByUserId(req.user.id);
    res.json({ repositories });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

// Delete repository
router.delete('/repositories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Repository.deleteById(req.user.id, id);
    
    if (deleted) {
      res.json({ message: 'Repository deleted successfully' });
    } else {
      res.status(404).json({ message: 'Repository not found' });
    }
  } catch (error) {
    console.error('Delete repository error:', error);
    res.status(500).json({ message: 'Failed to delete repository' });
  }
});

module.exports = router;