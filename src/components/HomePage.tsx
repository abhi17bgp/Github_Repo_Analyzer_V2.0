import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Github,
  BarChart3,
  Brain,
  Zap,
  Users,
  ArrowRight,
  Play,
  Shield,
  ArrowUp,
  TrendingUp,
  MessageCircle,
  Download,
  FolderTree,
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    repositoriesAnalyzed: 0,
    uptime: "95.9%",
    averageResponseTime: "<5s"
  });

  // Framer Motion animation variants - Smooth sequential flow
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  };

  const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };


  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Refs for lazy loading sections
  const statsRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const workingRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  // Intersection Observer for lazy loading animations
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
      }
    });
  }, []);

  // Smooth scroll to top function
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);


  useEffect(() => {
    // Create intersection observer for lazy loading - Slower triggering
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.05,
      rootMargin: '100px'
    });

    // Observe all sections
    const sections = [statsRef.current, featuresRef.current, workingRef.current, ctaRef.current];
    sections.forEach(section => {
      if (section && observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to handle login button clicks
  const handleLoginClick = () => {
    // Since the login modal is handled by the Navbar component,
    // we'll trigger it by dispatching a custom event
    const event = new CustomEvent("openLoginModal");
    window.dispatchEvent(event);
  };

  // Fetch statistics from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('🔍 API_BASE_URL:', API_BASE_URL);
        console.log('🔍 Fetching stats from:', `${API_BASE_URL}/stats`);
        const response = await axios.get(`${API_BASE_URL}/stats`);
        console.log('✅ Stats response:', response.data);
        console.log('✅ Response status:', response.status);
        
        setStats(prevStats => ({
          ...prevStats,
          activeUsers: response.data.activeUsers || 0,
          repositoriesAnalyzed: response.data.repositoriesAnalyzed || 0
        }));
        
        console.log('✅ Updated stats state:', {
          activeUsers: response.data.activeUsers || 0,
          repositoriesAnalyzed: response.data.repositoriesAnalyzed || 0
        });
      } catch (error: any) {
        console.error('❌ Failed to fetch stats:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
        // Keep default values if API fails
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      icon: FolderTree,
      title: "Interactive File Tree",
      description:
        "Visualize your repository structure with an interactive file tree that shows files, folders, and their relationships with real-time statistics.",
      color: "blue",
    },
    {
      icon: Brain,
      title: "AI Code Analysis",
      description:
        "Get intelligent code analysis with AI-powered insights, language detection, library identification, and code quality assessments.",
      color: "green",
    },
    {
      icon: MessageCircle,
      title: "AI Assistant Chat",
      description:
        "Chat with an AI assistant that understands your project context, answers questions about your code, and provides helpful insights.",
      color: "purple",
    },
    {
      icon: Download,
      title: "Repository Download",
      description:
        "Download entire repositories as ZIP files directly from GitHub with comprehensive error handling and validation.",
      color: "orange",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Statistics",
      description:
        "Track usage statistics with persistent counters that show active users and repositories analyzed, updating in real-time.",
      color: "indigo",
    },
    {
      icon: BarChart3,
      title: "Repository History",
      description:
        "Access your recent repository analyses with quick-load functionality, chat history, and persistent storage across sessions.",
      color: "red",
    },
  ];

  const statsData = [
    { number: `${Math.max(0, stats.activeUsers - 1)}+`, label: "Active Users", icon: Users },
    { number: `${Math.max(0, stats.repositoriesAnalyzed - 1)}+`, label: "Repositories Analyzed", icon: Github },
    { number: stats.uptime, label: "Uptime", icon: Shield },
    { number: stats.averageResponseTime, label: "Average Response Time", icon: Zap },
  ];

  // Debug logging
  console.log('🎯 Current stats for display:', {
    activeUsers: stats.activeUsers,
    repositoriesAnalyzed: stats.repositoriesAnalyzed,
    displayActiveUsers: `${Math.max(0, stats.activeUsers - 1)}+`,
    displayRepositories: `${Math.max(0, stats.repositoriesAnalyzed - 1)}+`
  });

  // Removed unused getColorClasses function for cleaner code

  return (
    <div className="homepage-asmr min-h-screen relative overflow-hidden pt-16" style={{background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)'}}>
      {/* GitHub-themed animated background elements - Enhanced */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main floating elements with soothing glow - positioned within viewport */}
        <div className="github-bg-element github-breathe absolute bottom-10 left-10 w-60 h-60 rounded-full blur-3xl"></div>
        <div className="github-bg-element github-subtle-pulse absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl"></div>
        
        {/* GitHub repository grid pattern */}
        <div className="github-grid"></div>
        <div className="github-grid-overlay"></div>
        
        {/* GitHub file tree branches */}
        <div className="github-file-tree"></div>
        
        
        {/* Enhanced GitHub branch lines - More distributed */}
        <div className="github-branch"></div>
        <div className="github-branch"></div>
        <div className="github-branch"></div>
        <div className="github-branch" style={{top: '60%', left: '60%', animationDelay: '2s'}}></div>
        <div className="github-branch" style={{top: '80%', right: '40%', animationDelay: '4s'}}></div>
        
        {/* Hero section specific line grows */}
        <div className="github-branch" style={{top: '25%', left: '15%', animationDelay: '0.5s'}}></div>
        <div className="github-branch" style={{top: '35%', right: '20%', animationDelay: '1s'}}></div>
       
        
        
        {/* Soothing connection lines - More throughout */}
        <div className="github-connections"></div>
        <div className="github-connections"></div>
        <div className="github-connections"></div>
        <div className="github-connections" style={{top: '45%', left: '50%', width: '80px', animationDelay: '1.5s'}}></div>
        <div className="github-connections" style={{top: '65%', right: '50%', width: '60px', animationDelay: '3s'}}></div>
        
        {/* Hero section connection lines */}
        <div className="github-connections" style={{top: '10%', left: '30%', width: '70px', animationDelay: '0.8s'}}></div>
        <div className="github-connections" style={{top: '40%', right: '35%', width: '90px', animationDelay: '1.2s'}}></div>
       
        
        {/* Subtle floating particles */}
        <div className="github-particles"></div>
        <div className="github-particles"></div>
        <div className="github-particles"></div>
        
        {/* GitHub commit dots */}
        <div className="github-commit-dots" style={{top: '20%', left: '15%', animationDelay: '0s'}}></div>
        <div className="github-commit-dots" style={{top: '30%', right: '20%', animationDelay: '1s'}}></div>
        <div className="github-commit-dots" style={{top: '60%', left: '25%', animationDelay: '2s'}}></div>
        <div className="github-commit-dots" style={{top: '70%', right: '30%', animationDelay: '3s'}}></div>
        
        {/* GitHub branch lines */}
        <div className="github-branch-line" style={{top: '25%', left: '10%', width: '100px', animationDelay: '0.5s'}}></div>
        <div className="github-branch-line" style={{top: '45%', right: '15%', width: '80px', animationDelay: '1.5s'}}></div>
        <div className="github-branch-line" style={{top: '65%', left: '20%', width: '120px', animationDelay: '2.5s'}}></div>
        
        {/* GitHub syntax highlighting effect */}
        <div className="github-syntax-glow" style={{animationDelay: '3s'}}></div>
        
        {/* D3.js Style Tree Visualization */}
        <div className="github-d3-tree-container">
          <div className="github-d3-tree-title">Repository Structure</div>
          <div className="github-d3-tree-subtitle">Interactive Tree Visualization</div>
          <svg className="github-d3-tree-svg" viewBox="0 0 240 300">
            {/* Root node */}
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '0s'}}>
              <circle className="github-d3-tree-node-circle github-d3-tree-pulse" cx="120" cy="50" r="8" />
              <text className="github-d3-tree-node-text" x="120" y="50">src</text>
            </g>
            
            {/* Level 1 nodes */}
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '0.3s'}}>
              <circle className="github-d3-tree-node-circle" cx="60" cy="120" r="6" />
              <text className="github-d3-tree-node-text" x="60" y="120">App.tsx</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '0.6s'}}>
              <circle className="github-d3-tree-node-circle" cx="120" cy="120" r="6" />
              <text className="github-d3-tree-node-text" x="120" y="120">components</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '0.9s'}}>
              <circle className="github-d3-tree-node-circle" cx="180" cy="120" r="6" />
              <text className="github-d3-tree-node-text" x="180" y="120">utils</text>
            </g>
            
            {/* Level 2 nodes - components children */}
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '1.2s'}}>
              <circle className="github-d3-tree-node-circle" cx="80" cy="180" r="5" />
              <text className="github-d3-tree-node-text" x="80" y="180">Dashboard</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '1.5s'}}>
              <circle className="github-d3-tree-node-circle" cx="120" cy="180" r="5" />
              <text className="github-d3-tree-node-text" x="120" y="180">FileTree</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '1.8s'}}>
              <circle className="github-d3-tree-node-circle" cx="160" cy="180" r="5" />
              <text className="github-d3-tree-node-text" x="160" y="180">Navbar</text>
            </g>
            
            {/* Level 2 nodes - utils children */}
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '2.1s'}}>
              <circle className="github-d3-tree-node-circle" cx="160" cy="240" r="5" />
              <text className="github-d3-tree-node-text" x="160" y="240">api.ts</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '2.4s'}}>
              <circle className="github-d3-tree-node-circle" cx="200" cy="240" r="5" />
              <text className="github-d3-tree-node-text" x="200" y="240">helpers</text>
            </g>
            
            {/* Level 3 nodes */}
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '2.7s'}}>
              <circle className="github-d3-tree-node-circle" cx="80" cy="240" r="4" />
              <text className="github-d3-tree-node-text" x="80" y="240">HomePage</text>
            </g>
            
            <g className="github-d3-tree-node github-d3-tree-expand" style={{animationDelay: '3s'}}>
              <circle className="github-d3-tree-node-circle" cx="120" cy="240" r="4" />
              <text className="github-d3-tree-node-text" x="120" y="240">Login</text>
            </g>
            
            {/* Tree links */}
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 58 L 60 112" style={{animationDelay: '0.2s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 58 L 120 112" style={{animationDelay: '0.5s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 58 L 180 112" style={{animationDelay: '0.8s'}} />
            
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 126 L 80 174" style={{animationDelay: '1.1s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 126 L 120 174" style={{animationDelay: '1.4s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 126 L 160 174" style={{animationDelay: '1.7s'}} />
            
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 180 126 L 160 234" style={{animationDelay: '2s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 180 126 L 200 234" style={{animationDelay: '2.3s'}} />
            
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 186 L 80 234" style={{animationDelay: '2.6s'}} />
            <path className="github-d3-tree-link github-d3-tree-link-animated" d="M 120 186 L 120 234" style={{animationDelay: '2.9s'}} />
          </svg>
        </div>
        
        {/* File Tree Card Animation */}
        <div className="github-file-tree-card">
          <div className="github-file-tree-card-title">File Tree</div>
          <div className="github-file-tree-card-subtitle">Repository Structure</div>
          <div className="github-file-tree-card-item" style={{marginTop: '35px'}}>
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-blue-400" />
            </div>
            <div className="github-file-tree-card-name">src/</div>
          </div>
          <div className="github-file-tree-card-item">
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-purple-400" />
            </div>
            <div className="github-file-tree-card-name">components/</div>
          </div>
          <div className="github-file-tree-card-item">
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-green-400" />
            </div>
            <div className="github-file-tree-card-name">hooks/</div>
          </div>
          <div className="github-file-tree-card-item">
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="github-file-tree-card-name">utils/</div>
          </div>
          <div className="github-file-tree-card-item">
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-orange-400" />
            </div>
            <div className="github-file-tree-card-name">public/</div>
          </div>
          <div className="github-file-tree-card-item">
            <div className="github-file-tree-card-icon">
              <FolderTree className="w-3 h-3 text-red-400" />
            </div>
            <div className="github-file-tree-card-name">assets/</div>
          </div>
        </div>
        
        {/* Removed progress bar animation */}
        
        
      </div>
      
      <Navbar />

      {/* Hero Section */}
      <section id="Home" className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              className="space-y-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center justify-center space-x-3"
                  variants={fadeInUp}
                >
                  <div className="p-2 github-card rounded-lg github-hover-lift github-repo-float">
                    <Github className="w-6 h-6 github-icon" />
                  </div>
                  <span className="github-text-secondary text-sm font-medium tracking-wide">
                    GitHub Repo Analyzer v1.0
                  </span>
                </motion.div>

                <motion.h1 
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold github-text-primary leading-tight"
                  variants={fadeInUp}
                >
                  Analyze Your GitHub Repos
                  <span className="block github-gradient-text">
                    Like Never Before<span className="github-cursor-blink">|</span>
                  </span>
                </motion.h1>

                <motion.p 
                  className="text-xl github-text-secondary leading-relaxed max-w-2xl mx-auto"
                  variants={fadeInUp}
                >
                  Unlock the full potential of your repositories with AI-powered
                  insights, visualizations, and intelligent code analysis.
                </motion.p>
              </div>

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                variants={scaleIn}
              >
                <button
                  onClick={handleLoginClick}
                  className="group px-8 py-4 font-semibold rounded-lg flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-green-300" />
                  <span className="text-green-200">Get Started</span>
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section ref={statsRef} id="stats" className="py-12">
        <section className="py-8 md:py-12 lg:py-20">
          <motion.div 
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2 
              className="text-3xl lg:text-4xl font-bold github-text-primary mb-6"
              variants={fadeInUp}
            >
              Platform Statistics
            </motion.h2>
            <motion.p 
              className="text-lg github-text-secondary leading-relaxed"
              variants={fadeInUp}
            >
              Discover the power of our GitHub repository analysis platform through our comprehensive statistics and insights.
            </motion.p>
          </motion.div>
        </section>
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {statsData.map((stat, index) => (
              <motion.div 
                key={index} 
                className="text-center group"
                variants={fadeInUp}
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 github-card rounded-lg github-hover-lift">
                    <stat.icon className="w-6 h-6 github-icon" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-bold github-text-primary mb-2 group-hover:text-green-500 transition-colors duration-300">
                  {stat.number}
                </div>
                <div className="github-text-secondary text-sm group-hover:text-gray-300 transition-colors duration-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2 
              className="text-3xl lg:text-4xl font-bold github-text-primary mb-4"
              variants={fadeInUp}
            >
              Powerful Features for Modern Development
            </motion.h2>
            <motion.p 
              className="text-xl github-text-secondary max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Everything you need to understand, analyze, and improve your
              GitHub repositories
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="p-6 github-card rounded-xl github-hover-lift"
                variants={fadeInUp}
              >
                <div className="p-3 rounded-lg github-border-animate w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 github-icon" />
                </div>
                <h3 className="text-xl font-semibold github-text-primary mb-3 group-hover:text-green-500 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="github-text-secondary leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={workingRef} id="working" className="py-16 relative" style={{background: 'rgba(22, 27, 34, 0.3)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2 
              className="text-3xl lg:text-4xl font-bold github-text-primary mb-4"
              variants={fadeInUp}
            >
              How It Works
            </motion.h2>
            <motion.p 
              className="text-xl github-text-secondary max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Experience the complete GitHub repository analysis workflow in three simple steps
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              className="text-center group"
              variants={fadeInUp}
            >
              <div className="w-16 h-16 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-green-500/20">
                <span className="text-green-300 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold github-text-primary mb-3 group-hover:text-green-500 transition-colors duration-300">
                Enter Repository URL
              </h3>
              <p className="github-text-secondary group-hover:text-gray-300 transition-colors duration-300">
                Paste your GitHub repository URL and click analyze. Our system validates the repository and prepares for analysis.
              </p>
            </motion.div>
            <motion.div 
              className="text-center group"
              variants={fadeInUp}
            >
              <div className="w-16 h-16 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-green-500/20">
                <span className="text-green-300 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold github-text-primary mb-3 group-hover:text-green-500 transition-colors duration-300">
                Explore & Analyze
              </h3>
              <p className="github-text-secondary group-hover:text-gray-300 transition-colors duration-300">
                Browse the interactive file tree, analyze individual files with AI insights, and chat with the AI assistant for project understanding.
              </p>
            </motion.div>
            <motion.div 
              className="text-center group"
              variants={fadeInUp}
            >
              <div className="w-16 h-16 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-green-500/20">
                <span className="text-green-300 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold github-text-primary mb-3 group-hover:text-green-500 transition-colors duration-300">
                Save & Access History
              </h3>
              <p className="github-text-secondary group-hover:text-gray-300 transition-colors duration-300">
                Your analysis is automatically saved. Access recent repositories, download as ZIP, and continue conversations with the AI assistant anytime.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-16 relative" style={{background: 'linear-gradient(135deg, rgba(35, 134, 54, 0.03) 0%, rgba(9, 105, 218, 0.05) 100%)'}}>
        <motion.div 
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2 
            className="text-3xl lg:text-4xl font-bold github-text-primary mb-6"
            variants={fadeInUp}
          >
            Ready to Transform Your Repository Analysis?
          </motion.h2>
          <motion.p 
            className="text-xl github-text-secondary mb-8 max-w-2xl mx-auto"
            variants={fadeInUp}
          >
            Join hundreds of developers who trust GitHub Analyzer for their
            repository insights
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={scaleIn}
          >
            <button
              onClick={handleLoginClick}
              className="group px-8 py-4 font-semibold rounded-lg flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
            >
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-green-300" />
              <span className="text-green-200">Start Analyzing Now</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300 text-green-300" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md text-green-300 hover:text-green-200 rounded-full shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:scale-110"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      <Footer />
    </div>
  );
};

export default HomePage;
