/**
 * Security Ecosystem Data for Hope Ignites
 *
 * AUTO-GENERATED from security-specs.csv
 * Generated on: 2025-10-30T22:01:20.015Z
 *
 * NODES: Each node represents a security component in the ecosystem
 * - id: Unique identifier (lowercase, no spaces)
 * - name: Display name shown in the diagram
 * - category: Security category
 * - description: What the component does
 * - tech: Technology vendor
 * - cloudProvider: Hosting location
 * - owner: Team responsible for this component
 * - link: URL to access the component (optional)
 * - status: Component status page URL (optional)
 * - updated: Last updated date/time (text)
 * - primaryAdmin: Primary administrator
 * - secondaryAdmin: Secondary administrator
 * - securityClass: Security classification - 'primary', 'secondary', or 'backup'
 * - zeroTrust: Whether Zero Trust security model is enabled (boolean)
 *
 * LINKS: Each link represents a directional security relationship
 * - source: The ID of the component that initiates the connection
 * - target: The ID of the component that receives the connection
 * - type: Connection type - 'security' or 'observe'
 *   - 'security': Security data flow or relationship (solid arrow)
 *   - 'observe': Monitoring/observability connection (orange dashed arrow)
 */

// Security-specific category colors
export const categoryColors = {
  "Identity & Access": "#9333ea",
  "Network Security": "#002a42",
  "Endpoint Security": "#ef7322",
  "Device Management": "#0b6180",
  "Secrets Management": "#14532d",
  "SIEM & Monitoring": "#f79d1e",
  "Data Protection": "#1e40af",
  "Security Awareness": "#dc2626",
  "DevSecOps": "#059669"
};

// All security components in the Hope Ignites ecosystem
export const nodes = [
  {
    "id": "exchange-365",
    "name": "Microsoft Exchange 365",
    "category": "Core Infrastructure",
    "description": "",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "defender-atp",
    "name": "Microsoft Defender Advanced Threat Protection",
    "category": "Data Protection",
    "description": "",
    "tech": "Microsft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "entra",
    "name": "Microsoft Entra ID",
    "category": "Identity & Access",
    "description": "Identity and access management platform providing SSO, MFA, and conditional access policies for all Hope Ignites applications.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://entra.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "conditional-access",
    "name": "Conditional Access Policies",
    "category": "Identity & Access",
    "description": "Policy engine that enforces access controls based on user location, device compliance, risk level, and application sensitivity.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://entra.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "privileged-identity",
    "name": "Privileged Identity Management",
    "category": "Identity & Access",
    "description": "Just-in-time privileged access management for admin roles with time-limited elevation and approval workflows.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://entra.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "cloudflare-zero-trust",
    "name": "Cloudflare Zero Trust Edge",
    "category": "Network Security",
    "description": "Zero-trust network access replacing traditional VPN with identity-aware proxy and device posture checks.",
    "tech": "Cloudflare",
    "cloudProvider": "Cloudflare",
    "owner": "Technology Services",
    "link": "https://cloudflare.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "defender",
    "name": "Microsoft Defender",
    "category": "Endpoint Security",
    "description": "Endpoint detection and response (EDR) platform providing real-time threat detection, investigation, and response for all devices.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://security.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "defender-endpoint",
    "name": "Defender for Endpoint",
    "category": "Endpoint Security",
    "description": "Endpoint protection for workstations and servers with behavioral analysis, threat intelligence, and automated remediation.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://security.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "intune",
    "name": "Microsoft Intune",
    "category": "Device Management",
    "description": "Mobile device management (MDM) and mobile application management (MAM) enforcing security policies on all company devices.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://intune.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "intune-compliance",
    "name": "Device Compliance Policies",
    "category": "Device Management",
    "description": "Automated compliance checks for encryption, password policies, OS updates, and antivirus status before allowing access.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://intune.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "purview",
    "name": "Microsoft Purview",
    "category": "Data Protection",
    "description": "Data governance platform providing data classification, loss prevention (DLP), and information protection policies.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://purview.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "purview-dlp",
    "name": "Data Loss Prevention",
    "category": "Data Protection",
    "description": "Automated policies preventing sensitive data (SSN, credit cards, PHI) from leaving the organization through email or sharing.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://purview.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "purview-encryption",
    "name": "Information Protection",
    "category": "Data Protection",
    "description": "Encryption and rights management for sensitive documents with automatic labeling and access controls.",
    "tech": "Microsoft",
    "cloudProvider": "Azure",
    "owner": "Technology Services",
    "link": "https://purview.microsoft.com",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "shaw-firewall",
    "name": "Hope on the Hill MX85",
    "category": "Appliance",
    "description": "Network Security Appliance deployed on premise at Network Headquarters",
    "tech": "Cisco",
    "cloudProvider": "On Prem",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "isp-spectrum",
    "name": "Spectrum 30/30 FIA",
    "category": "Internet Service Provider",
    "description": "30M Semetrical fiber Internet connection (5 pack IPs)",
    "tech": "Spectrum",
    "cloudProvider": "On Prem",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "primary",
    "zeroTrust": false,
    "isISP": true
  },
  {
    "id": "isp-acc-business",
    "name": "ACC Business 300M ABF",
    "category": "Internet Service Provider",
    "description": "300M Shared Fiber Connection",
    "tech": "ACC Business (AT&T)",
    "cloudProvider": "On Prem",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "secondary",
    "zeroTrust": false,
    "isISP": true
  },
  {
    "id": "cf-dns-gateway",
    "name": "Cloudflare Zero Trust Gateway",
    "category": "Network Security",
    "description": "The security appliance at the core of our data center is tunneling traffic out to the internet through our Cloudflare Zero Trust Gateway.",
    "tech": "Cloudflare",
    "cloudProvider": "Cloudflare",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "dc1-docker",
    "name": "Docker Environment on NAS01",
    "category": "Hosting Infrastructure",
    "description": "We have two different on premise resources that are hosted on Synology Hardware in the Hope on the Hill Data Center. These devices are protected behind the firewall, but are made avaliable to trusted users via a Zero Trust Tunnel.",
    "tech": "Synology",
    "cloudProvider": "On Prem",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "primary",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "dc2-docker",
    "name": "Docker Environment on NAS02",
    "category": "Hosting Infrastructure",
    "description": "We have two different on premise resources that are hosted on Synology Hardware in the Hope on the Hill Data Center. These devices are protected behind the firewall, but are made avaliable to trusted users via a Zero Trust Tunnel.",
    "tech": "Synology",
    "cloudProvider": "On Prem",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "secondary",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "nhq-eu-roam",
    "name": "NHQ Off-Net Device",
    "category": "Endpoint",
    "description": "Represents a NHQ issued laptop that is not currently connected to the network at Hope on the Hill. This device is leverages the Cloudflare WARP client to establish a secure connection to our edge plus core resources.",
    "tech": "Various",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "cloudflare-warp",
    "name": "Cloudflare WARP Client",
    "category": "Endpoint",
    "description": "Denotes a Cloudflare WARP client running on the device, facilitating a connection to the Cloudflare Zero Trust Edge",
    "tech": "",
    "cloudProvider": "",
    "owner": "",
    "link": "",
    "status": "",
    "updated": "",
    "primaryAdmin": "",
    "secondaryAdmin": "",
    "securityClass": "",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "nhq-on-net",
    "name": "NHQ On-Net Device",
    "category": "Endpoint",
    "description": "Represents a NHQ issued laptop that is currently connected to the network at Hope on the Hill.",
    "tech": "Various",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "nhq-vpn-node",
    "name": "Satelite Office Z3",
    "category": "Appliance",
    "description": "Represents a Cisco Meraki Z3 security appliance deployed in the field",
    "tech": "Cisco",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "cloudflare-compute",
    "name": "Cloudflare Compute",
    "category": "Hosting Infrastructure",
    "description": "Cloudflare's Compute Infrastructure (Pagers and Workers)",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "cloudflare-workers",
    "name": "Cloudflare Workders",
    "category": "Hosting Infrastructure",
    "description": "Cloudflare's Compute Infrastructure (Pagers and Workers)",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "worker-up",
    "name": "Uptime Page (Stackium)",
    "category": "Hosting Infrastructure",
    "description": "Uptime Page (replicating uptime status from Uptimerobot). See Observability in the application tab for details on observed functions",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "cloudflare-pages",
    "name": "Cloudflare Pages",
    "category": "Hosting Infrastructure",
    "description": "Cloudflare's Compute Infrastructure (Pagers and Workers)",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  },
  {
    "id": "pages-eco",
    "name": "Ecosystem Applications (Stackium)",
    "category": "Hosting Infrastructure",
    "description": "Our Ecosystem Mapping Tool (THIS APP!)",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": true,
    "isISP": false
  },
  {
    "id": "pages-app",
    "name": "Application Launcher (Stackium)",
    "category": "Hosting Infrastructure",
    "description": "Our Application Launcher Tool",
    "tech": "Cloudflare",
    "cloudProvider": "",
    "owner": "Technology Services",
    "link": "",
    "status": "",
    "updated": "October 2025",
    "primaryAdmin": "Peter Schweiss",
    "secondaryAdmin": "Laura Stevens",
    "securityClass": "",
    "zeroTrust": false,
    "isISP": false
  }
];

// Security relationships between components (directional)
export const links = [
  {
    "source": "exchange-365",
    "target": "defender-atp",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "defender",
    "target": "defender-atp",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "entra",
    "target": "conditional-access",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "privileged-identity",
    "target": "entra",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "entra",
    "target": "privileged-identity",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "defender",
    "target": "defender-endpoint",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "intune",
    "target": "entra",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "entra",
    "target": "intune",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "intune",
    "target": "intune-compliance",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "purview",
    "target": "entra",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "entra",
    "target": "purview",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "purview",
    "target": "purview-dlp",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "purview",
    "target": "purview-encryption",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cf-dns-gateway",
    "target": "isp-spectrum",
    "type": "security",
    "isISPConnection": true
  },
  {
    "source": "shaw-firewall",
    "target": "isp-spectrum",
    "type": "security",
    "isISPConnection": true
  },
  {
    "source": "cf-dns-gateway",
    "target": "isp-acc-business",
    "type": "security",
    "isISPConnection": true
  },
  {
    "source": "shaw-firewall",
    "target": "isp-acc-business",
    "type": "security",
    "isISPConnection": true
  },
  {
    "source": "cf-dns-gateway",
    "target": "shaw-firewall",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cf-dns-gateway",
    "target": "cloudflare-zero-trust",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "shaw-firewall",
    "target": "dc1-docker",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "shaw-firewall",
    "target": "dc2-docker",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-eu-roam",
    "target": "cloudflare-warp",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-eu-roam",
    "target": "defender-endpoint",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-eu-roam",
    "target": "intune",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-eu-roam",
    "target": "purview",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cloudflare-warp",
    "target": "cloudflare-zero-trust",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-on-net",
    "target": "shaw-firewall",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "nhq-vpn-node",
    "target": "shaw-firewall",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cloudflare-compute",
    "target": "cloudflare-zero-trust",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cloudflare-workers",
    "target": "cloudflare-compute",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "worker-up",
    "target": "cloudflare-workers",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "cloudflare-pages",
    "target": "cloudflare-compute",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "pages-eco",
    "target": "cloudflare-pages",
    "type": "security",
    "isISPConnection": false
  },
  {
    "source": "pages-app",
    "target": "cloudflare-pages",
    "type": "security",
    "isISPConnection": false
  }
];

// Export the complete dataset as a single object
export const securityData = {
  nodes,
  links,
  categoryColors
};

// Default export for convenience
export default securityData;
