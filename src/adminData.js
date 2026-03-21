/**
 * Admin Contact Information
 *
 * Maps admin names to their contact details and Teams presence info
 * This file can be manually updated or generated from your HR system
 */

export const adminContacts = {
  "Peter Schweiss": {
    email: "peter.schweiss@hopeignites.org",
    teamsId: "peter.schweiss@hopeignites.org", // Usually the email/UPN
    title: "Director of Technology Services",
    presence: "available", // available, busy, away, offline, dnd (do not disturb)
  },
  "Laura Stevens": {
    email: "laura.stevens@hopeignites.org",
    teamsId: "laura.stevens@hopeignites.org",
    title: "Senior Director of Organizational Impact",
    presence: "available",
  },
  "Janee Artis": {
    email: "janee.artis@hopeignites.org",
    teamsId: "janee.artis@hopeignites.org",
    title: "Infrastructure Support Specialist",
    presence: "available",
  },
  "Jenn Garris": {
    email: "jenn.garris@hopeignites.org",
    teamsId: "jenn.garris@hopeignites.org",
    title: "Payroll Coordinator",
    presence: "available",
  },
  "Ashley Scoville": {
    email: "ashley.scoville@hopeignites.org",
    teamsId: "ashley.scoville@hopeignites.org",
    title: "Director of Finance and Accounting",
    presence: "available",
  },
  "Jenny Starkey": {
    email: "jenny.starkey@hopeignites.org",
    teamsId: "jenny.starkey@hopeignites.org",
    title: "Senior Director of Marketing and Communications",
    presence: "available",
  },
  "Bill Fronczak": {
    email: "bill.fronczak@hopeignites.org",
    teamsId: "bill.fronczak@hopeignites.org",
    title: "Vice President of Advancement",
    presence: "available",
  },
  "Mel Burden": {
    email: "mel.burden@hopeignites.org",
    teamsId: "mel.burden@hopeignites.org",
    title: "Vice President of People and Culture",
    presence: "available",
  },
  "Erin Beezley": {
    email: "erin.beezley@hopeignites.org",
    teamsId: "erin.beezley@hopeignites.org",
    title: "Mission Effectiveness",
    presence: "available",
  },
  "Brian Hipp": {
    email: "brian.hipp@hopeignites.org",
    teamsId: "brian.hipp@hopeignites.org",
    title: "Vice President of Mission Effectiveness",
    presence: "available",
  },
  "Martin Totland": {
    email: "martin.totland@hopeignites.org",
    teamsId: "martin.totland@hopeignites.org",
    title: "Communications Associate",
    presence: "available",
  },
  "Aly Marin": {
    email: "aly.marin@hopeignites.org",
    teamsId: "aly.marin@hopeignites.org",
    title: "Brand and Design Manager",
    presence: "available",
  },
  "Bridget Reuter": {
    email: "bridget.reuter@hopeignites.org",
    teamsId: "bridget.reuter@hopeignites.org",
    title: "Accountant",
    presence: "available",
  },
};

/**
 * Presence status colors (Hope Ignites brand aligned)
 */
export const presenceColors = {
  available: "#10b981", // Green
  busy: "#ef4444", // Red
  away: "#f59e0b", // Amber/Orange
  offline: "#6b7280", // Gray
  dnd: "#dc2626", // Dark Red
  unknown: "#9ca3af", // Light Gray
};

/**
 * Presence status labels
 */
export const presenceLabels = {
  available: "Available",
  busy: "Busy",
  away: "Away",
  offline: "Offline",
  dnd: "Do Not Disturb",
  unknown: "Unknown",
};

/**
 * Helper function to get admin contact info
 */
export function getAdminContact(adminName) {
  if (!adminName) return null;
  return adminContacts[adminName] || null;
}

/**
 * Helper function to get Teams chat URL
 */
export function getTeamsChatUrl(teamsId) {
  if (!teamsId) return null;
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(teamsId)}`;
}

/**
 * Helper function to get mailto URL
 */
export function getMailtoUrl(email) {
  if (!email) return null;
  return `mailto:${email}`;
}
