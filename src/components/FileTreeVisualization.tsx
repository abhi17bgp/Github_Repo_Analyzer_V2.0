import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import * as d3 from "d3";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { useFullscreen } from "../contexts/FullscreenContext";

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class FileTreeErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("FileTreeVisualization Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center text-gray-400 p-6">
            <div className="text-2xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Visualization Error</h3>
            <p className="text-sm mb-4">
              There was an error loading the file tree visualization.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  download_url?: string;
  children?: FileNode[];
  depth?: number;
  truncated?: boolean;
  message?: string;
  size?: number;
}

interface FileTreeVisualizationProps {
  data: FileNode;
  onFileSelect: (file: FileNode) => void;
  counts?: { analyzedFiles: number, analyzedFolders: number, totalFiles: number, totalFolders: number, analyzedDepth: number, totalDepth: number } | null;
}

interface D3Node extends d3.HierarchyNode<FileNode> {
  _children?: D3Node[];
  x0?: number;
  y0?: number;
}

const FileTreeVisualization: React.FC<FileTreeVisualizationProps> = ({
  data,
  onFileSelect,
  counts,
}) => {
  const { toggleFullscreen, fullscreenMode } = useFullscreen();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const treeDataRef = useRef<D3Node | null>(null);
  const isInitializedRef = useRef(false);
  const zoomBehaviorRef = useRef<any>(null); // Store zoom behavior reference

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate repository statistics
  const repoStats = useMemo(() => {
    const stats = {
      totalFiles: 0,
      totalFolders: 0,
      maxDepth: 0,
      totalSize: 0,
      truncatedFolders: 0,
    };

    const traverse = (node: FileNode, depth: number = 1) => {
      stats.maxDepth = Math.max(stats.maxDepth, depth);

      if (node.type === "file") {
        stats.totalFiles++;
        if (node.size) {
          stats.totalSize += node.size;
        }
      } else if (node.type === "folder") {
        stats.totalFolders++;
        if (node.truncated) {
          stats.truncatedFolders++;
        }
        if (node.children) {
          node.children.forEach((child) => traverse(child, depth + 1));
        }
      }
    };

    traverse(data);
    return stats;
  }, [data]);

  // Memoize the data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);

  // Memoize the callback to prevent re-renders
  const memoizedOnFileSelect = useMemo(() => onFileSelect, [onFileSelect]);

  // Force re-render for slider updates

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const isMobile = window.innerWidth < 768;
        const baseWidth = containerRef.current.clientWidth;
        const baseHeight = isMobile
          ? Math.max(400, window.innerHeight * 0.5)
          : Math.max(500, window.innerHeight * 0.6);

        setDimensions({
          width: baseWidth,
          height: baseHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!memoizedData || !svgRef.current) return;

    // Only reinitialize if data actually changes (reference comparison)
    if (treeDataRef.current && treeDataRef.current.data === memoizedData) {
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Responsive margins based on screen size
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      const margin = isMobile
        ? { top: 15, right: 70, bottom: 15, left: 70 }
        : isTablet
        ? { top: 20, right: 100, bottom: 20, left: 100 }
        : { top: 25, right: 130, bottom: 25, left: 130 };

      const width = dimensions.width - margin.left - margin.right;
      const height = dimensions.height - margin.top - margin.bottom;

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const tree = d3.tree<FileNode>().size([height, width]);
      const root = d3.hierarchy(memoizedData) as D3Node;

      root.x0 = height / 2;
      root.y0 = 0;

      // Collapse nodes initially (except root)
      const collapse = (d: D3Node) => {
        if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = undefined;
        }
      };

      if (root.children) {
        root.children.forEach(collapse);
      }

      treeDataRef.current = root;
      isInitializedRef.current = true;

      let i = 0;

      const update = (source: D3Node) => {
        try {
          const treeData = tree(root);
          const nodes = treeData.descendants();
          const links = treeData.descendants().slice(1);

          // Responsive node spacing
          const nodeSpacing = isMobile ? 160 : isTablet ? 180 : 200;

          // Normalize for fixed-depth
          nodes.forEach((d) => {
            d.y = d.depth * nodeSpacing;
          });

          // Update nodes
          const node = g
            .selectAll("g.node")
            .data(nodes, (d: any) => d.id || (d.id = ++i));

          const nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", () => `translate(${source.y0},${source.x0})`)
            .on("click", (event, d: D3Node) => {
              event.stopPropagation();
              event.preventDefault();

              try {
                if (d.data.type === "folder") {
                  if (d.children) {
                    d._children = d.children;
                    d.children = undefined;
                  } else {
                    d.children = d._children;
                    d._children = undefined;
                  }
                  update(d);
                } else {
                  memoizedOnFileSelect(d.data);
                }
              } catch (error) {
                console.error("Error handling node click:", error);
              }
            });

          nodeEnter
            .append("circle")
            .attr("class", "node-circle")
            .attr("r", 1e-6)
            .style("fill", (d: D3Node) => {
              if (d.data.type === "folder") {
                return d._children ? "#4F46E5" : "#10B981";
              }
              return "#EF4444";
            })
            .style("cursor", "default");

          nodeEnter
            .append("text")
            .attr("dy", ".35em")
            .attr("x", (d: D3Node) => (d.children || d._children ? -13 : 13))
            .attr("text-anchor", (d: D3Node) =>
              d.children || d._children ? "end" : "start"
            )
            .text((d: D3Node) => d.data.name)
            .style("fill", "#E5E7EB")
            .style("font-size", isMobile ? "12px" : "14px")
            .style("cursor", "default")
            .style("opacity", 1e-6);

          const nodeUpdate = nodeEnter.merge(node as any);

          nodeUpdate
            .transition()
            .duration(750)
            .attr("transform", (d: D3Node) => `translate(${d.y},${d.x})`);

          nodeUpdate
            .select("circle.node-circle")
            .attr("r", isMobile ? 6 : 8)
            .style("fill", (d: D3Node) => {
              if (d.data.type === "folder") {
                return d._children ? "#4F46E5" : "#10B981";
              }
              return "#EF4444";
            })
            .style("cursor", "default");

          nodeUpdate.select("text").style("opacity", 1);

          const nodeExit = node
            .exit()
            .transition()
            .duration(750)
            .attr("transform", () => `translate(${source.y},${source.x})`)
            .remove();

          nodeExit.select("circle").attr("r", 1e-6);

          nodeExit.select("text").style("opacity", 1e-6);

          // Update links
          const link = g.selectAll("path.link").data(links, (d: any) => d.id);

          const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("d", () => {
              const o = { x: source.x0, y: source.y0 };
              return diagonal(o, o);
            })
            .style("fill", "none")
            .style("stroke", "#374151")
            .style("stroke-width", isMobile ? "1.5px" : "2px");

          const linkUpdate = linkEnter.merge(link as any);

          linkUpdate
            .transition()
            .duration(750)
            .attr("d", (d: any) => diagonal(d, d.parent));

          link
            .exit()
            .transition()
            .duration(750)
            .attr("d", () => {
              const o = { x: source.x, y: source.y };
              return diagonal(o, o);
            })
            .remove();

          nodes.forEach((d: D3Node) => {
            d.x0 = d.x!;
            d.y0 = d.y!;
          });
        } catch (error) {
          console.error("Error in tree update:", error);
        }
      };

      const diagonal = (s: any, d: any) => {
        return `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
      };

      update(root);
    } catch (error) {
      console.error("Error initializing tree visualization:", error);
    }
  }, [memoizedData, dimensions, memoizedOnFileSelect]);

  // Effect to enable/disable zoom behavior based on isZoomEnabled state
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Create zoom behavior once and store reference
    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3
        .zoom()
        .scaleExtent([0.1, 3])
        .on("zoom", (event) => {
          const { transform } = event;
          setZoomLevel(transform.k);
          setPanX(transform.x);
          setPanY(transform.y);
          const g = svg.select("g");
          g.attr("transform", transform);
        })
        .on("start", () => {
          const svgElement = svgRef.current;
          if (svgElement) {
            svgElement.classList.add("cursor-grabbing");
            svgElement.classList.remove("cursor-grab");
          }
        })
        .on("end", () => {
          const svgElement = svgRef.current;
          if (svgElement) {
            svgElement.classList.remove("cursor-grabbing");
            svgElement.classList.add("cursor-grab");
          }
        });
    }

    // Apply or remove zoom behavior based on isZoomEnabled
    if (isZoomEnabled) {
      svg.call(zoomBehaviorRef.current);
    } else {
      svg.on(".zoom", null);
      // Reset cursor class
      const svgElement = svgRef.current;
      if (svgElement) {
        svgElement.classList.remove("cursor-grabbing");
        svgElement.classList.add("cursor-grab");
      }
    }

    // Cleanup function to reset zoom when component unmounts
    return () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.on(".zoom", null);
      }
    };
  }, [isZoomEnabled]);

  // Enhanced Zoom controls with smooth animations
  const handleZoomIn = () => {
    if (svgRef.current && isZoomEnabled && zoomBehaviorRef.current && !isAnimating) {
      setIsAnimating(true);
      const svg = d3.select(svgRef.current);
      const currentZoom = d3.zoomTransform(svgRef.current).k;
      const newZoom = Math.min(currentZoom * 1.3, 3);
      
      svg
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .call(zoomBehaviorRef.current.scaleTo as any, newZoom)
        .on('end', () => {
          setIsAnimating(false);
          setZoomLevel(newZoom);
        });
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && isZoomEnabled && zoomBehaviorRef.current && !isAnimating) {
      setIsAnimating(true);
      const svg = d3.select(svgRef.current);
      const currentZoom = d3.zoomTransform(svgRef.current).k;
      const newZoom = Math.max(currentZoom / 1.3, 0.1);
      
      svg
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .call(zoomBehaviorRef.current.scaleTo as any, newZoom)
        .on('end', () => {
          setIsAnimating(false);
          setZoomLevel(newZoom);
        });
    }
  };

  const handleReset = () => {
    if (svgRef.current && isZoomEnabled && zoomBehaviorRef.current && !isAnimating) {
      setIsAnimating(true);
      const svg = d3.select(svgRef.current);
      
      svg
        .transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity)
        .on('end', () => {
          setIsAnimating(false);
          setZoomLevel(1);
          setPanX(0);
          setPanY(0);
        });
    }
  };

  // Enhanced Pan controls with smooth animations
  const handlePanChange = (
    direction: "horizontal" | "vertical",
    value: number
  ) => {
    if (svgRef.current && isZoomEnabled && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      const transform = d3.zoomTransform(svgRef.current);

      if (direction === "horizontal") {
        const newTransform = transform.translate(value - transform.x, 0);
        svg
          .transition()
          .duration(150)
          .ease(d3.easeCubicOut)
          .call(zoomBehaviorRef.current.transform as any, newTransform)
          .on('end', () => setPanX(value));
      } else {
        const newTransform = transform.translate(0, value - transform.y);
        svg
          .transition()
          .duration(150)
          .ease(d3.easeCubicOut)
          .call(zoomBehaviorRef.current.transform as any, newTransform)
          .on('end', () => setPanY(value));
      }
    }
  };

  // Get current pan values for sliders
  const getCurrentPanX = () => {
    if (svgRef.current) {
      return d3.zoomTransform(svgRef.current).x;
    }
    return panX;
  };

  const getCurrentPanY = () => {
    if (svgRef.current) {
      return d3.zoomTransform(svgRef.current).y;
    }
    return panY;
  };

  return (
    <div className={`w-full h-full flex flex-col ${fullscreenMode === 'tree' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {fullscreenMode !== 'tree' && (
        <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-300">
            Repository Structure
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleFullscreen('tree')}
              className="group p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105"
              title="Toggle fullscreen"
            >
              <Maximize2 className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>
            <button
              onClick={() => setIsZoomEnabled(!isZoomEnabled)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isZoomEnabled
                  ? "bg-green-700 hover:bg-green-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={isZoomEnabled ? "Disable zoom" : "Enable zoom"}
            >
              <span className="text-xs font-medium">
                {isZoomEnabled ? "Z: ON" : "Z: OFF"}
              </span>
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
              title="Toggle controls"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-6 text-xs sm:text-sm text-gray-400">
          <div className="flex items-center whitespace-nowrap">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm">Expanded Folder</span>
          </div>
          <div className="flex items-center whitespace-nowrap">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-indigo-500 mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm">Collapsed Folder</span>
          </div>
          <div className="flex items-center whitespace-nowrap">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm">File</span>
          </div>
        </div>

        {/* Repository Statistics */}
        <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-white font-semibold">
                {counts ? `${counts.analyzedFiles} / ${counts.totalFiles}` : repoStats.totalFiles}
              </div>
              <div className="text-gray-400 text-xs">Files</div>
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">
                {counts ? `${counts.analyzedFolders} / ${counts.totalFolders}` : repoStats.totalFolders}
              </div>
              <div className="text-gray-400 text-xs">Folders</div>
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">
                {counts ? `${counts.analyzedDepth} / ${counts.totalDepth}` : repoStats.maxDepth}
              </div>
              <div className="text-gray-400 text-xs">Depth</div>
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">
                {repoStats.totalSize > 0
                  ? `${(repoStats.totalSize / 1024 / 1024).toFixed(1)} MB`
                  : "N/A"}
              </div>
              <div className="text-gray-400 text-xs">Total Size</div>
            </div>
          </div>
          {repoStats.truncatedFolders > 0 && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 text-yellow-300 text-xs">
                <span className="mr-2">⚠️</span>
                <div className="text-left">
                  <div className="font-semibold">
                    {repoStats.truncatedFolders} folder{repoStats.truncatedFolders > 1 ? "s" : ""} truncated
                  </div>
                  <div className="text-yellow-400/80 text-xs mt-1">
                    Repository depth exceeds analysis limit
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Zoom and Pan Controls */}
        {showControls && (
          <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Zoom Controls */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <ZoomIn className="w-4 h-4 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200">
                    Zoom Controls
                  </h4>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleZoomOut}
                    disabled={!isZoomEnabled || isAnimating}
                    className={`group p-3 rounded-xl transition-all duration-300 ${
                      isZoomEnabled && !isAnimating
                        ? "bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-300 hover:text-red-200 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 border border-red-500/30"
                        : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                    }`}
                    title={isAnimating ? "Animating..." : "Zoom Out"}
                  >
                    <ZoomOut className={`w-5 h-5 transition-transform duration-200 ${
                      isAnimating ? "animate-pulse" : "group-hover:scale-110"
                    }`} />
                  </button>
                  
                  <div className="flex-1 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {(() => {
                          try {
                            if (svgRef.current) {
                              return Math.round(d3.zoomTransform(svgRef.current).k * 100);
                            }
                          } catch (error) {
                            console.error('Get zoom level error:', error);
                          }
                          return Math.round(zoomLevel * 100);
                        })()}%
                      </div>
                      <div className="text-xs text-gray-400">Zoom Level</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleZoomIn}
                    disabled={!isZoomEnabled || isAnimating}
                    className={`group p-3 rounded-xl transition-all duration-300 ${
                      isZoomEnabled && !isAnimating
                        ? "bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 text-green-300 hover:text-green-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 border border-green-500/30"
                        : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                    }`}
                    title={isAnimating ? "Animating..." : "Zoom In"}
                  >
                    <ZoomIn className={`w-5 h-5 transition-transform duration-200 ${
                      isAnimating ? "animate-pulse" : "group-hover:scale-110"
                    }`} />
                  </button>
                  
                  <button
                    onClick={handleReset}
                    disabled={!isZoomEnabled || isAnimating}
                    className={`group p-3 rounded-xl transition-all duration-300 ${
                      isZoomEnabled && !isAnimating
                        ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-blue-300 hover:text-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/30"
                        : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                    }`}
                    title={isAnimating ? "Animating..." : "Reset View"}
                  >
                    <RotateCcw className={`w-5 h-5 transition-transform duration-300 ${
                      isAnimating ? "animate-spin" : "group-hover:rotate-180"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Enhanced Pan Controls */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200">
                    Pan Controls
                  </h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-300 flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                        Horizontal
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                        {Math.round(getCurrentPanX())}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={getCurrentPanX()}
                        onChange={(e) =>
                          handlePanChange("horizontal", parseInt(e.target.value))
                        }
                        disabled={!isZoomEnabled || isAnimating}
                        className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider transition-all duration-200 ${
                          isZoomEnabled && !isAnimating
                            ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                            : "bg-gray-800 cursor-not-allowed"
                        }`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-300 flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        Vertical
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                        {Math.round(getCurrentPanY())}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={getCurrentPanY()}
                        onChange={(e) =>
                          handlePanChange("vertical", parseInt(e.target.value))
                        }
                        disabled={!isZoomEnabled || isAnimating}
                        className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider transition-all duration-200 ${
                          isZoomEnabled && !isAnimating
                            ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                            : "bg-gray-800 cursor-not-allowed"
                        }`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      <div
        ref={containerRef}
        className={`bg-gray-800 rounded-lg flex-1 overflow-x-auto overflow-y-hidden min-h-0 border border-gray-700 scrollbar-thin relative ${
          fullscreenMode === 'tree' 
            ? 'p-1' 
            : 'p-2 sm:p-4'
        }`}
        style={{ 
          minHeight: fullscreenMode === 'tree' ? "calc(100vh - 120px)" : "400px" 
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="min-h-64 sm:min-h-96 cursor-grab active:cursor-grabbing"
          style={{ minWidth: "max-content" }}
        />

        {/* Floating Controls for Fullscreen Mode */}
        {fullscreenMode === 'tree' && (
          <>
            {/* Top-right floating controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <button
                onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isZoomEnabled
                    ? "bg-green-700 hover:bg-green-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
                title={isZoomEnabled ? "Disable zoom" : "Enable zoom"}
              >
                <span className="text-xs font-medium">
                  {isZoomEnabled ? "Z: ON" : "Z: OFF"}
                </span>
              </button>
              <button
                onClick={() => setShowControls(!showControls)}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
                title="Toggle controls"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Enhanced Floating Zoom and Pan Controls */}
            {showControls && (
              <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg max-w-sm">
                <div className="space-y-4">
                  {/* Zoom Controls Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <ZoomIn className="w-4 h-4 text-blue-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-200">
                        Zoom Controls
                      </h4>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleZoomOut}
                        disabled={!isZoomEnabled || isAnimating}
                        className={`group p-3 rounded-xl transition-all duration-300 ${
                          isZoomEnabled && !isAnimating
                            ? "bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-300 hover:text-red-200 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 border border-red-500/30"
                            : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                        }`}
                        title={isAnimating ? "Animating..." : "Zoom Out"}
                      >
                        <ZoomOut className={`w-5 h-5 transition-transform duration-200 ${
                          isAnimating ? "animate-pulse" : "group-hover:scale-110"
                        }`} />
                      </button>
                      
                      <div className="flex-1 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">
                            {(() => {
                              try {
                                if (svgRef.current) {
                                  return Math.round(d3.zoomTransform(svgRef.current).k * 100);
                                }
                              } catch (error) {
                                console.error('Get zoom level error:', error);
                              }
                              return Math.round(zoomLevel * 100);
                            })()}%
                          </div>
                          <div className="text-xs text-gray-400">Zoom Level</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleZoomIn}
                        disabled={!isZoomEnabled || isAnimating}
                        className={`group p-3 rounded-xl transition-all duration-300 ${
                          isZoomEnabled && !isAnimating
                            ? "bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 text-green-300 hover:text-green-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 border border-green-500/30"
                            : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                        }`}
                        title={isAnimating ? "Animating..." : "Zoom In"}
                      >
                        <ZoomIn className={`w-5 h-5 transition-transform duration-200 ${
                          isAnimating ? "animate-pulse" : "group-hover:scale-110"
                        }`} />
                      </button>
                      
                      <button
                        onClick={handleReset}
                        disabled={!isZoomEnabled || isAnimating}
                        className={`group p-3 rounded-xl transition-all duration-300 ${
                          isZoomEnabled && !isAnimating
                            ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-blue-300 hover:text-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/30"
                            : "bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/50"
                        }`}
                        title={isAnimating ? "Animating..." : "Reset View"}
                      >
                        <RotateCcw className={`w-5 h-5 transition-transform duration-300 ${
                          isAnimating ? "animate-spin" : "group-hover:rotate-180"
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Pan Controls Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-purple-500/20 rounded-lg">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-200">
                        Pan Controls
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300 flex items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                            Horizontal
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                            {Math.round(getCurrentPanX())}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="-1000"
                            max="1000"
                            value={getCurrentPanX()}
                            onChange={(e) =>
                              handlePanChange("horizontal", parseInt(e.target.value))
                            }
                            disabled={!isZoomEnabled || isAnimating}
                            className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider transition-all duration-200 ${
                              isZoomEnabled && !isAnimating
                                ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                                : "bg-gray-800 cursor-not-allowed"
                            }`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300 flex items-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                            Vertical
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                            {Math.round(getCurrentPanY())}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="-1000"
                            max="1000"
                            value={getCurrentPanY()}
                            onChange={(e) =>
                              handlePanChange("vertical", parseInt(e.target.value))
                            }
                            disabled={!isZoomEnabled || isAnimating}
                            className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider transition-all duration-200 ${
                              isZoomEnabled && !isAnimating
                                ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                                : "bg-gray-800 cursor-not-allowed"
                            }`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Zoom Instructions */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
          {isZoomEnabled ? "Scroll to zoom • Drag to pan" : "Zoom disabled"}
        </div>
      </div>
    </div>
  );
};

// Export with error boundary
const FileTreeVisualizationWithErrorBoundary: React.FC<
  FileTreeVisualizationProps
> = (props) => {
  return (
    <FileTreeErrorBoundary>
      <FileTreeVisualization {...props} />
    </FileTreeErrorBoundary>
  );
};

export default FileTreeVisualizationWithErrorBoundary;

