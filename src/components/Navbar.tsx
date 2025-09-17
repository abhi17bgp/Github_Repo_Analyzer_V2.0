import React, { useState, useEffect } from "react";
import {
  Github,
  Menu,
  X,
  Home,
  Zap,
  User,
  LogIn,
  PieChart,
  WorkflowIcon,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Login from "./Login";

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const [signupMode, setSignupMode] = useState(false);
  const [activeSection, setActiveSection] = useState("Home");

  // Listen for custom event to open login modal
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setIsLoginModalOpen(true);
      setIsMobileMenuOpen(false);
    };

    window.addEventListener("openLoginModal", handleOpenLoginModal);

    return () => {
      window.removeEventListener("openLoginModal", handleOpenLoginModal);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserDropdownOpen) {
        const target = event.target as Element;
        console.log("🔍 Click outside handler triggered. Target:", target);
        console.log(
          "🔍 Looking for .user-dropdown-container in target:",
          target.closest(".user-dropdown-container")
        );
        if (!target.closest(".user-dropdown-container")) {
          console.log("🔍 Clicking outside dropdown, closing it");
          setIsUserDropdownOpen(false);
        } else {
          console.log("🔍 Clicking inside dropdown, keeping it open");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  // Scroll spy functionality to track active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['Home', 'features', 'stats', 'working'];
      const scrollPosition = window.scrollY + 150; // Offset for navbar height

      let currentSection = 'Home'; // Default to Home

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          const sectionBottom = sectionTop + sectionHeight;
          
          // Check if we're in this section
          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            currentSection = sectionId;
            break;
          }
          // If we're past the top of this section, it might be the current one
          else if (scrollPosition >= sectionTop) {
            currentSection = sectionId;
          }
        }
      }

      // Debug logging
      console.log('🔍 Scroll Position:', scrollPosition, 'Active Section:', currentSection);
      setActiveSection(currentSection);
    };

    // Add throttling to improve performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll);
    handleScroll(); // Call once to set initial state

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);

  const navigation = [
    { name: "Home", href: "#Home", icon: Home },
    
    { name: "Stats", href: "#stats", icon: PieChart },
    { name: "Features", href: "#features", icon: Zap },
    { name: "Working", href: "#working", icon: WorkflowIcon },
  ];

  const handleSmoothScroll = (href: string) => {
    const element = document.querySelector(href) as HTMLElement;
    if (element) {
      const offsetTop = element.offsetTop - 80; // Account for navbar height
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
    setIsMobileMenuOpen(false);
    setSignupMode(false);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };
  const openSignupModal = () => {
    setIsLoginModalOpen(true);
    setIsMobileMenuOpen(false);
    setSignupMode(true);
  };

  return (
    <>
      <nav className="github-navbar bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 backdrop-blur-sm border-b border-green-500/20 fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-400/20">
                  <Github className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xl font-bold github-text-primary hidden sm:block github-gradient-text">
                  GitHub Repo Analyzer
                </span>
              </div>
            </div>

            {/* Navigation - Hide on small screens, show on medium and up */}
            <div className="hidden md:flex items-center space-x-4 sm:space-x-6 lg:space-x-8">
              {navigation.map((item) => {
                // Map navigation names to section IDs
                const sectionIdMap: { [key: string]: string } = {
                  "Home": "Home",
                  "Features": "features", 
                  "Stats": "stats",
                  "Working": "working"
                };
                const isActive = activeSection === sectionIdMap[item.name];
                return (
                  <button
                    key={item.name}
                    onClick={() => handleSmoothScroll(item.href)}
                    className={`github-nav-link flex items-center space-x-1 sm:space-x-2 transition-all duration-300 group relative ${
                      isActive 
                        ? "text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1" 
                        : "github-text-secondary hover:text-green-400"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 transition-colors duration-300 ${
                      isActive ? "text-green-400" : "group-hover:text-green-400"
                    }`} />
                    <span className="text-xs sm:text-sm font-medium">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                <div className="relative user-dropdown-container">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="github-user-btn flex items-center space-x-1 sm:space-x-2 github-text-secondary hover:text-green-400 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center github-animate-glow">
                      <span className="text-white text-sm font-medium">
                        {user.username?.charAt(0).toUpperCase() ||
                          user.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      {user.username || user.email}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* User Dropdown */}
                  {isUserDropdownOpen && (
                    <div className="github-dropdown absolute right-0 mt-2 w-48 bg-gradient-to-br from-slate-800 to-gray-900 border border-green-500/30 rounded-lg shadow-xl z-50">
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="github-dropdown-item flex items-center space-x-2 w-full px-4 py-2 text-sm github-text-secondary hover:text-green-400 transition-all duration-300"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={openLoginModal}
                    className="github-signin-btn flex items-center space-x-2 text-sm font-medium transition-all duration-300 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
                  >
                    <LogIn className="w-4 h-3 text-green-300" />
                    <span className="text-green-200">Sign In</span>
                  </button>
                  <button
                    //onClick={openLoginModal}
                    onClick={openSignupModal}
                    className="github-btn-primary px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4 text-green-300" />
                    <span className="text-green-200">Get Started</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button - Show on small screens */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="github-mobile-btn text-gray-300 hover:text-green-400 p-2 rounded-lg hover:bg-green-500/10 transition-all duration-300"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation - Show on small screens */}
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              {/* Mobile Menu */}
              <div className="github-mobile-menu md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 backdrop-blur-sm border-t border-green-500/20 shadow-xl z-50 animate-fade-in-down">
                {/* Mobile Menu Header with Close Button */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20">
                  <span className="github-text-primary font-semibold">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="github-mobile-close text-gray-300 hover:text-green-400 p-1 rounded-lg hover:bg-green-500/10 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-2 pt-2 pb-3 space-y-1">
                  {navigation.map((item) => {
                    // Map navigation names to section IDs
                    const sectionIdMap: { [key: string]: string } = {
                      "Home": "Home",
                      "Features": "features", 
                      "Stats": "stats",
                      "Working": "working"
                    };
                    const isActive = activeSection === sectionIdMap[item.name];
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          handleSmoothScroll(item.href);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`github-mobile-nav-item flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 w-full text-left ${
                          isActive 
                            ? "text-green-400 bg-green-500/10 border border-green-500/30" 
                            : "github-text-secondary hover:text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-green-400" : ""}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    );
                  })}

                  <div className="border-t border-green-500/20 pt-4 mt-4">
                    {user ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 px-3 py-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center github-animate-glow">
                            <span className="text-white text-sm font-medium">
                              {user.username?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                          <span className="text-sm font-medium github-text-primary">
                            {user.username}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="github-mobile-logout flex items-center space-x-2 w-full text-left px-3 py-2 github-text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-300"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={openLoginModal}
                          className="github-mobile-signin w-full text-left px-3 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
                        >
                          <LogIn className="w-4 h-4 text-green-300" />
                          <span className="text-green-200">Sign In</span>
                        </button>
                        <button
                          onClick={openSignupModal}
                          className="github-btn-primary w-full px-3 py-2 rounded-lg text-center font-medium transition-all duration-300 flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
                        >
                          <User className="w-4 h-4 text-green-300" />
                          <span className="text-green-200">Get Started</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="github-modal bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 border border-green-500/30 rounded-xl shadow-2xl w-full max-w-md !scale-75">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold github-text-primary">
                  Sign In to GitHub Repo Analyzer
                </h2>
                <button
                  onClick={closeLoginModal}
                  className="github-modal-close text-gray-400 hover:text-green-400 transition-all duration-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <Login signupMode={signupMode} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
