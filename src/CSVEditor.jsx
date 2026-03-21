import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * CSV Editor for Application Ecosystem Data
 * 
 * Features:
 * - Form-based editing (no raw CSV)
 * - Validation and dropdowns
 * - Search and filter
 * - Add/Edit/Delete/Duplicate applications and security components
 * - Tab switching between Applications and Security
 * - Export to CSV
 * - Export to PDF for easy review
 */

const CSVEditor = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [securityData, setSecurityData] = useState([]);
  const [editingApp, setEditingApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [connections, setConnections] = useState([]);

  // Load CSV data on mount
  useEffect(() => {
    loadCSVData();
    loadSecurityData();
  }, []);

  // Reset search and filter when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setFilterCategory('all');
  }, [activeTab]);

  const loadCSVData = async () => {
    try {
      const response = await fetch('/application-specs.csv');
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      setApplications(parsed);
    } catch (error) {
      console.error('Error loading CSV:', error);
    }
  };

  const loadSecurityData = async () => {
    try {
      const response = await fetch('/security-specs.csv');
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      setSecurityData(parsed);
    } catch (error) {
      console.error('Error loading security CSV:', error);
    }
  };

  // Simple CSV parser
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Convert applications back to CSV
  const exportCSV = () => {
    const dataToExport = activeTab === 'applications' ? applications : securityData;
    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]);
    const csvLines = [headers.join(',')];

    dataToExport.forEach(app => {
      const values = headers.map(header => {
        const value = app[header] || '';
        // Escape values with commas or quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'applications' ? 'application-specs.csv' : 'security-specs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF for easy review
  const exportPDF = () => {
    const dataToExport = activeTab === 'applications' ? applications : securityData;
    if (dataToExport.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const isSecurityTab = activeTab === 'security';
    const title = isSecurityTab ? 'Hope Ignites Security Ecosystem' : 'Hope Ignites Application Ecosystem';
    const countLabel = isSecurityTab ? 'Total Security Components' : 'Total Applications';
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 22, { align: 'center' });
    doc.text(`${countLabel}: ${dataToExport.length}`, pageWidth / 2, 27, { align: 'center' });

    let yPos = 35;

    // Group by category
    const categorized = dataToExport.reduce((acc, app) => {
      const cat = app.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(app);
      return acc;
    }, {});

    // Sort categories alphabetically
    const sortedCategories = Object.keys(categorized).sort();

    sortedCategories.forEach((category, catIndex) => {
      const apps = categorized[category].sort((a, b) => 
        (a['application-name'] || '').localeCompare(b['application-name'] || '')
      );

      // Check if we need a new page for this category
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 15;
      }

      // Category Header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(239, 115, 34); // Hope Ignites orange
      doc.rect(10, yPos - 5, pageWidth - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`${category} (${apps.length})`, 12, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      // Applications in this category
      apps.forEach((app, appIndex) => {
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 15;
        }

        // Application name
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${app['application-name'] || 'Unnamed'}`, 12, yPos);
        yPos += 5;

        // ID and vendor
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`ID: ${app.id || 'N/A'}`, 12, yPos);
        if (app.vendor) {
          doc.text(`| Vendor: ${app.vendor}`, 50, yPos);
        }
        yPos += 5;

        // Description
        if (app.description) {
          doc.setTextColor(60, 60, 60);
          const descLines = doc.splitTextToSize(app.description, pageWidth - 24);
          doc.text(descLines, 12, yPos);
          yPos += descLines.length * 4 + 2;
        }

        // Details grid
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const details = [];
        
        if (app.owner) details.push(`Owner: ${app.owner}`);
        if (app['primary-admin']) details.push(`Admin: ${app['primary-admin']}`);
        if (app['cloud-provider']) details.push(`Cloud: ${app['cloud-provider']}`);
        if (app.platform) details.push(`Platform: ${app.platform}`);
        if (app['sso-provider']) details.push(`SSO: ${app['sso-provider']}`);
        
        if (details.length > 0) {
          doc.text(details.join(' | '), 12, yPos);
          yPos += 4;
        }

        // Connections
        if (app.connection) {
          doc.setFont(undefined, 'italic');
          const connText = `Connections: ${app.connection}`;
          const connLines = doc.splitTextToSize(connText, pageWidth - 24);
          doc.text(connLines, 12, yPos);
          yPos += connLines.length * 3.5;
          doc.setFont(undefined, 'normal');
        }

        // Links
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246); // Blue for links
        if (app.link) {
          const linkText = `🔗 ${app.link}`;
          doc.textWithLink(linkText, 12, yPos, { url: app.link });
          yPos += 4;
        }
        if (app.status) {
          const statusText = `📊 ${app.status}`;
          doc.textWithLink(statusText, 12, yPos, { url: app.status });
          yPos += 4;
        }
        if (app['contract-item']) {
          const contractText = `📄 ${app['contract-item']}`;
          doc.textWithLink(contractText, 12, yPos, { url: app['contract-item'] });
          yPos += 4;
        }

        doc.setTextColor(0, 0, 0);

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(12, yPos + 2, pageWidth - 12, yPos + 2);
        yPos += 7;
      });

      yPos += 3; // Extra space after category
    });

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    const footerTitle = isSecurityTab ? 'Hope Ignites Security Ecosystem' : 'Hope Ignites Application Ecosystem';
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(footerTitle, 12, pageHeight - 10);
    }

    // Save the PDF
    const filename = isSecurityTab ? 'hope-ignites-security.pdf' : 'hope-ignites-applications.pdf';
    doc.save(filename);
  };

  // Determine current dataset based on active tab
  const currentData = activeTab === 'applications' ? applications : securityData;
  const setCurrentData = activeTab === 'applications' ? setApplications : setSecurityData;
  
  // Get unique categories
  const categories = ['all', ...new Set(currentData.map(app => app.category).filter(Boolean))];

  // Filter items
  const filteredApps = currentData.filter(app => {
    const matchesSearch = !searchTerm || 
      app['application-name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || app.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Parse connections from CSV format to array
  const parseConnections = (connectionStr, directionStr) => {
    if (!connectionStr) return [];
    
    const connIds = connectionStr.split(',').map(c => c.trim()).filter(Boolean);
    const directions = directionStr ? directionStr.split(',').map(d => d.trim()) : [];
    
    return connIds.map((id, index) => {
      let direction = 'to';
      const dirText = directions[index] || '';
      
      if (dirText.includes('from')) {
        direction = 'from';
      } else if (dirText.includes('to and from') || dirText.includes('bidirectional')) {
        direction = 'bidirectional';
      }
      
      return { target: id, direction };
    });
  };

  // Convert connections array back to CSV format
  const formatConnectionsToCSV = (conns) => {
    if (!conns || conns.length === 0) return { connection: '', direction: '' };
    
    const connection = conns.map(c => c.target).join(', ');
    const direction = conns.map(c => {
      if (c.direction === 'from') return `from ${c.target}`;
      if (c.direction === 'bidirectional') return `to and from ${c.target}`;
      return `to ${c.target}`;
    }).join(', ');
    
    return { connection, direction };
  };

  // Add new application
  const addNewApp = () => {
    const newApp = {
      id: '',
      'application-name': '',
      category: '',
      description: '',
      vendor: '',
      owner: '',
      'primary-admin': '',
      'secondary-admin': '',
      'cloud-provider': '',
      connection: '',
      direction: '',
      'sso-provider': '',
      'sso-protocol': '',
      platform: '',
      link: '',
      status: '',
      'contract-item': '',
      updated: new Date().toISOString().split('T')[0]
    };
    setEditingApp(newApp);
    setConnections([]);
    setShowForm(true);
  };

  // Edit existing application
  const editApp = (app) => {
    setEditingApp({ ...app });
    const parsedConnections = parseConnections(app.connection, app.direction);
    setConnections(parsedConnections);
    setShowForm(true);
  };

  // Save application
  const saveApp = () => {
    if (!editingApp.id || !editingApp['application-name']) {
      alert('ID and Application Name are required');
      return;
    }

    // Convert connections array back to CSV format
    const { connection, direction } = formatConnectionsToCSV(connections);
    const appToSave = {
      ...editingApp,
      connection,
      direction,
      updated: new Date().toISOString().split('T')[0]
    };

    const existingIndex = applications.findIndex(app => app.id === editingApp.id);
    
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...applications];
      updated[existingIndex] = appToSave;
      setApplications(updated);
    } else {
      // Add new
      setApplications([...applications, appToSave]);
    }

    setShowForm(false);
    setEditingApp(null);
    setConnections([]);
  };

  // Delete application
  const deleteApp = (id) => {
    if (confirm(`Delete application "${id}"?`)) {
      setApplications(applications.filter(app => app.id !== id));
    }
  };

  // Duplicate application
  const duplicateApp = (app) => {
    const duplicate = { ...app, id: `${app.id}-copy` };
    setEditingApp(duplicate);
    const parsedConnections = parseConnections(app.connection, app.direction);
    setConnections(parsedConnections);
    setShowForm(true);
  };

  // Add a new connection
  const addConnection = () => {
    setConnections([...connections, { target: '', direction: 'to' }]);
  };

  // Update a connection
  const updateConnection = (index, field, value) => {
    const updated = [...connections];
    updated[index][field] = value;
    setConnections(updated);
  };

  // Remove a connection
  const removeConnection = (index) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Hope Ignites Ecosystem Editor
              </h1>
              {/* Tab Navigation */}
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`pb-2 border-b-2 font-medium text-base transition-colors ${
                    activeTab === 'applications'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`pb-2 border-b-2 font-medium text-base transition-colors ${
                    activeTab === 'security'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Network & Endpoints
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                ← Back to Diagram
              </a>
              <button
                onClick={exportPDF}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                title="Export as PDF for easy review"
              >
                📄 Export PDF
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                title="Export as CSV for data editing"
              >
                💾 Export CSV
              </button>
              <button
                onClick={addNewApp}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ➕ Add New {activeTab === 'applications' ? 'Application' : 'Security Component'}
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'applications' ? 'applications' : 'security components'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-gray-600">
            {filteredApps.length} of {currentData.length} {activeTab === 'applications' ? 'applications' : 'security components'}
          </p>
        </div>

        {/* Edit Form Modal */}
        {showForm && editingApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentData.find(a => a.id === editingApp.id) ? 'Edit' : 'Add'} {activeTab === 'applications' ? 'Application' : 'Security Component'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID */}
                <div>
                  <label className="block text-sm font-medium mb-1">ID *</label>
                  <input
                    type="text"
                    value={editingApp.id}
                    onChange={(e) => setEditingApp({ ...editingApp, id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="salesforce"
                  />
                </div>

                {/* Application Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Application Name *</label>
                  <input
                    type="text"
                    value={editingApp['application-name']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'application-name': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Salesforce Platform"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={editingApp.category}
                    onChange={(e) => setEditingApp({ ...editingApp, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select category...</option>
                    <option value="Main Line">Main Line</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Collaboration">Collaboration</option>
                    <option value="Fundraising">Fundraising</option>
                    <option value="MarComm">MarComm</option>
                    <option value="Data">Data</option>
                    <option value="Payroll, Finance & Accounting">Payroll, Finance & Accounting</option>
                    <option value="TechOps">TechOps</option>
                    <option value="Observability">Observability</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Training">Training</option>
                    <option value="Experiential Learning">Experiential Learning</option>
                    <option value="Cold Storage">Cold Storage</option>
                  </select>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium mb-1">Vendor</label>
                  <input
                    type="text"
                    value={editingApp.vendor}
                    onChange={(e) => setEditingApp({ ...editingApp, vendor: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                {/* Owner */}
                <div>
                  <label className="block text-sm font-medium mb-1">Owner/Team</label>
                  <select
                    value={editingApp.owner}
                    onChange={(e) => setEditingApp({ ...editingApp, owner: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select owner...</option>
                    <option value="Technology Services">Technology Services</option>
                    <option value="Finance and Accounting">Finance and Accounting</option>
                    <option value="Marketing and Communications">Marketing and Communications</option>
                    <option value="Human Capital Management">Human Capital Management</option>
                    <option value="Monitoring and Eval">Monitoring and Eval</option>
                    <option value="Advancement">Advancement</option>
                    <option value="Mission Effectiveness">Mission Effectiveness</option>
                  </select>
                </div>

                {/* Primary Admin */}
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Admin</label>
                  <input
                    type="text"
                    value={editingApp['primary-admin']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'primary-admin': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                {/* Secondary Admin */}
                <div>
                  <label className="block text-sm font-medium mb-1">Secondary Admin</label>
                  <input
                    type="text"
                    value={editingApp['secondary-admin']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'secondary-admin': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                {/* Cloud Provider */}
                <div>
                  <label className="block text-sm font-medium mb-1">Cloud Provider</label>
                  <input
                    type="text"
                    value={editingApp['cloud-provider']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'cloud-provider': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Azure, AWS, GCP"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editingApp.description}
                    onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows="3"
                  />
                </div>

                {/* Connections */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Connections</label>
                  
                  {connections.length === 0 && (
                    <p className="text-sm text-gray-500 mb-2">No connections yet</p>
                  )}
                  
                  <div className="space-y-3">
                    {connections.map((conn, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded border">
                        <div className="flex-1">
                          <select
                            value={conn.target}
                            onChange={(e) => updateConnection(index, 'target', e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            <option value="">Select application...</option>
                            {applications
                              .filter(app => app.id !== editingApp?.id) // Don't allow self-connection
                              .sort((a, b) => a['application-name']?.localeCompare(b['application-name'] || ''))
                              .map(app => (
                                <option key={app.id} value={app.id}>
                                  {app['application-name']} ({app.id})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <div className="w-48">
                          <select
                            value={conn.direction}
                            onChange={(e) => updateConnection(index, 'direction', e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            <option value="to">To (→)</option>
                            <option value="from">From (←)</option>
                            <option value="bidirectional">To and From (↔)</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeConnection(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Remove connection"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={addConnection}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    ➕ Add Connection
                  </button>
                </div>

                {/* SSO Provider */}
                <div>
                  <label className="block text-sm font-medium mb-1">SSO Provider</label>
                  <select
                    value={editingApp['sso-provider']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'sso-provider': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">None</option>
                    <option value="entra">Entra ID</option>
                  </select>
                </div>

                {/* SSO Protocol */}
                <div>
                  <label className="block text-sm font-medium mb-1">SSO Protocol</label>
                  <select
                    value={editingApp['sso-protocol']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'sso-protocol': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">None</option>
                    <option value="SAML">SAML</option>
                    <option value="OIDC">OIDC</option>
                    <option value="NATIVE">NATIVE</option>
                  </select>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select
                    value={editingApp.platform}
                    onChange={(e) => setEditingApp({ ...editingApp, platform: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">None</option>
                    <option value="m365">Microsoft 365</option>
                    <option value="salesforce">Salesforce</option>
                    <option value="cloudflare">Cloudflare</option>
                  </select>
                </div>

                {/* Link */}
                <div>
                  <label className="block text-sm font-medium mb-1">Application Link</label>
                  <input
                    type="url"
                    value={editingApp.link}
                    onChange={(e) => setEditingApp({ ...editingApp, link: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="https://app.example.com"
                  />
                </div>

                {/* Status URL */}
                <div>
                  <label className="block text-sm font-medium mb-1">Status URL</label>
                  <input
                    type="url"
                    value={editingApp.status}
                    onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="https://status.example.com"
                  />
                </div>

                {/* Contract Link */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Contract/Monday.com Link</label>
                  <input
                    type="url"
                    value={editingApp['contract-item']}
                    onChange={(e) => setEditingApp({ ...editingApp, 'contract-item': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="https://hopeignites.monday.com/boards/..."
                  />
                </div>

                {/* 3rd Party Provider */}
                <div>
                  <label className="block text-sm font-medium mb-1">3rd Party Provider</label>
                  <input
                    type="text"
                    value={editingApp['3p-provider'] || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, '3p-provider': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Stripe, Twilio"
                  />
                </div>

                {/* Purchase Vendor */}
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Vendor</label>
                  <input
                    type="text"
                    value={editingApp['purchase-vendor'] || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, 'purchase-vendor': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., ADP Direct, TechSoup"
                  />
                </div>

                {/* Backup */}
                <div>
                  <label className="block text-sm font-medium mb-1">Backup</label>
                  <input
                    type="text"
                    value={editingApp.backup || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, backup: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Backup solution or notes"
                  />
                </div>

                {/* Observe */}
                <div>
                  <label className="block text-sm font-medium mb-1">Observe/Monitoring</label>
                  <input
                    type="text"
                    value={editingApp.observe || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, observe: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Monitoring solution"
                  />
                </div>

                {/* Updated */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Last Updated</label>
                  <input
                    type="text"
                    value={editingApp.updated || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, updated: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., October 2025"
                  />
                </div>

                {/* Boolean Flags Section */}
                <div className="md:col-span-2 border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Access & Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* All Team */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="all-team"
                        checked={editingApp['all-team'] === 'TRUE' || editingApp['all-team'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'all-team': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="all-team" className="text-sm font-medium">All Team Access</label>
                    </div>

                    {/* NHQ Only */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="nhq-only"
                        checked={editingApp['nhq-only'] === 'TRUE' || editingApp['nhq-only'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'nhq-only': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="nhq-only" className="text-sm font-medium">NHQ Only</label>
                    </div>

                    {/* Open Internet */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="open-internet"
                        checked={editingApp['open-internet'] === 'TRUE' || editingApp['open-internet'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'open-internet': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="open-internet" className="text-sm font-medium">Open Internet</label>
                    </div>

                    {/* Services Agreement */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="services-agreement"
                        checked={editingApp['services-agreement'] === 'TRUE' || editingApp['services-agreement'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'services-agreement': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="services-agreement" className="text-sm font-medium">Services Agreement</label>
                    </div>

                    {/* AI Layer */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ai-layer"
                        checked={editingApp['ai-layer'] === 'TRUE' || editingApp['ai-layer'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'ai-layer': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="ai-layer" className="text-sm font-medium">AI Layer</label>
                    </div>

                    {/* DNS Layer */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dns-layer"
                        checked={editingApp['dns-layer'] === 'TRUE' || editingApp['dns-layer'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'dns-layer': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="dns-layer" className="text-sm font-medium">DNS Layer</label>
                    </div>

                    {/* Observed */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="observed"
                        checked={editingApp.observed === 'TRUE' || editingApp.observed === true}
                        onChange={(e) => setEditingApp({ ...editingApp, observed: e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="observed" className="text-sm font-medium">Observed</label>
                    </div>

                    {/* SSO SCIM */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sso-scim"
                        checked={editingApp['sso-scim'] === 'TRUE' || editingApp['sso-scim'] === true}
                        onChange={(e) => setEditingApp({ ...editingApp, 'sso-scim': e.target.checked ? 'TRUE' : 'FALSE' })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="sso-scim" className="text-sm font-medium">SSO SCIM</label>
                    </div>
                  </div>
                </div>

                {/* SSO Group ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">SSO Group ID (Entra ID)</label>
                  <input
                    type="text"
                    value={editingApp['sso-group'] || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, 'sso-group': e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Entra ID Group UUID"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveApp}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingApp(null);
                    setConnections([]);
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApps.map(app => (
            <div key={app.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{app['application-name']}</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{app.id}</span>
                    {app.category && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {app.category}
                      </span>
                    )}
                  </p>
                  <p className="text-gray-700 mt-2">{app.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                    {app.vendor && <div><span className="text-gray-500">Vendor:</span> {app.vendor}</div>}
                    {app.owner && <div><span className="text-gray-500">Owner:</span> {app.owner}</div>}
                    {app['primary-admin'] && <div><span className="text-gray-500">Admin:</span> {app['primary-admin']}</div>}
                    {app['cloud-provider'] && <div><span className="text-gray-500">Cloud:</span> {app['cloud-provider']}</div>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => editApp(app)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => duplicateApp(app)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => deleteApp(app.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredApps.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No applications found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVEditor;
