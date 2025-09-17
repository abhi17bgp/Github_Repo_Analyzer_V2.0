import React from "react";
import {
  Github,
  Linkedin,
  Mail,
  Zap,
  PieChart,
  WorkflowIcon,
  Home,
  BookOpen,
  HelpCircle,
  Shield,
  FileText,
  Users,
  Star,
  TrendingUp,
} from "lucide-react";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Home", href: "#Home", icon: Home },
        { name: "Features", href: "#features", icon: Zap },
        { name: "Stats", href: "#stats", icon: PieChart },
        { name: "Working", href: "#working", icon: WorkflowIcon },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "#docs", icon: BookOpen },
        { name: "API Reference", href: "#api", icon: FileText },
        { name: "Tutorials", href: "#tutorials", icon: TrendingUp },
        { name: "Community", href: "#community", icon: Users },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "#help", icon: HelpCircle },
        { name: "Contact Us", href: "#contact", icon: Mail },
        { name: "Bug Reports", href: "#bugs", icon: Github },
        { name: "Feature Requests", href: "#features", icon: Star },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", href: "#privacy", icon: Shield },
        { name: "Terms of Service", href: "#terms", icon: FileText },
        { name: "Cookie Policy", href: "#cookies", icon: Shield },
        { name: "GDPR", href: "#gdpr", icon: Shield },
      ],
    },
  ];

  const socialLinks = [
    {
      name: "GitHub",
      href: "https://github.com/abhi17bgp/Github_Repo_Analyzer/",
      icon: Github,
    },

    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/abhishek-anand-626a13288/",
      icon: Linkedin,
    },
    { name: "Email", href: "mailto:iabhishekbgp21.com", icon: Mail },
  ];

  return (
    <footer className="github-navbar bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 border-t border-green-500/20">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 ">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-400/20">
                <Github className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xl font-bold github-text-primary github-gradient-text">
                GitHub Repo Analyzer
              </span>
            </div>
            <p className="github-text-secondary text-sm leading-relaxed mb-6">
              Unlock the full potential of your repositories with AI-powered
              insights, visualizations, and intelligent code analysis.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4 ">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800/50 hover:bg-green-500/10 rounded-lg github-text-secondary hover:text-green-400 transition-all duration-300 group border border-green-500/20 hover:border-green-500/40"
                >
                  <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                </a>
              ))}
            </div>
          </div>


          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="github-text-primary font-semibold mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="flex items-center space-x-2 github-text-secondary hover:text-green-400 transition-all duration-300 group text-sm"
                    >
                      <link.icon className="w-4 h-4 group-hover:text-green-400 transition-colors duration-300" />
                      <span>{link.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-green-500/20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 github-text-secondary text-sm">
              <span>
                © {currentYear} GitHub Repo Analyzer Made by Abhishek with ❤️ for
                developers
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
