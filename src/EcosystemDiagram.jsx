/**
 * EcosystemDiagram - Interactive Application Ecosystem Visualization
 *
 * This React component creates an interactive force-directed graph that visualizes
 * the Hope Ignites application ecosystem using D3.js.
 *
 * KEY REACT CONCEPTS DEMONSTRATED:
 *
 * 1. COMPONENT: A function that returns JSX (HTML-like syntax)
 * 2. PROPS: Data passed into the component (like function parameters)
 * 3. STATE: Data that can change and trigger re-renders (useState)
 * 4. EFFECTS: Side effects that run after render (useEffect)
 * 5. REFS: Direct access to DOM elements (useRef)
 *
 * ARCHITECTURE:
 * - React manages the UI wrapper (header, detail card, legend)
 * - D3.js manages the SVG graph visualization
 * - This hybrid approach is common when integrating D3 with React
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import ReactMarkdown from 'react-markdown';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { getAdminContact, getTeamsChatUrl, getMailtoUrl } from './adminData.js';

/**
 * LEARNING: Using Props
 *
 * Props (properties) are how you pass data into a component.
 * They work like function parameters.
 *
 * This component now accepts:
 * - nodes: Array of application/security nodes to display
 * - links: Array of connections between nodes
 * - categoryColors: Object mapping categories to colors
 * - tabName: Name of the current tab (Applications or Security)
 *
 * This makes the component reusable for different datasets!
 */
export default function EcosystemDiagram({ nodes, links, categoryColors, tabName = "Application", activeTab = "applications", setActiveTab = () => {}, branding = {} }) {
  const orgName = branding.org_name || 'Your Organization';
  const logoSrc = branding.logo_url || '/logo.png';
  const logoDarkSrc = branding.logo_dark_url || '/dark-logo.png';
  /**
   * LEARNING: useState Hook
   *
   * useState creates "state" - data that can change over time.
   * When state changes, React automatically re-renders the component.
   *
   * Syntax: const [value, setValue] = useState(initialValue)
   * - value: The current state value
   * - setValue: Function to update the state
   * - initialValue: What the state starts as
   */
  const [selectedNode, setSelectedNode] = useState(null);  // Currently selected application
  const [hoveredNode, setHoveredNode] = useState(null);    // Currently hovered application
  const [viewMode, setViewMode] = useState('graph');       // View mode: 'graph' or 'table'
  const [showSSO, setShowSSO] = useState(false);           // Toggle SSO connections visibility
  const [showObservability, setShowObservability] = useState(false); // Toggle Observability connections visibility
  const [showAI, setShowAI] = useState(false);              // Toggle AI layer visibility (default on)
  const [showDNS, setShowDNS] = useState(false);            // Toggle DNS layer visibility (default on)
  const [showBackup, setShowBackup] = useState(false);      // Toggle Backup connections visibility
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false); // Track layers menu state
  const [isFullscreen, setIsFullscreen] = useState(false); // Track fullscreen state
  const [selectedCategories, setSelectedCategories] = useState(new Set()); // Track selected categories for filtering
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize from localStorage or default to false
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isOrbMenuOpen, setIsOrbMenuOpen] = useState(false); // Track Stackium Family menu state
  const [selectedCloudProvider, setSelectedCloudProvider] = useState('all'); // Cloud provider filter
  const [showDocs, setShowDocs] = useState(false); // Track documentation modal state
  const [docsContent, setDocsContent] = useState(''); // Store markdown content
  const [docsLoading, setDocsLoading] = useState(false); // Track loading state

  // Tour state - check if user has seen the tour before
  const [runTour, setRunTour] = useState(() => {
    const tourCompleted = localStorage.getItem('ecosystem-tour-completed');
    return !tourCompleted; // Run tour if not completed
  });
  const [tourStepIndex, setTourStepIndex] = useState(0);

  /**
   * LEARNING: useRef Hook
   *
   * useRef creates a reference to a DOM element.
   * Unlike state, changing a ref doesn't trigger a re-render.
   *
   * Use refs when you need direct access to DOM elements (like for D3)
   */
  const svgRef = useRef(null);        // Reference to the <svg> element
  const simulationRef = useRef(null); // Reference to the D3 simulation
  const zoomRef = useRef(null);       // Reference to the D3 zoom behavior
  const selectedNodeRef = useRef(null); // Reference to track selected node for D3 event handlers
  const containerRef = useRef(null);  // Reference to the container element for fullscreen

  // Keep the ref in sync with the state
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  /**
   * Tour Configuration
   * Defines the steps for the first-time user guide
   */
  const tourSteps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#002a42' }}>
            Welcome to the {orgName} Application Ecosystem! 👋
          </h2>
          <p className="text-sm">
            This interactive diagram shows how our technology stack connects together.
            Each circle is an application, and lines show data flows between them.
          </p>
          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
            Let's take a quick tour of the key features!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      styles: {
        options: {
          width: 500,
        },
      },
    },
    {
      target: '.ecosystem-svg',
      content: (
        <div>
          <h3 className="font-bold mb-2" style={{ color: '#002a42' }}>
            Explore Connections
          </h3>
          <p className="text-sm">
            Hover over any application to see what it connects to.
            Connected apps will light up, while others fade into the background.
          </p>
          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
            Try hovering over a circle now!
          </p>
        </div>
      ),
      placement: 'center',
      spotlightClicks: true,
      styles: {
        options: {
          width: 400,
        },
      },
    },
    {
      target: '.ecosystem-svg-container',
      content: (
        <div>
          <h3 className="font-bold mb-2" style={{ color: '#002a42' }}>
            View Detailed Information
          </h3>
          <p className="text-sm">
            Click any application to see its full details: description, technology stack,
            owner, connections, complexity score, and more.
          </p>
          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
            Click on an application to see its detail card appear!
          </p>
        </div>
      ),
      placement: 'left',
      spotlightClicks: true,
    },
    {
      target: '.legend-container',
      content: (
        <div>
          <h3 className="font-bold mb-2" style={{ color: '#002a42' }}>
            Filter and Navigate
          </h3>
          <p className="text-sm">
            Use the legend to filter applications by category. Switch between
            graph and table views using the view toggle. Try the search to find
            specific applications quickly!
          </p>
          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
            You're all set! Click "Got it" to start exploring.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  /**
   * Tour Callback Handler
   * Handles tour events like completion, skipping, etc.
   */
  const handleTourCallback = (data) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tour completed or skipped - save to localStorage
      localStorage.setItem('ecosystem-tour-completed', 'true');
      setRunTour(false);
      setTourStepIndex(0);
    } else if (type === EVENTS.STEP_AFTER) {
      // Move to next step
      setTourStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  /**
   * Restart Tour Function
   * Allows users to manually restart the tour
   */
  const restartTour = () => {
    setTourStepIndex(0);
    setRunTour(true);
  };

  // Persist dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Load and display documentation
  const openDocs = async () => {
    setDocsLoading(true);
    setShowDocs(true);

    try {
      // Determine which doc to load based on active tab
      const docFile = activeTab === 'security' ? 'security.md' : 'applications.md';
      const response = await fetch(`/docs/${docFile}`);
      const text = await response.text();
      setDocsContent(text);
    } catch (error) {
      console.error('Error loading documentation:', error);
      setDocsContent('# Error\n\nFailed to load documentation. Please try again.');
    } finally {
      setDocsLoading(false);
    }
  };

  // URL-based routing: Read URL parameter on mount to open specific application
  useEffect(() => {
    const path = window.location.pathname;
    // Extract application ID from URL (e.g., /adp from eco.hopeignites.app/adp)
    const appId = path.split('/').filter(Boolean).pop();

    if (appId && appId !== '') {
      // Find the node with matching ID
      const node = nodes.find(n => n.id === appId);
      if (node) {
        // Set the selected node to open the detail card
        setSelectedNode(node);
      }
    }
  }, []); // Run only on mount

  // Update URL when user selects an application
  useEffect(() => {
    if (selectedNode) {
      // Update URL without page reload
      const newUrl = `/${selectedNode.id}`;
      window.history.pushState(null, '', newUrl);
    } else {
      // Clear the URL parameter when deselecting
      window.history.pushState(null, '', '/');
    }
  }, [selectedNode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const appId = path.split('/').filter(Boolean).pop();

      if (appId && appId !== '') {
        const node = nodes.find(n => n.id === appId);
        if (node) {
          setSelectedNode(node);
        } else {
          setSelectedNode(null);
        }
      } else {
        setSelectedNode(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle category filtering
  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  /**
   * LEARNING: useEffect Hook
   *
   * useEffect runs side effects after the component renders.
   * Side effects are things like:
   * - Fetching data
   * - Setting up subscriptions
   * - Manipulating the DOM (like with D3)
   *
   * Syntax: useEffect(() => { ...code... }, [dependencies])
   * - The function runs after render
   * - It re-runs when dependencies change
   * - Empty [] means "run once on mount"
   * - Return a function to clean up when component unmounts
   */
  useEffect(() => {
    // Guard clause: Don't run if SVG ref isn't ready yet
    if (!svgRef.current) return;

    // Configuration
    const width = 1200;
    const height = 800;

    /**
     * LEARNING: D3 Selection
     *
     * d3.select() finds a DOM element (like document.querySelector)
     * Then you can chain methods to manipulate it
     */
    // Clear any previous content (important when React re-renders)
    d3.select(svgRef.current).selectAll('*').remove();

    // Create the main SVG selection
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    /**
     * NEW FEATURE: Zoom and Pan
     *
     * D3's zoom behavior allows users to:
     * - Scroll to zoom in/out
     * - Drag to pan the view
     * - Programmatic zoom (via buttons)
     */
    const g = svg.append('g');  // Group for all zoomable content

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])  // Min zoom: 10%, Max zoom: 400%
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Store zoom behavior in ref for button access
    zoomRef.current = zoom;

    // Click on background to deselect
    svg.on('click', () => {
      setSelectedNode(null);
      resetHighlight();
    });

    /**
     * LEARNING: SVG Markers (Arrowheads)
     *
     * SVG markers are reusable graphics that can be placed at the end of lines.
     * We create THREE types of arrows:
     * 1. Regular arrow for data connections (solid gray)
     * 2. SSO arrow for authentication connections (purple dashed)
     * 3. Observability arrow for monitoring connections (orange dashed)
     *
     * Note: Defs go in SVG, not the zoomable group
     */
    const defs = svg.append('defs');

    // Regular arrow for data connections
    defs.append('marker')
      .attr('id', 'arrow-data')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#94a3b8')
      .attr('d', 'M0,-5L10,0L0,5');

    // SSO arrow for authentication connections (purple)
    defs.append('marker')
      .attr('id', 'arrow-sso')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#9333ea')  // Purple for SSO
      .attr('d', 'M0,-5L10,0L0,5');

    // Observability arrow for monitoring connections (orange)
    defs.append('marker')
      .attr('id', 'arrow-observe')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#ef7322')  // Orange for Observability
      .attr('d', 'M0,-5L10,0L0,5');

    // Backup arrow for backup/replication connections (green)
    defs.append('marker')
      .attr('id', 'arrow-backup')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#10b981')  // Green for Backup
      .attr('d', 'M0,-5L10,0L0,5');

    /**
     * LEARNING: D3 Force Simulation
     *
     * A force simulation positions nodes using physics-based rules.
     * Think of it like magnets and springs:
     * - Nodes repel each other (charge force)
     * - Links try to maintain a certain distance (link force)
     * - Everything gets pulled toward the center (center force)
     * - Nodes can't overlap (collision force)
     *
     * The simulation runs iteratively, gradually moving nodes to stable positions.
     *
     * NEW: Added category clustering to group standalone nodes by their category
     * This keeps unconnected apps from spreading too far apart
     */

    // Start with category-filtered nodes
    let visibleNodes = selectedCategories.size === 0 
      ? nodes 
      : nodes.filter(node => selectedCategories.has(node.category));

    // Filter links based on showSSO, showObservability, and showBackup toggles (must be done before simulation)
    let filteredLinks = links;
    if (!showSSO) {
      filteredLinks = filteredLinks.filter(l => l.type !== 'sso');
    }
    if (!showObservability) {
      filteredLinks = filteredLinks.filter(l => l.type !== 'observe');
    }
    if (!showBackup) {
      filteredLinks = filteredLinks.filter(l => l.type !== 'backup');
    }
    // Always filter out ISP connections from graph (they'll still show in detail card)
    console.log('Before ISP filter:', filteredLinks.length, 'links');
    console.log('ISP connections to filter:', filteredLinks.filter(l => l.isISPConnection === true).length);
    filteredLinks = filteredLinks.filter(l => l.isISPConnection !== true);
    console.log('After ISP filter:', filteredLinks.length, 'links');

    // Filter nodes based on showAI and showDNS toggles
    if (!showAI) {
      visibleNodes = visibleNodes.filter(n => !n.aiLayer);
    }
    if (!showDNS) {
      visibleNodes = visibleNodes.filter(n => !n.dnsLayer);
    }

    // Filter nodes by selected cloud provider
    if (selectedCloudProvider !== 'all') {
      visibleNodes = visibleNodes.filter(n => {
        if (!n.cloudProvider || n.cloudProvider === '') return false;
        // Check if the node's cloud provider list includes the selected provider
        const providers = n.cloudProvider.split(',').map(p => p.trim());
        return providers.includes(selectedCloudProvider);
      });
    }

    // Filter links to only show connections between visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const filteredLinksWithLayers = filteredLinks.filter(l => {
      const sourceId = l.source.id || l.source;
      const targetId = l.target.id || l.target;
      
      // Only show link if both source and target are visible
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    // Identify standalone nodes (nodes with no connections)
    const connectedNodeIds = new Set();
    filteredLinksWithLayers.forEach(link => {
      connectedNodeIds.add(link.source.id || link.source);
      connectedNodeIds.add(link.target.id || link.target);
    });

    // Create category positions for clustering standalone nodes
    const categoryPositions = {
      'Main Line': { x: width / 2, y: height / 3 },
      'Fundraising': { x: width / 4, y: height / 2 },
      'Collaboration': { x: 3 * width / 4, y: height / 2 },
      'Infrastructure': { x: width / 2, y: 2 * height / 3 },
      'Data': { x: 3 * width / 4, y: height / 3 },
      'Authentication': { x: width / 2, y: height / 2 },
      'Training': { x: width / 4, y: height / 3 },
      'DevOps': { x: width / 4, y: 2 * height / 3 },
      'TechOps': { x: 3 * width / 4, y: 2 * height / 3 },
      'Observability': { x: width / 6, y: height / 2 },
      'Cold Storage': { x: 5 * width / 6, y: height / 2 },
      'Automation': { x: width / 2, y: height / 6 },
      'MarComm': { x: width / 6, y: height / 3 },
      'Payroll, Finance & Accounting': { x: 5 * width / 6, y: height / 3 },
      'Experiential Learning': { x: width / 2, y: 5 * height / 6 },
    };

    const simulation = d3.forceSimulation(visibleNodes)
      .force('link', d3.forceLink(filteredLinksWithLayers)
        .id(d => d.id)
        .distance(250))  // Increased from 150 to 250 for more spacing
      .force('charge', d3.forceManyBody()
        .strength(d => connectedNodeIds.has(d.id) ? -800 : -300))  // Increased repulsion for more spacing
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(80))  // Increased from 50 to 80 for buffer around nodes
      // Category clustering: pull standalone nodes toward their category position
      .force('category', d3.forceX(d => {
        if (!connectedNodeIds.has(d.id)) {
          return categoryPositions[d.category]?.x || width / 2;
        }
        return width / 2;
      }).strength(d => connectedNodeIds.has(d.id) ? 0.05 : 0.3))
      .force('categoryY', d3.forceY(d => {
        if (!connectedNodeIds.has(d.id)) {
          return categoryPositions[d.category]?.y || height / 2;
        }
        return height / 2;
      }).strength(d => connectedNodeIds.has(d.id) ? 0.05 : 0.3));

    // Store simulation in ref so we can access it outside useEffect
    simulationRef.current = simulation;

    /**
     * LEARNING: D3 Data Join Pattern
     *
     * D3 works by binding data to DOM elements:
     * 1. Select elements (or select empty if they don't exist yet)
     * 2. Bind data with .data()
     * 3. Use .join() to create/update/remove elements to match data
     *
     * This pattern keeps the DOM in sync with your data array.
     */

    // Helper function to check if a link involves an AI node
    const isAILink = (link) => {
      const sourceNode = visibleNodes.find(n => n.id === (link.source.id || link.source));
      const targetNode = visibleNodes.find(n => n.id === (link.target.id || link.target));
      return sourceNode?.aiLayer || targetNode?.aiLayer;
    };

    // Helper function to check if a link involves a DNS node
    const isDNSLink = (link) => {
      const sourceNode = visibleNodes.find(n => n.id === (link.source.id || link.source));
      const targetNode = visibleNodes.find(n => n.id === (link.target.id || link.target));
      return sourceNode?.dnsLayer || targetNode?.dnsLayer;
    };

    // Create lines for connections with different styles for data vs SSO, AI, and DNS
    // Note: Using 'g' (zoomable group) instead of 'svg' so links zoom with the graph
    const link = g.append('g')
      .selectAll('line')
      .data(filteredLinksWithLayers)
      .join('line')
      .attr('stroke', d => {
        if (isAILink(d)) return '#f79d1e';  // Yellow/gold for AI connections
        if (isDNSLink(d)) return '#0b6180';  // Ocean Mist blue for DNS connections
        if (d.type === 'observe') return '#ef7322';  // Orange for Observability
        if (d.type === 'backup') return '#10b981';  // Green for Backup
        return d.type === 'sso' ? '#9333ea' : '#94a3b8';  // Purple for SSO, gray for data
      })
      .attr('stroke-width', d => (isAILink(d) || isDNSLink(d)) ? 3 : 2)  // Thicker lines for AI and DNS
      .attr('stroke-opacity', d => (isAILink(d) || isDNSLink(d)) ? 0.7 : (d.type === 'sso' || d.type === 'observe' || d.type === 'backup' ? 0.5 : 0.6))
      .attr('stroke-dasharray', d => {
        if (d.type === 'sso' || d.type === 'observe' || d.type === 'backup') return '5,5';  // Dashed for SSO, Observability, and Backup
        return null;  // Solid for data
      })
      .attr('marker-end', d => {
        if (d.type === 'sso') return 'url(#arrow-sso)';
        if (d.type === 'observe') return 'url(#arrow-observe)';
        if (d.type === 'backup') return 'url(#arrow-backup)';
        return 'url(#arrow-data)';
      })
      .attr('class', d => `link-${d.type}`)  // Add class for easier selection
      .style('filter', d => {
        if (isAILink(d)) return 'drop-shadow(0 0 4px #f79d1e)';  // Yellow glow for AI links
        if (isDNSLink(d)) return 'drop-shadow(0 0 4px #0b6180)';  // Blue glow for DNS links
        return null;
      });

    // Create groups for each node (contains circle + text)
    // Note: Using 'g' (zoomable group) instead of 'svg' so nodes zoom with the graph
    const node = g.append('g')
      .selectAll('g')
      .data(visibleNodes)
      .join('g')
      .call(d3.drag()  // Make nodes draggable
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .style('cursor', 'pointer');

    // Add circles to each node group
    node.append('circle')
      .attr('r', 20)  // Radius
      .attr('fill', d => categoryColors[d.category] || '#64748b')  // Color by category
      .attr('stroke', d => {
        // Security class indicator via border color
        if (d.securityClass === 'primary') return '#10b981'; // Green for primary
        if (d.securityClass === 'secondary') return '#f59e0b'; // Amber for secondary
        if (d.securityClass === 'backup') return '#ef4444'; // Red for backup
        return '#fff'; // White default
      })
      .attr('stroke-width', d => d.securityClass ? 4 : 3) // Thicker border for classified nodes
      .style('filter', d => d.aiLayer ? 'drop-shadow(0 0 8px #f79d1e)' : null);  // Glow effect for AI nodes

    // Add center icons for special layers (DNS 🌐, AI 💡, Zero Trust 🛡️)
    // - Keep the circle color by category
    // - Overlay emoji icon(s) centered inside the node
    // - If multiple layers exist, show them side-by-side
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em') // vertically center text in circle
      .attr('pointer-events', 'none') // allow clicks to pass through to node
      .attr('font-size', '14px')
      .text(d => {
        const icons = [];
        if (d.dnsLayer) icons.push('🌐');
        if (d.aiLayer) icons.push('💡');
        if (d.zeroTrust) icons.push('🛡️');
        return icons.join(' ');
      });

    // Add text labels to each node group with wrapping
    node.each(function(d) {
      const text = d3.select(this).append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', darkMode ? '#f3f4f6' : '#002a42');

      // Wrap text function - splits long names into multiple lines
      const words = d.name.split(/\s+/);
      const lineHeight = 14; // pixels
      const maxWidth = 100; // max width before wrapping
      let line = [];
      let lineNumber = 0;
      let tspan = text.append('tspan')
        .attr('x', 0)
        .attr('dy', 35); // First line offset below circle

      words.forEach((word) => {
        line.push(word);
        tspan.text(line.join(' '));

        // Check if line is too long
        if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
          // Remove last word and start new line
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          lineNumber++;
          tspan = text.append('tspan')
            .attr('x', 0)
            .attr('dy', lineHeight)
            .text(word);
        }
      });
    });

    /**
     * NEW FEATURE: Platform Badges
     *
     * Show a small badge above nodes that are part of a platform suite
     * (e.g., Microsoft 365, Salesforce ecosystem, Cloudflare)
     */
    node.filter(d => d.platform)  // Only for nodes with a platform
      .append('rect')
      .attr('x', -20)
      .attr('y', -35)
      .attr('width', 40)
      .attr('height', 14)
      .attr('rx', 7)  // Rounded corners
      .attr('fill', '#f3f4f6')
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1);

    node.filter(d => d.platform)
      .append('text')
      .text(d => {
        // Abbreviate platform names for the badge
        const platformNames = {
          'm365': 'M365',
          'microsoft-365': 'M365',
          'salesforce': 'SF',
          'cloudflare': 'CF'
        };
        return platformNames[d.platform] || d.platform.toUpperCase().slice(0, 4);
      })
      .attr('text-anchor', 'middle')
      .attr('dy', -24)  // Position inside the badge
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', '#6b7280');

    /**
     * LEARNING: Event Handlers in D3
     *
     * D3 can attach event listeners to elements.
     * The handler receives (event, data) as parameters.
     *
     * Here we connect D3 events to React state updates.
     * This is the bridge between D3 (DOM manipulation) and React (state management).
     *
     * NEW: Click now TOGGLES selection and keeps highlighting persistent
     */
    node.on('click', (event, d) => {
      event.stopPropagation();  // Prevent event from bubbling up

      // Toggle selection: if clicking the same node, deselect it
      if (selectedNodeRef.current && selectedNodeRef.current.id === d.id) {
        setSelectedNode(null);
        resetHighlight();
      } else {
        setSelectedNode(d);       // Update React state -> triggers re-render
        highlightConnections(d.id);  // Highlight and keep it highlighted
      }
    })
    .on('mouseenter', (event, d) => {
      // Only highlight on hover if nothing is selected
      if (!selectedNodeRef.current) {
        setHoveredNode(d.id);
        highlightConnections(d.id);
      }
    })
    .on('mouseleave', () => {
      // Only reset on mouseleave if nothing is selected
      if (!selectedNodeRef.current) {
        setHoveredNode(null);
        resetHighlight();
      }
    });

    /**
     * Highlights the hovered node and all connected nodes/links
     */
    function highlightConnections(nodeId) {
      const connectedNodes = new Set();
      connectedNodes.add(nodeId);

      // Find all nodes connected to this one
      links.forEach(link => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;

        if (sourceId === nodeId) connectedNodes.add(targetId);
        if (targetId === nodeId) connectedNodes.add(sourceId);
      });

      // Dim non-connected nodes
      node.style('opacity', d => connectedNodes.has(d.id) ? 1 : 0.2);

      // Highlight connected links
      link.style('opacity', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return (sourceId === nodeId || targetId === nodeId) ? 1 : 0.1;
      })
      .attr('stroke-width', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return (sourceId === nodeId || targetId === nodeId) ? 3 : 2;
      });
      // Note: We don't change stroke color to preserve SSO (purple) vs data (gray) distinction
    }

    /**
     * Resets highlighting back to default
     */
    function resetHighlight() {
      node.style('opacity', 1);
      link.style('opacity', d => d.type === 'sso' ? 0.5 : 0.6)  // Restore original opacity
        .attr('stroke-width', 2);
      // Note: Stroke color is preserved (SSO stays purple, data stays gray)
    }

    /**
     * LEARNING: Simulation Tick
     *
     * The simulation runs iteratively. Each iteration is called a "tick".
     * On each tick, node positions are updated by the forces.
     * We need to update the visual positions to match.
     */
    simulation.on('tick', () => {
      // Update link positions
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      // Update node positions
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    /**
     * LEARNING: Drag Handlers
     *
     * D3 provides drag behavior that we attach to nodes.
     * These functions control what happens during drag.
     *
     * Setting fx/fy "fixes" a node's position, overriding the forces.
     * Clearing them (set to null) lets the simulation take over again.
     */
    function dragstarted(event) {
      // Restart the simulation if it had cooled down
      if (!event.active) simulation.alphaTarget(0.3).restart();

      // Fix this node's position
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      // Update the fixed position as we drag
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      // Let the simulation cool down
      if (!event.active) simulation.alphaTarget(0);

      // Unfix the node so forces can move it again
      event.subject.fx = null;
      event.subject.fy = null;
    }

    /**
     * LEARNING: Cleanup Function
     *
     * When a component unmounts (is removed from the page),
     * we should clean up any resources.
     *
     * Returning a function from useEffect makes it a cleanup function.
     * React will call it when the component unmounts.
     */
    return () => {
      simulation.stop();
    };
  }, [nodes, links, showSSO, showObservability, showBackup, showAI, showDNS, selectedCloudProvider, darkMode, selectedCategories]); // Re-run when data or filters change

  /**
   * Helper function to find all apps connected to a given node
   */
  const getConnectedApps = (nodeId) => {
    const connections = { incoming: [], outgoing: [] };

    links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;

      if (sourceId === nodeId) {
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode) connections.outgoing.push(targetNode.name);
      }

      if (targetId === nodeId) {
        const sourceNode = nodes.find(n => n.id === sourceId);
        if (sourceNode) connections.incoming.push(sourceNode.name);
      }
    });

    return connections;
  };

  /**
   * Calculate complexity score for an application
   *
   * Factors:
   * - Number of connections (base score)
   * - Multi-cloud strategy (+2)
   * - Services agreement (+2)
   * - SCIM provisioning (+1)
   * - Primary security class (+1)
   * - AI or Zero Trust features (+1)
   */
  const calculateComplexity = (node) => {
    // Base score: count connections
    const connections = getConnectedApps(node.id);
    let score = connections.incoming.length + connections.outgoing.length;

    // Multi-cloud: check if cloudProvider contains multiple providers
    if (node.cloudProvider && node.cloudProvider.includes(',')) {
      score += 2;
    }

    // Services agreement
    if (node.servicesAgreement) {
      score += 2;
    }

    // SCIM provisioning
    if (node.ssoScim) {
      score += 1;
    }

    // Primary security class (mission-critical)
    if (node.securityClass === 'primary') {
      score += 1;
    }

    // AI or Zero Trust features
    if (node.aiLayer || node.zeroTrust) {
      score += 1;
    }

    // Determine complexity level
    let level, color, emoji;
    if (score <= 5) {
      level = 'Low Complexity';
      color = '#10b981'; // Green
      emoji = '🟢';
    } else if (score <= 9) {
      level = 'Moderate Complexity';
      color = '#f59e0b'; // Amber
      emoji = '🟡';
    } else if (score <= 15) {
      level = 'High Complexity';
      color = '#ef7322'; // Orange
      emoji = '🟠';
    } else {
      level = 'Critical Complexity';
      color = '#ef4444'; // Red
      emoji = '🔴';
    }

    return { score, level, color, emoji };
  };

  /**
   * State for table view
   */
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  /**
   * Filter and sort nodes for table view
   */
  const filteredAndSortedNodes = React.useMemo(() => {
    // Filter by selected categories first
    let filtered = selectedCategories.size === 0
      ? nodes
      : nodes.filter(node => selectedCategories.has(node.category));

    // Filter out DNS-layer items from table view
    filtered = filtered.filter(node => !node.dnsLayer);

    // Then filter by search term - search across ALL fields
    filtered = filtered.filter(node => {
      const searchLower = searchTerm.toLowerCase();

      // Helper function to safely check if a value contains the search term
      const includes = (value) => {
        if (!value) return false;
        return String(value).toLowerCase().includes(searchLower);
      };

      return (
        // Basic fields
        includes(node.name) ||
        includes(node.category) ||
        includes(node.description) ||
        includes(node.tech) ||
        includes(node.owner) ||
        includes(node.cloudProvider) ||
        includes(node.platform) ||

        // Admin fields
        includes(node.primaryAdmin) ||
        includes(node.secondaryAdmin) ||

        // Vendor/procurement fields
        includes(node.thirdPartyProvider) ||
        includes(node.purchaseVendor) ||
        includes(node.contractItem) ||

        // SSO fields
        includes(node.ssoProvider) ||
        includes(node.ssoProtocol) ||
        includes(node.ssoGroup) ||

        // Security fields
        includes(node.securityClass) ||
        includes(node.ispClass) ||

        // Status/metadata
        includes(node.updated) ||

        // Boolean flags (convert to searchable text)
        (node.aiLayer && 'ai'.includes(searchLower)) ||
        (node.dnsLayer && 'dns'.includes(searchLower)) ||
        (node.zeroTrust && 'zero trust'.includes(searchLower)) ||
        (node.allTeam && 'all team'.includes(searchLower)) ||
        (node.servicesAgreement && 'services agreement'.includes(searchLower)) ||
        (node.observed && 'observed'.includes(searchLower)) ||
        (node.nhqOnly && 'nhq only'.includes(searchLower)) ||
        (node.openInternet && 'open internet'.includes(searchLower)) ||
        (node.ssoScim && 'scim'.includes(searchLower))
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null values
      if (!aValue) aValue = '';
      if (!bValue) bValue = '';

      // Convert to strings for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchTerm, sortConfig, selectedCategories]);

  /**
   * Handle sort column click
   */
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  /**
   * LEARNING: JSX (JavaScript XML)
   *
   * Everything below is JSX - it looks like HTML but it's actually JavaScript.
   * React converts JSX into actual DOM elements.
   *
   * Key differences from HTML:
   * - Use className instead of class (class is a JS keyword)
   * - Use camelCase for attributes (onClick not onclick)
   * - Embed JavaScript expressions with {}
   * - Self-closing tags must have the / (like <img />)
   *
   * JSX gets compiled to: React.createElement('div', { className: '...' }, children)
   */
  return (
    <div
      ref={containerRef}
      className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-white to-orange-50'
      }`}>
      {/* First-Time User Tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        stepIndex={tourStepIndex}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#ef7322', // Hope Ignites Orange
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            textColor: '#002a42',
          },
          buttonNext: {
            backgroundColor: '#ef7322',
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '6px',
          },
          buttonBack: {
            color: '#6b7280',
            fontSize: '14px',
            marginRight: '8px',
          },
          buttonSkip: {
            color: '#6b7280',
            fontSize: '14px',
          },
          tooltip: {
            borderRadius: '8px',
            padding: '16px',
          },
          tooltipContent: {
            padding: '8px 0',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Got it!',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header Section with View Mode Switcher */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-start gap-4">
          <div className="w-full md:w-auto">
            {/* Logo */}
            <img
              src={darkMode ? logoDarkSrc : logoSrc}
              alt={`${orgName} Logo`}
              className="mb-3 md:mb-4 h-12 md:h-16 w-auto object-contain"
              style={{ maxWidth: '250px' }}
            />

            {/* Tab Navigation */}
            <div className="flex space-x-6 mb-4">
              <button
                onClick={() => setActiveTab('applications')}
                className={`pb-2 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'applications'
                    ? darkMode
                      ? 'border-indigo-400 text-indigo-400'
                      : 'border-indigo-600 text-indigo-600'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`pb-2 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'security'
                    ? darkMode
                      ? 'border-purple-400 text-purple-400'
                      : 'border-purple-600 text-purple-600'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Network & Endpoints
              </button>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold mb-2" style={{ color: darkMode ? '#f3f4f6' : '#002a42' }}>
              {tabName} Ecosystem
            </h1>
            <p className="text-sm md:text-base" style={{ color: darkMode ? '#9ca3af' : '#0b6180' }}>
              {viewMode === 'graph' ? 'Click applications to lock selection • Scroll to zoom • Drag to pan' : 'Searchable table view'}
            </p>
          </div>

          {/* Right side controls */}
          <div className="flex flex-row md:flex-row gap-2 md:gap-3 items-start w-full md:w-auto justify-between md:justify-start">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#f3f4f6' : '#002a42'
              }}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Documentation Button */}
            <button
              onClick={openDocs}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#f3f4f6' : '#002a42'
              }}
              title="View Documentation"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>

            {/* Restart Tour Button */}
            <button
              onClick={restartTour}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#f3f4f6' : '#002a42'
              }}
              title="Restart Interactive Tour"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#f3f4f6' : '#002a42'
              }}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* View Mode Switcher */}
            <div className="flex gap-1 md:gap-2 rounded-lg shadow-md p-1 flex-1 md:flex-initial" style={{ backgroundColor: darkMode ? '#f79d1e' : 'white' }}>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors flex-1 md:flex-initial justify-center ${
                viewMode === 'graph'
                  ? 'text-white'
                  : darkMode ? 'text-white hover:bg-gray-700 active:bg-gray-600' : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
              style={viewMode === 'graph' ? { backgroundColor: '#0b6180' } : {}}
              title="Force-directed graph view"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-sm md:text-base">Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 md:px-4 py-2 rounded flex items-center gap-1 md:gap-2 transition-colors flex-1 md:flex-initial justify-center ${
                viewMode === 'table'
                  ? 'text-white'
                  : darkMode ? 'text-white hover:bg-gray-700 active:bg-gray-600' : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
              style={viewMode === 'table' ? { backgroundColor: '#002a42' } : {}}
              title="Table view with search and sort"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm md:text-base">Table</span>
            </button>
          </div>
          </div>
        </div>

        {/* Submit Feedback Badge - Peeks from left on desktop, bottom on mobile */}
        <a
          href="https://forms.monday.com/forms/b641de335307cdd5f9b5713b8f9e4c8c?r=use1"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed left-0 md:left-0 bottom-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex items-center gap-2 px-4 py-3 rounded-r-lg md:rounded-r-lg rounded-l-lg md:rounded-l-none shadow-lg z-50 transition-all duration-300 ease-in-out"
          style={{
            backgroundColor: '#0b6180',
            color: 'white',
          }}
          onMouseEnter={(e) => {
            if (window.innerWidth >= 768) {
              e.currentTarget.style.transform = 'translateX(0) translateY(-50%)';
            }
          }}
          onMouseLeave={(e) => {
            if (window.innerWidth >= 768) {
              e.currentTarget.style.transform = 'translateX(-140px) translateY(-50%)';
            }
          }}
          title="Submit Feedback"
        >
          <span className="font-medium whitespace-nowrap text-sm md:text-base">Submit Feedback</span>
          <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </a>

        {/* Add CSS for desktop hover effect via inline style tag */}
        <style>{`
          @media (min-width: 768px) {
            a[title="Submit Feedback"] {
              transform: translateX(-140px) translateY(-50%);
            }
          }
        `}</style>

        {/* Main Content: Conditional rendering based on view mode */}
        {viewMode === 'graph' ? (
          /* Graph View */
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            {/* Graph Container with Zoom Controls */}
            <div className="ecosystem-svg-container flex-1 rounded-lg shadow-lg p-3 md:p-6 relative min-h-[400px] md:min-h-[600px]" style={{ backgroundColor: darkMode ? '#1f2937' : 'white' }}>
            {/* Layers & Filters Menu - Top Left */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10">
              {/* Menu Toggle Button */}
              <button
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                className="border-2 rounded-lg px-3 md:px-4 py-2 shadow-lg flex items-center gap-2 transition-all hover:shadow-xl"
                style={{
                  borderColor: darkMode ? '#374151' : '#d1d5db',
                  backgroundColor: darkMode ? '#1f2937' : 'white',
                  color: darkMode ? '#f3f4f6' : '#002a42'
                }}
                title="Toggle layers and filters menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-sm font-medium">
                  Layers & Filters
                  {(() => {
                    const activeCount = [showSSO, showObservability, showAI, showDNS, showBackup, selectedCloudProvider !== 'all'].filter(Boolean).length;
                    return activeCount > 0 ? ` (${activeCount})` : '';
                  })()}
                </span>
                <svg
                  className="w-4 h-4 transition-transform"
                  style={{ transform: isLayersMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isLayersMenuOpen && (
                <div
                  className="mt-2 rounded-lg shadow-2xl border-2 overflow-hidden"
                  style={{
                    borderColor: darkMode ? '#374151' : '#d1d5db',
                    backgroundColor: darkMode ? '#1f2937' : 'white',
                    minWidth: '280px',
                    maxWidth: '320px'
                  }}
                >
                  {/* Connection Layers Section */}
                  <div className="p-3 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Connection Layers
                    </h3>

                    {/* SSO Toggle */}
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors mb-2" style={{ backgroundColor: showSSO ? (darkMode ? '#581c87' : '#f3e8ff') : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={showSSO}
                        onChange={() => setShowSSO(!showSSO)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#9333ea' }}
                      />
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9333ea' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-sm flex-1" style={{ color: darkMode ? '#f3f4f6' : '#1f2937' }}>SSO Connections</span>
                    </label>

                    {/* Observability Toggle */}
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors mb-2" style={{ backgroundColor: showObservability ? (darkMode ? '#7c2d12' : '#fff7ed') : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={showObservability}
                        onChange={() => setShowObservability(!showObservability)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#ef7322' }}
                      />
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#ef7322' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-sm flex-1" style={{ color: darkMode ? '#f3f4f6' : '#1f2937' }}>Observability</span>
                    </label>

                    {/* Backup Toggle */}
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors" style={{ backgroundColor: showBackup ? (darkMode ? '#065f46' : '#d1fae5') : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={showBackup}
                        onChange={() => setShowBackup(!showBackup)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="text-sm flex-1" style={{ color: darkMode ? '#f3f4f6' : '#1f2937' }}>Backup Systems</span>
                    </label>
                  </div>

                  {/* Application Layers Section */}
                  <div className="p-3 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Application Layers
                    </h3>

                    {/* AI Layer Toggle */}
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors mb-2" style={{ backgroundColor: showAI ? (darkMode ? '#78350f' : '#fef3c7') : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={showAI}
                        onChange={() => setShowAI(!showAI)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#f79d1e' }}
                      />
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#f79d1e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-sm flex-1" style={{ color: darkMode ? '#f3f4f6' : '#1f2937' }}>AI Applications</span>
                    </label>

                    {/* DNS Layer Toggle */}
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors" style={{ backgroundColor: showDNS ? (darkMode ? '#164e63' : '#cfe9f3') : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={showDNS}
                        onChange={() => setShowDNS(!showDNS)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#0b6180' }}
                      />
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#0b6180' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="text-sm flex-1" style={{ color: darkMode ? '#f3f4f6' : '#1f2937' }}>DNS Layer</span>
                    </label>
                  </div>

                  {/* Cloud Provider Filter Section */}
                  <div className="p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Cloud Provider
                    </h3>
                    <select
                      value={selectedCloudProvider}
                      onChange={(e) => setSelectedCloudProvider(e.target.value)}
                      className="w-full border-2 rounded-lg px-3 py-2 text-sm transition-colors"
                      style={{
                        borderColor: selectedCloudProvider !== 'all' ? '#FF9900' : (darkMode ? '#374151' : '#d1d5db'),
                        backgroundColor: selectedCloudProvider !== 'all' ? '#fff4e6' : (darkMode ? '#111827' : '#f9fafb'),
                        color: selectedCloudProvider !== 'all' ? '#FF9900' : (darkMode ? '#f3f4f6' : '#002a42')
                      }}
                    >
                      <option value="all">All Providers</option>
                      {(() => {
                        const providers = new Set();
                        nodes.forEach(node => {
                          if (node.cloudProvider && node.cloudProvider !== '') {
                            node.cloudProvider.split(',').forEach(p => {
                              const provider = p.trim();
                              if (provider) providers.add(provider);
                            });
                          }
                        });
                        return Array.from(providers).sort().map(provider => (
                          <option key={provider} value={provider}>{provider}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-1 md:gap-2 z-10">
              <button
                onClick={() => {
                  if (zoomRef.current && svgRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
                  }
                }}
                className="border-2 rounded p-1.5 md:p-2 shadow-md transition-colors"
                style={{
                  backgroundColor: darkMode ? '#1f2937' : 'white',
                  borderColor: darkMode ? '#374151' : '#d1d5db',
                  color: darkMode ? '#f3f4f6' : '#000'
                }}
                title="Zoom In"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (zoomRef.current && svgRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
                  }
                }}
                className="border-2 rounded p-1.5 md:p-2 shadow-md transition-colors"
                style={{
                  backgroundColor: darkMode ? '#1f2937' : 'white',
                  borderColor: darkMode ? '#374151' : '#d1d5db',
                  color: darkMode ? '#f3f4f6' : '#000'
                }}
                title="Zoom Out"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (zoomRef.current && svgRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().duration(500).call(
                      zoomRef.current.transform,
                      d3.zoomIdentity
                    );
                  }
                }}
                className="border-2 rounded p-1.5 md:p-2 shadow-md transition-colors"
                style={{
                  backgroundColor: darkMode ? '#1f2937' : 'white',
                  borderColor: darkMode ? '#374151' : '#d1d5db',
                  color: darkMode ? '#f3f4f6' : '#000'
                }}
                title="Reset View"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/*
              LEARNING: ref attribute
              This connects the useRef hook to this actual DOM element.
              Now svgRef.current will point to this <svg> element.
            */}
            <svg ref={svgRef} className="ecosystem-svg w-full"></svg>
          </div>

          {/*
            LEARNING: Conditional Rendering
            {condition && <JSX>} means: only render the JSX if condition is true
            This is JavaScript's && operator used for conditional rendering
          */}
          {selectedNode && (
            <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 md:p-6 space-y-3 md:space-y-4 mt-4 lg:mt-0" style={{ borderTop: '4px solid #ef7322' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categoryColors[selectedNode.category] }}
                    />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#0b6180' }}>
                      {selectedNode.category}
                    </span>
                    {selectedNode.aiLayer && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#fef3c7', color: '#f79d1e' }}
                        title="AI-Powered Application"
                      >
                        AI
                      </span>
                    )}
                    {selectedNode.securityClass && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: selectedNode.securityClass === 'primary' ? '#d1fae5' :
                                         selectedNode.securityClass === 'secondary' ? '#fef3c7' : '#fee2e2',
                          color: selectedNode.securityClass === 'primary' ? '#10b981' :
                                 selectedNode.securityClass === 'secondary' ? '#f59e0b' : '#ef4444'
                        }}
                        title={`Security Class: ${selectedNode.securityClass}`}
                      >
                        {selectedNode.securityClass}
                      </span>
                    )}
                    {selectedNode.zeroTrust && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                        title="Zero Trust Security Enabled"
                      >
                        🛡️ Zero Trust
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold" style={{ color: '#002a42' }}>
                    {selectedNode.name}
                  </h2>
                  {/* Complexity Score Badge */}
                  <div className="mt-2">
                    {(() => {
                      const complexity = calculateComplexity(selectedNode);
                      return (
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1"
                          style={{
                            backgroundColor: complexity.color + '20', // 20% opacity
                            color: complexity.color,
                            border: `1.5px solid ${complexity.color}`
                          }}
                          title={`Complexity Score: ${complexity.score}`}
                        >
                          {complexity.emoji} {complexity.level}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="hover:opacity-70"
                  style={{ color: '#0b6180' }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Application Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Description</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Technology</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.tech}</p>
                </div>

                {selectedNode.cloudProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Cloud Provider(s)</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>
                      {selectedNode.cloudProvider}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Owner</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.owner}</p>
                </div>

                {/* ISP Connections - Show ISP connections that are hidden from graph */}
                {(() => {
                  const ispConnections = links.filter(l =>
                    l.isISPConnection &&
                    (l.source === selectedNode.id || l.target === selectedNode.id ||
                     l.source.id === selectedNode.id || l.target.id === selectedNode.id)
                  );

                  if (ispConnections.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: '#002a42' }}>
                          Internet Service Providers
                        </h3>
                        <div className="space-y-1">
                          {ispConnections.map((link, idx) => {
                            const connectedId = (link.source === selectedNode.id || link.source.id === selectedNode.id)
                              ? (link.target.id || link.target)
                              : (link.source.id || link.source);
                            const connectedNode = nodes.find(n => n.id === connectedId);

                            if (!connectedNode) return null;

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded text-sm"
                                style={{ backgroundColor: '#f3f4f6', color: '#0b6180' }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: connectedNode.securityClass === 'primary' ? '#10b981' :
                                                   connectedNode.securityClass === 'secondary' ? '#f59e0b' : '#6b7280'
                                  }}
                                  title={connectedNode.securityClass ? `${connectedNode.securityClass} ISP` : 'ISP'}
                                />
                                <span className="font-medium">{connectedNode.name}</span>
                                {connectedNode.securityClass && (
                                  <span className="text-xs uppercase font-semibold ml-auto">
                                    {connectedNode.securityClass}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedNode.primaryAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Primary Admin</h3>
                    {(() => {
                      const contact = getAdminContact(selectedNode.primaryAdmin);
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium" style={{ color: '#0b6180' }}>
                            {selectedNode.primaryAdmin}
                          </p>
                          {contact && (
                            <div className="flex gap-2">
                              <a
                                href={getMailtoUrl(contact.email)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                style={{ backgroundColor: '#0b6180', color: 'white' }}
                                title={`Email ${selectedNode.primaryAdmin}`}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                              </a>
                              <a
                                href={getTeamsChatUrl(contact.teamsId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                style={{ backgroundColor: '#6264a7', color: 'white' }}
                                title={`Teams chat with ${selectedNode.primaryAdmin}`}
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.625 8.25h-7.5v7.5h7.5v-7.5zm-9.375 7.5H3.375V8.25h7.875v7.5zm9.375-9.375h-7.5V3.375c0-.621-.504-1.125-1.125-1.125H3.375C2.754 2.25 2.25 2.754 2.25 3.375v10.125c0 .621.504 1.125 1.125 1.125h7.875v2.25H3.375c-.621 0-1.125.504-1.125 1.125v2.625c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125z"/>
                                </svg>
                                Teams
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.secondaryAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Secondary Admin{selectedNode.secondaryAdmin.includes(',') ? 's' : ''}</h3>
                    {(() => {
                      // Split by comma and trim whitespace to handle multiple admins
                      const adminNames = selectedNode.secondaryAdmin.split(',').map(name => name.trim());

                      return (
                        <div className="space-y-3">
                          {adminNames.map((adminName, index) => {
                            const contact = getAdminContact(adminName);
                            return (
                              <div key={index} className="space-y-2">
                                <p className="text-sm font-medium" style={{ color: '#0b6180' }}>
                                  {adminName}
                                </p>
                                {contact && (
                                  <div className="flex gap-2">
                                    <a
                                      href={getMailtoUrl(contact.email)}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                      style={{ backgroundColor: '#0b6180', color: 'white' }}
                                      title={`Email ${adminName}`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      Email
                                    </a>
                                    <a
                                      href={getTeamsChatUrl(contact.teamsId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                      style={{ backgroundColor: '#6264a7', color: 'white' }}
                                      title={`Teams chat with ${adminName}`}
                                    >
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.625 8.25h-7.5v7.5h7.5v-7.5zm-9.375 7.5H3.375V8.25h7.875v7.5zm9.375-9.375h-7.5V3.375c0-.621-.504-1.125-1.125-1.125H3.375C2.754 2.25 2.25 2.754 2.25 3.375v10.125c0 .621.504 1.125 1.125 1.125h7.875v2.25H3.375c-.621 0-1.125.504-1.125 1.125v2.625c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125z"/>
                                      </svg>
                                      Teams
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.thirdPartyProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Aligned Support Provider</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.thirdPartyProvider}</p>
                  </div>
                )}

                {selectedNode.purchaseVendor && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Purchase Vendor</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.purchaseVendor}</p>
                  </div>
                )}

                {selectedNode.contractItem && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Business & Ops Monday Item</h3>
                    <a
                      href={`https://hopeignites.monday.com/boards/${selectedNode.contractItem}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Link to Monday Item
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {selectedNode.ssoGroup && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Group</h3>
                    <a
                      href={`https://entra.microsoft.com/#view/Microsoft_AAD_IAM/GroupDetailsMenuBlade/~/Overview/groupId/${selectedNode.ssoGroup}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Open in Entra ID
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {selectedNode.link && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Link</h3>
                    <a
                      href={selectedNode.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Open Application
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Vendor Status Page */}
                {selectedNode.status && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Vendor Status Page</h3>
                    <a
                      href={selectedNode.status}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Status
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* SSO Information */}
                {selectedNode.ssoProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Provider</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.ssoProvider}</p>
                  </div>
                )}

                {selectedNode.ssoProtocol && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Protocol</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.ssoProtocol}</p>
                  </div>
                )}

                {/* Boolean Checkboxes */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.ssoScim}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>SSO SCIM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.allTeam}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>All Team</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.servicesAgreement}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>Services Agreement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.observed}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>Observed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.nhqOnly}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>NHQ Only</span>
                  </div>
                </div>

                {/* Open Internet - Special Badge */}
                {selectedNode.openInternet && (
                  <div className="flex items-center gap-2 pt-2 px-3 py-2 rounded" style={{ backgroundColor: '#f3f4f6' }}>
                    <svg className="w-5 h-5" style={{ color: '#0b6180' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#002a42' }}>Available via Web</span>
                  </div>
                )}

                {/*
                  LEARNING: Immediately Invoked Function Expression (IIFE)
                  The () => { ... })() pattern executes a function immediately
                  This is useful for complex logic that returns JSX
                */}
                {(() => {
                  const connections = getConnectedApps(selectedNode.id);
                  return (
                    <>
                      {connections.outgoing.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>
                            Connects To
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {/*
                              LEARNING: .map() for lists
                              Use .map() to transform an array into JSX elements
                              Each element needs a unique 'key' prop (React requirement)
                            */}
                            {connections.outgoing.map((app, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: '#0b6180', color: 'white' }}
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {connections.incoming.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>
                            Connected From
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {connections.incoming.map((app, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: '#ef7322', color: 'white' }}
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Last Updated */}
                {selectedNode.updated && (
                  <div className="pt-3 mt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      Last updated: <span className="font-medium">{selectedNode.updated}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        ) : (
          /* Table View */
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            {/* Table Container */}
            <div className="flex-1 min-w-0 bg-white rounded-lg shadow-lg p-3 md:p-6">
              {/* Search Bar */}
              <div className="mb-4 md:mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 md:py-3 pl-9 md:pl-10 border-2 rounded-lg focus:outline-none focus:border-opacity-50 text-sm md:text-base"
                  style={{ borderColor: '#0b6180' }}
                />
                <svg
                  className="absolute left-3 top-3.5 w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#0b6180"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                {filteredAndSortedNodes.length} of {nodes.length} applications
              </p>
            </div>

            {/* Table - Hidden on mobile, shown on tablets and up */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #0b6180' }}>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Application
                        {sortConfig.key === 'name' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Category
                        {sortConfig.key === 'category' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center gap-2">
                        Description
                        {sortConfig.key === 'description' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('tech')}
                    >
                      <div className="flex items-center gap-2">
                        Technology
                        {sortConfig.key === 'tech' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('cloudProvider')}
                    >
                      <div className="flex items-center gap-2">
                        Cloud Provider
                        {sortConfig.key === 'cloudProvider' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('owner')}
                    >
                      <div className="flex items-center gap-2">
                        Owner
                        {sortConfig.key === 'owner' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                      style={{ color: '#002a42' }}
                      onClick={() => handleSort('primaryAdmin')}
                    >
                      <div className="flex items-center gap-2">
                        Primary Admin
                        {sortConfig.key === 'primaryAdmin' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: '#002a42' }}
                    >
                      Connections
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedNodes.map((node, index) => {
                    const connections = getConnectedApps(node.id);
                    const totalConnections = connections.incoming.length + connections.outgoing.length;

                    return (
                      <tr
                        key={node.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedNode(node)}
                        style={{ borderBottomColor: '#e5e7eb' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: categoryColors[node.category] }}
                            />
                            <span className="font-medium" style={{ color: '#002a42' }}>
                              {node.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: '#0b6180' }}>
                              {node.category}
                            </span>
                            {node.aiLayer && (
                              <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#fef3c7', color: '#f79d1e' }}
                                title="AI-Powered Application"
                              >
                                AI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6b7280' }}>
                            {node.description}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6b7280' }}>
                            {node.tech}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6b7280' }}>
                            {node.cloudProvider || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6b7280' }}>
                            {node.owner}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6b7280' }}>
                            {node.primaryAdmin || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-sm px-2 py-1 rounded"
                            style={{
                              backgroundColor: totalConnections > 0 ? '#0b6180' : '#e5e7eb',
                              color: totalConnections > 0 ? 'white' : '#6b7280'
                            }}
                          >
                            {totalConnections}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* No results message for table */}
              {filteredAndSortedNodes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-lg" style={{ color: '#6b7280' }}>
                    No applications found matching "{searchTerm}"
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Card View - Shown on mobile, hidden on tablets and up */}
            <div className="md:hidden space-y-3">
              {filteredAndSortedNodes.map((node) => {
                const connections = getConnectedApps(node.id);
                const totalConnections = connections.incoming.length + connections.outgoing.length;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="bg-white border-2 rounded-lg p-4 shadow-sm active:shadow-md transition-shadow"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: categoryColors[node.category] }}
                        />
                        <h3 className="font-semibold text-base" style={{ color: '#002a42' }}>
                          {node.name}
                        </h3>
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded ml-2 flex-shrink-0"
                        style={{
                          backgroundColor: totalConnections > 0 ? '#0b6180' : '#e5e7eb',
                          color: totalConnections > 0 ? 'white' : '#6b7280'
                        }}
                      >
                        {totalConnections} conn
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs" style={{ color: '#0b6180' }}>
                        {node.category}
                      </p>
                      {node.aiLayer && (
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#fef3c7', color: '#f79d1e' }}
                          title="AI-Powered Application"
                        >
                          AI
                        </span>
                      )}
                    </div>
                    {node.cloudProvider && (
                      <div className="mb-1">
                        <p className="text-xs" style={{ color: '#0b6180' }}>
                          <span className="font-semibold">Cloud Provider(s):</span> {node.cloudProvider}
                        </p>
                      </div>
                    )}
                    <p className="text-sm line-clamp-2" style={{ color: '#6b7280' }}>
                      {node.description}
                    </p>
                  </div>
                );
              })}

              {/* No results message for mobile cards */}
              {filteredAndSortedNodes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-base" style={{ color: '#6b7280' }}>
                    No applications found matching "{searchTerm}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Node Detail Card - Right Side (Sticky/Floating) */}
          {selectedNode && (
            <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 md:p-6 space-y-3 md:space-y-4 lg:sticky lg:top-8 self-start max-h-[calc(100vh-6rem)] overflow-y-auto mt-4 lg:mt-0" style={{ borderTop: '4px solid #ef7322' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categoryColors[selectedNode.category] }}
                    />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#0b6180' }}>
                      {selectedNode.category}
                    </span>
                    {selectedNode.aiLayer && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#fef3c7', color: '#f79d1e' }}
                        title="AI-Powered Application"
                      >
                        AI
                      </span>
                    )}
                    {selectedNode.securityClass && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: selectedNode.securityClass === 'primary' ? '#d1fae5' :
                                         selectedNode.securityClass === 'secondary' ? '#fef3c7' : '#fee2e2',
                          color: selectedNode.securityClass === 'primary' ? '#10b981' :
                                 selectedNode.securityClass === 'secondary' ? '#f59e0b' : '#ef4444'
                        }}
                        title={`Security Class: ${selectedNode.securityClass}`}
                      >
                        {selectedNode.securityClass}
                      </span>
                    )}
                    {selectedNode.zeroTrust && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                        title="Zero Trust Security Enabled"
                      >
                        🛡️ Zero Trust
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold" style={{ color: '#002a42' }}>
                    {selectedNode.name}
                  </h2>
                  {/* Complexity Score Badge */}
                  <div className="mt-2">
                    {(() => {
                      const complexity = calculateComplexity(selectedNode);
                      return (
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1"
                          style={{
                            backgroundColor: complexity.color + '20', // 20% opacity
                            color: complexity.color,
                            border: `1.5px solid ${complexity.color}`
                          }}
                          title={`Complexity Score: ${complexity.score}`}
                        >
                          {complexity.emoji} {complexity.level}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="hover:opacity-70"
                  style={{ color: '#0b6180' }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Application Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Description</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Technology</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.tech}</p>
                </div>

                {selectedNode.cloudProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Cloud Provider(s)</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>
                      {selectedNode.cloudProvider}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Owner</h3>
                  <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.owner}</p>
                </div>

                {/* ISP Connections - Show ISP connections that are hidden from graph */}
                {(() => {
                  const ispConnections = links.filter(l =>
                    l.isISPConnection &&
                    (l.source === selectedNode.id || l.target === selectedNode.id ||
                     l.source.id === selectedNode.id || l.target.id === selectedNode.id)
                  );

                  if (ispConnections.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: '#002a42' }}>
                          Internet Service Providers
                        </h3>
                        <div className="space-y-1">
                          {ispConnections.map((link, idx) => {
                            const connectedId = (link.source === selectedNode.id || link.source.id === selectedNode.id)
                              ? (link.target.id || link.target)
                              : (link.source.id || link.source);
                            const connectedNode = nodes.find(n => n.id === connectedId);

                            if (!connectedNode) return null;

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded text-sm"
                                style={{ backgroundColor: '#f3f4f6', color: '#0b6180' }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: connectedNode.securityClass === 'primary' ? '#10b981' :
                                                   connectedNode.securityClass === 'secondary' ? '#f59e0b' : '#6b7280'
                                  }}
                                  title={connectedNode.securityClass ? `${connectedNode.securityClass} ISP` : 'ISP'}
                                />
                                <span className="font-medium">{connectedNode.name}</span>
                                {connectedNode.securityClass && (
                                  <span className="text-xs uppercase font-semibold ml-auto">
                                    {connectedNode.securityClass}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedNode.primaryAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Primary Admin</h3>
                    {(() => {
                      const contact = getAdminContact(selectedNode.primaryAdmin);
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium" style={{ color: '#0b6180' }}>
                            {selectedNode.primaryAdmin}
                          </p>
                          {contact && (
                            <div className="flex gap-2">
                              <a
                                href={getMailtoUrl(contact.email)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                style={{ backgroundColor: '#0b6180', color: 'white' }}
                                title={`Email ${selectedNode.primaryAdmin}`}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                              </a>
                              <a
                                href={getTeamsChatUrl(contact.teamsId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                style={{ backgroundColor: '#6264a7', color: 'white' }}
                                title={`Teams chat with ${selectedNode.primaryAdmin}`}
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.625 8.25h-7.5v7.5h7.5v-7.5zm-9.375 7.5H3.375V8.25h7.875v7.5zm9.375-9.375h-7.5V3.375c0-.621-.504-1.125-1.125-1.125H3.375C2.754 2.25 2.25 2.754 2.25 3.375v10.125c0 .621.504 1.125 1.125 1.125h7.875v2.25H3.375c-.621 0-1.125.504-1.125 1.125v2.625c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125z"/>
                                </svg>
                                Teams
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.secondaryAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Secondary Admin{selectedNode.secondaryAdmin.includes(',') ? 's' : ''}</h3>
                    {(() => {
                      // Split by comma and trim whitespace to handle multiple admins
                      const adminNames = selectedNode.secondaryAdmin.split(',').map(name => name.trim());

                      return (
                        <div className="space-y-3">
                          {adminNames.map((adminName, index) => {
                            const contact = getAdminContact(adminName);
                            return (
                              <div key={index} className="space-y-2">
                                <p className="text-sm font-medium" style={{ color: '#0b6180' }}>
                                  {adminName}
                                </p>
                                {contact && (
                                  <div className="flex gap-2">
                                    <a
                                      href={getMailtoUrl(contact.email)}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                      style={{ backgroundColor: '#0b6180', color: 'white' }}
                                      title={`Email ${adminName}`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      Email
                                    </a>
                                    <a
                                      href={getTeamsChatUrl(contact.teamsId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:shadow-md"
                                      style={{ backgroundColor: '#6264a7', color: 'white' }}
                                      title={`Teams chat with ${adminName}`}
                                    >
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.625 8.25h-7.5v7.5h7.5v-7.5zm-9.375 7.5H3.375V8.25h7.875v7.5zm9.375-9.375h-7.5V3.375c0-.621-.504-1.125-1.125-1.125H3.375C2.754 2.25 2.25 2.754 2.25 3.375v10.125c0 .621.504 1.125 1.125 1.125h7.875v2.25H3.375c-.621 0-1.125.504-1.125 1.125v2.625c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125z"/>
                                      </svg>
                                      Teams
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.thirdPartyProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Aligned Support Provider</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.thirdPartyProvider}</p>
                  </div>
                )}

                {selectedNode.purchaseVendor && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Purchase Vendor</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.purchaseVendor}</p>
                  </div>
                )}

                {selectedNode.contractItem && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Business & Ops Monday Item</h3>
                    <a
                      href={`https://hopeignites.monday.com/boards/${selectedNode.contractItem}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Link to Monday Item
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {selectedNode.ssoGroup && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Group</h3>
                    <a
                      href={`https://entra.microsoft.com/#view/Microsoft_AAD_IAM/GroupDetailsMenuBlade/~/Overview/groupId/${selectedNode.ssoGroup}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Open in Entra ID
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {selectedNode.platform && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Platform</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.platform}</p>
                  </div>
                )}

                {selectedNode.link && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Link</h3>
                    <a
                      href={selectedNode.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      Open Application
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Vendor Status Page */}
                {selectedNode.status && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>Vendor Status Page</h3>
                    <a
                      href={selectedNode.status}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: '#ef7322' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Status
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* SSO Information */}
                {selectedNode.ssoProvider && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Provider</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.ssoProvider}</p>
                  </div>
                )}

                {selectedNode.ssoProtocol && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>SSO Protocol</h3>
                    <p className="text-sm" style={{ color: '#0b6180' }}>{selectedNode.ssoProtocol}</p>
                  </div>
                )}

                {/* Boolean Checkboxes */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.ssoScim}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>SSO SCIM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.allTeam}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>All Team</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.servicesAgreement}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>Services Agreement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.observed}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>Observed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.nhqOnly}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: '#0b6180' }}>NHQ Only</span>
                  </div>
                </div>

                {/* Open Internet - Special Badge */}
                {selectedNode.openInternet && (
                  <div className="flex items-center gap-2 pt-2 px-3 py-2 rounded" style={{ backgroundColor: '#f3f4f6' }}>
                    <svg className="w-5 h-5" style={{ color: '#0b6180' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: '#002a42' }}>Available via Web</span>
                  </div>
                )}

                {(() => {
                  const connections = getConnectedApps(selectedNode.id);
                  return (
                    <>
                      {connections.outgoing.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>
                            Connects To
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {connections.outgoing.map((app, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: '#0b6180', color: 'white' }}
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {connections.incoming.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-1" style={{ color: '#002a42' }}>
                            Connected From
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {connections.incoming.map((app, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: '#ef7322', color: 'white' }}
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Last Updated */}
                {selectedNode.updated && (
                  <div className="pt-3 mt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      Last updated: <span className="font-medium">{selectedNode.updated}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Legend - Only show in graph view */}
        {viewMode === 'graph' && (
        <div className="legend-container mt-6 bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#002a42' }}>Legend</h3>

          {/* Categories */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Categories {selectedCategories.size > 0 && <span className="text-xs font-normal">(click to filter)</span>}
            </h4>
            <div className="flex flex-wrap gap-4">
              {/*
                LEARNING: Object.entries() with filtering
                Converts an object into an array of [key, value] pairs
                We filter to only show categories that are actually in use
              */}
              {Object.entries(categoryColors)
                .filter(([category]) => nodes.some(node => node.category === category))
                .map(([category, color]) => {
                  const isSelected = selectedCategories.has(category);
                  const isFiltered = selectedCategories.size > 0 && !isSelected;
                  return (
                    <div 
                      key={category} 
                      className="flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleCategory(category)}
                      style={{ opacity: isFiltered ? 0.3 : 1 }}
                      title={isSelected ? "Click to remove filter" : "Click to filter by this category"}
                    >
                      <div 
                        className="w-4 h-4 rounded-full transition-all" 
                        style={{ 
                          backgroundColor: color,
                          border: isSelected ? `3px solid ${color}` : 'none',
                          boxShadow: isSelected ? `0 0 8px ${color}` : 'none'
                        }} 
                      />
                      <span 
                        className="text-sm font-semibold" 
                        style={{ 
                          color: isSelected ? color : '#0b6180',
                          fontWeight: isSelected ? 'bold' : 'normal'
                        }}
                      >
                        {category}
                      </span>
                    </div>
                  );
                })}
            </div>
            {selectedCategories.size > 0 && (
              <button
                onClick={() => setSelectedCategories(new Set())}
                className="mt-3 text-xs px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: '#ef7322', border: '1px solid #ef7322' }}
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Connection Types */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Connection Types
            </h4>
            <div className="flex flex-wrap gap-6">
              {/* Data Connection */}
              <div className="flex items-center gap-2">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line x1="0" y1="10" x2="40" y2="10" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#legend-arrow-data)" />
                  <defs>
                    <marker id="legend-arrow-data" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                      <path fill="#94a3b8" d="M0,-5L10,0L0,5" />
                    </marker>
                  </defs>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>Data Flow</span>
              </div>

              {/* SSO Connection */}
              <div className="flex items-center gap-2">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line x1="0" y1="10" x2="40" y2="10" stroke="#9333ea" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#legend-arrow-sso)" />
                  <defs>
                    <marker id="legend-arrow-sso" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                      <path fill="#9333ea" d="M0,-5L10,0L0,5" />
                    </marker>
                  </defs>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>SSO/Authentication</span>
              </div>

              {/* Observability Connection */}
              <div className="flex items-center gap-2">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line x1="0" y1="10" x2="40" y2="10" stroke="#ef7322" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#legend-arrow-observe)" />
                  <defs>
                    <marker id="legend-arrow-observe" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                      <path fill="#ef7322" d="M0,-5L10,0L0,5" />
                    </marker>
                  </defs>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>Observability</span>
              </div>

              {/* Backup Connection */}
              <div className="flex items-center gap-2">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line x1="0" y1="10" x2="40" y2="10" stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#legend-arrow-backup)" />
                  <defs>
                    <marker id="legend-arrow-backup" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                      <path fill="#10b981" d="M0,-5L10,0L0,5" />
                    </marker>
                  </defs>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>Backup/Replication</span>
              </div>
            </div>
          </div>

          {/* Layer Icons */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Layer Icons
            </h4>
            <div className="flex flex-wrap gap-6">
              {/* DNS Layer Node */}
              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="14" fill="#0b6180" stroke="#fff" strokeWidth="3" />
                  <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="14">🌐</text>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>DNS Layer</span>
              </div>

              {/* AI Layer Node */}
              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="14" fill="#9333ea" stroke="#fff" strokeWidth="3" />
                  <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="14">💡</text>
                </svg>
                <span className="text-sm" style={{ color: '#0b6180' }}>AI Layer</span>
              </div>
            </div>
          </div>

          {/* Platform Badges */}
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Platform Badges
            </h4>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  M365
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Microsoft 365</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  SF
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Salesforce Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  CF
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Cloudflare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  DATA
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Data Center Infrastructure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  CISC
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Cisco Meraki Platform</span>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #9ca3af' }}>
                  AZUR
                </div>
                <span className="text-sm" style={{ color: '#0b6180' }}>Azure</span>
              </div>                
              </div>                            
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 text-center border-t" style={{ borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
        <p className="text-sm mb-2" style={{ color: '#6b7280' }}>
          Made with ❤️ by the {orgName} Technology Services Team with the help of 🤖 Claude Code
        </p>
        <p className="text-sm mb-2" style={{ color: '#6b7280' }}>
          Application Ecosystem Map version 0.1.1
        </p>        
        <p className="text-sm mb-2" style={{ color: '#6b7280' }}>
          Application Ecosystem is part of{' '}
          <a
            href="https://stackium.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
            style={{ color: '#0b6180' }}
          >
            Stackium.tech
          </a>{' '}
          <span style={{ color: '#9ca3af' }}>(Codename Nova)</span>
        </p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>
          Licensed under the{' '}
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: '#6b7280' }}
          >
            MIT License
          </a>
          {' · '}
          <a
            href="/docs/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: '#6b7280' }}
          >
            Changelog
          </a>
        </p>
      </footer>

      {/* Documentation Modal */}
      {showDocs && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDocs(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? '#1f2937' : 'white',
              color: darkMode ? '#f3f4f6' : '#002a42'
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}
            >
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {activeTab === 'security' ? 'Security' : 'Applications'} Ecosystem Documentation
              </h2>
              <button
                onClick={() => setShowDocs(false)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{
                  backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                  color: darkMode ? '#f3f4f6' : '#002a42'
                }}
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {docsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#ef7322' }}></div>
                </div>
              ) : (
                <div
                  className="prose prose-sm md:prose-base max-w-none"
                  style={{
                    color: darkMode ? '#f3f4f6' : '#002a42'
                  }}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 style={{ color: '#ef7322', borderBottom: '2px solid #ef7322', paddingBottom: '0.5rem' }} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{ color: '#0b6180', marginTop: '2rem' }} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ color: '#002a42' }} {...props} />,
                      a: ({node, ...props}) => <a style={{ color: '#ef7322' }} {...props} />,
                      code: ({node, ...props}) => <code style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }} {...props} />,
                      pre: ({node, ...props}) => <pre style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto' }} {...props} />
                    }}
                  >
                    {docsContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stackium Family Floating Orb Menu */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Menu Items - Radial Layout */}
        <div className={`absolute bottom-0 right-0 transition-all duration-500 ease-out ${isOrbMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* App Launcher - Top Right */}
          <a
            href="https://my.hopeignites.app"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute group"
            style={{
              bottom: '80px',
              right: '0px',
              transform: isOrbMenuOpen ? 'translate(0, 0) scale(1)' : 'translate(30px, 30px) scale(0)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transitionDelay: isOrbMenuOpen ? '0.1s' : '0s'
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb'
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: '#ef7322' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="font-medium whitespace-nowrap pr-1" style={{ color: darkMode ? '#f3f4f6' : '#002a42' }}>
                App Launcher
              </span>
            </div>
          </a>

          {/* System Status - Bottom Right */}
          <a
            href="https://up.hopeignites.app"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute group"
            style={{
              bottom: '0px',
              right: '80px',
              transform: isOrbMenuOpen ? 'translate(0, 0) scale(1)' : 'translate(30px, 30px) scale(0)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transitionDelay: isOrbMenuOpen ? '0.15s' : '0s'
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 border-2"
              style={{
                backgroundColor: darkMode ? '#1f2937' : 'white',
                borderColor: darkMode ? '#374151' : '#e5e7eb'
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: '#0b6180' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium whitespace-nowrap pr-1" style={{ color: darkMode ? '#f3f4f6' : '#002a42' }}>
                System Status
              </span>
            </div>
          </a>
        </div>

        {/* Central Orb Button */}
        <button
          onClick={() => setIsOrbMenuOpen(!isOrbMenuOpen)}
          className="relative w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 border-4"
          style={{
            backgroundColor: '#ef7322', // Orange Spark
            borderColor: darkMode ? '#1f2937' : 'white',
            transform: isOrbMenuOpen ? 'rotate(135deg)' : 'rotate(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s'
          }}
          title="Stackium Family"
        >
          {/* Icon - Stacked Layers */}
          <svg
            className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2.5}
          >
            {/* Three stacked layers representing the Stackium family */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l8 4 8-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l8 4 8-4" />
          </svg>

          {/* Pulse animation ring when closed */}
          {!isOrbMenuOpen && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: '#ef7322', animationDuration: '2s' }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * LEARNING SUMMARY: Key React Patterns in This Component
 *
 * 1. COMPONENT STRUCTURE
 *    - Default export function
 *    - Returns JSX
 *    - Can use hooks (useState, useEffect, useRef)
 *
 * 2. STATE MANAGEMENT
 *    - useState for data that changes (selectedNode, hoveredNode)
 *    - State updates trigger re-renders
 *
 * 3. SIDE EFFECTS
 *    - useEffect for D3 initialization
 *    - Cleanup function to stop simulation
 *
 * 4. DOM REFERENCES
 *    - useRef to access the SVG element
 *    - D3 needs direct DOM access
 *
 * 5. EVENT HANDLING
 *    - onClick, onMouseEnter, etc.
 *    - Bridge between D3 events and React state
 *
 * 6. CONDITIONAL RENDERING
 *    - {condition && <JSX>}
 *    - Show/hide detail card based on selectedNode
 *
 * 7. LIST RENDERING
 *    - .map() to transform arrays into JSX
 *    - key prop for each item
 *
 * 8. STYLING
 *    - Tailwind classes for layout
 *    - Inline styles for brand colors
 *    - Mix of both approaches
 */
