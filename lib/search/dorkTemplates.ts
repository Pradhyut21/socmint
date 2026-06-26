/**
 * Dork Templates — Search Intelligence Module
 *
 * Defines advanced search query templates for target investigatory entities.
 * These templates are engine-agnostic and work with modern search dork syntax.
 */

export interface DorkTemplate {
  label: string;
  queryPattern: string;
  category: string;
  notes?: string;
}

export const DORK_TEMPLATES: Record<string, DorkTemplate[]> = {
  username: [
    {
      label: "Exact Handle Search",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Finds pages containing the exact username handle string.",
    },
    {
      label: "Exact Handle prefixed with @",
      queryPattern: '"@{value}"',
      category: "exact_match",
      notes: "Finds mentions of the handle in standard social media format.",
    },
    {
      label: "Instagram Profile",
      queryPattern: 'site:instagram.com "{value}"',
      category: "social_profiles",
      notes: "Discovers Instagram profile pages or mentions.",
    },
    {
      label: "Twitter / X Profile",
      queryPattern: 'site:x.com "{value}" OR site:twitter.com "{value}"',
      category: "social_profiles",
      notes: "Discovers Twitter/X postings or account pages.",
    },
    {
      label: "Facebook Profile",
      queryPattern: 'site:facebook.com "{value}"',
      category: "social_profiles",
      notes: "Locates Facebook users or group mentions.",
    },
    {
      label: "Telegram Channel/Chat",
      queryPattern: 'site:t.me "{value}" OR site:telegram.me "{value}"',
      category: "social_profiles",
      notes: "Finds public Telegram channels, bots, or user invite links.",
    },
    {
      label: "Reddit Mention",
      queryPattern: 'site:reddit.com "{value}"',
      category: "social_profiles",
      notes: "Locates Reddit profiles, submissions, or comment threads.",
    },
    {
      label: "YouTube Channel",
      queryPattern: 'site:youtube.com "{value}"',
      category: "social_profiles",
      notes: "Searches for YouTube content creators or channel links.",
    },
    {
      label: "LinkedIn Profile",
      queryPattern: 'site:linkedin.com "{value}"',
      category: "social_profiles",
      notes: "Finds professional profiles matching this handle.",
    },
    {
      label: "GitHub Profile",
      queryPattern: 'site:github.com "{value}"',
      category: "social_profiles",
      notes: "Discovers public code repositories and user logs.",
    },
    {
      label: "Scam & Fraud Mention",
      queryPattern: '"{value}" (scam OR fraud OR complaint OR fake OR abuse)',
      category: "scam_complaints",
      notes: "Checks if the username has been flagged in consumer scam reports.",
    },
    {
      label: "Contact Clues",
      queryPattern: '"{value}" (whatsapp OR telegram OR signal OR contact)',
      category: "messaging_handles",
      notes: "Finds messaging handles linked directly to the username.",
    },
    {
      label: "Arrest or Police Mentions",
      queryPattern: '"{value}" (arrest OR police OR FIR OR court OR custody)',
      category: "legal_public_refs",
      notes: "Identifies potential criminal record context for the handle.",
    },
    {
      label: "Data Breaches / Leaks",
      queryPattern: '"{value}" (breach OR leak OR pastebin OR database OR sql)',
      category: "forums_pastes",
      notes: "Checks public code pastes/leaks matching the handle.",
    },
    {
      label: "Public Documents / PDFs",
      queryPattern: '"{value}" filetype:pdf',
      category: "documents_files",
      notes: "Finds public PDF documents or resumes referencing this handle.",
    },
    {
      label: "Office Files / Spreadsheets",
      queryPattern: '"{value}" (filetype:docx OR filetype:xlsx OR filetype:csv)',
      category: "documents_files",
      notes: "Finds public spreadsheets or documents containing the handle.",
    },
  ],

  email: [
    {
      label: "Exact Email Mention",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Locates pages explicitly listing the email address.",
    },
    {
      label: "GitHub References",
      queryPattern: '"{value}" site:github.com',
      category: "social_profiles",
      notes: "Finds public commit logs, issues, or source code containing the email.",
    },
    {
      label: "Pastebin / Paste Dumps",
      queryPattern: '"{value}" site:pastebin.com',
      category: "forums_pastes",
      notes: "Finds matching text pastes on Pastebin.",
    },
    {
      label: "LinkedIn Professional Search",
      queryPattern: '"{value}" site:linkedin.com',
      category: "social_profiles",
      notes: "Finds LinkedIn posts or profile records referencing the email.",
    },
    {
      label: "Telegram Channel Mentions",
      queryPattern: '"{value}" (site:t.me OR site:telegram.me)',
      category: "messaging_handles",
      notes: "Searches public Telegram chat archives.",
    },
    {
      label: "Resume & CV Public Files",
      queryPattern: '"{value}" ("resume" OR "cv" OR "portfolio") filetype:pdf',
      category: "documents_files",
      notes: "Locates public resume documents containing this address.",
    },
    {
      label: "Scam / Fraud Listings",
      queryPattern: '"{value}" (scam OR fraud OR fake OR phish OR bounce)',
      category: "scam_complaints",
      notes: "Queries email-based complaints and abuse reports.",
    },
  ],

  phone: [
    {
      label: "Exact Phone Number",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Queries exact match listings of the number.",
    },
    {
      label: "Formatted Indian Phone",
      queryPattern: '"+91 {value}" OR "+91-{value}"',
      category: "exact_match",
      notes: "Finds country-code formatted versions of the phone number.",
    },
    {
      label: "Scam & Complaint Lookup",
      queryPattern: '"{value}" (scam OR fraud OR complaint OR harassment OR spam)',
      category: "scam_complaints",
      notes: "Checks if the number is associated with spam calls or online fraud.",
    },
    {
      label: "WhatsApp Listings",
      queryPattern: '"{value}" site:wa.me OR "wa.me/{value}"',
      category: "messaging_handles",
      notes: "Finds direct click-to-chat WhatsApp link shortcuts.",
    },
    {
      label: "Telegram Contact References",
      queryPattern: '"{value}" (site:t.me OR site:telegram.me)',
      category: "messaging_handles",
      notes: "Checks public Telegram search linkages.",
    },
    {
      label: "UPI Payment Footprint",
      queryPattern: '"{value}" (upi OR paytm OR phonepe OR gpay)',
      category: "business_reputation",
      notes: "Locates public listings referencing UPI payments for this number.",
    },
    {
      label: "Customer Support / Fake Desk",
      queryPattern: '"{value}" ("customer care" OR "support" OR "helpline")',
      category: "business_reputation",
      notes: "Finds if the number is used on fraudulent customer support pages.",
    },
  ],

  domain: [
    {
      label: "Exact Domain Mention",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Finds all pages linking to or referencing the domain.",
    },
    {
      label: "Scam & Review Reports",
      queryPattern: '"{value}" (scam OR fraud OR fake OR review OR rating)',
      category: "scam_complaints",
      notes: "Finds online trust/complaint listings about the domain.",
    },
    {
      label: "Contact / Team Details",
      queryPattern: 'site:{value} ("contact" OR "about" OR "team" OR "support")',
      category: "business_reputation",
      notes: "Crawls subpages of the domain for company identifiers.",
    },
    {
      label: "Telegram Links",
      queryPattern: '"{value}" (site:t.me OR site:telegram.me)',
      category: "messaging_handles",
      notes: "Locates chat links sharing or associated with this domain.",
    },
    {
      label: "LinkedIn Professional Listings",
      queryPattern: 'site:linkedin.com "{value}"',
      category: "social_profiles",
      notes: "Locates company employees or business mentions on LinkedIn.",
    },
  ],

  company: [
    {
      label: "Exact Company Name",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Finds exact matches for the company name.",
    },
    {
      label: "Scam, Case or Legal Dispute",
      queryPattern: '"{value}" (scam OR fraud OR case OR lawsuit OR FIR OR court)',
      category: "scam_complaints",
      notes: "Finds legal cases or consumer disputes containing the company name.",
    },
    {
      label: "LinkedIn Corporate Page",
      queryPattern: 'site:linkedin.com/company "{value}"',
      category: "social_profiles",
      notes: "Finds corporate profiles or employee records.",
    },
    {
      label: "Social Media Mentions",
      queryPattern: '"{value}" (site:instagram.com OR site:facebook.com OR site:x.com)',
      category: "social_profiles",
      notes: "Finds promotional accounts or customer comments.",
    },
    {
      label: "Public Documents & Filings",
      queryPattern: '"{value}" filetype:pdf',
      category: "documents_files",
      notes: "Locates public audit records, reports, or legal filings.",
    },
  ],

  upi_handle: [
    {
      label: "Exact UPI Mention",
      queryPattern: '"{value}"',
      category: "exact_match",
      notes: "Finds public forums, pastebins, or web references listing this address.",
    },
    {
      label: "Scam & Fraud Complaints",
      queryPattern: '"{value}" (scam OR fraud OR cybercrime OR complaint OR police)',
      category: "scam_complaints",
      notes: "Queries fraud directories or cyber cells flagging this payment ID.",
    },
    {
      label: "Social Channel Linkage",
      queryPattern: '"{value}" (site:t.me OR site:instagram.com OR site:x.com)',
      category: "messaging_handles",
      notes: "Finds public social/telegram channels soliciting payments to this ID.",
    },
  ],

  name: [
    {
      label: "LinkedIn Profile by Name",
      queryPattern: 'site:linkedin.com/in "{value}"',
      category: "professional_academic",
      notes: "Finds LinkedIn profiles matching the suspect's full name.",
    },
    {
      label: "LinkedIn Professional Overlap",
      queryPattern: 'site:linkedin.com/in "{value}" "{context}"',
      category: "professional_academic",
      notes: "Finds LinkedIn profiles matching the full name and a specific company or college.",
    },
    {
      label: "LinkedIn Tech & Dev Mention",
      queryPattern: 'site:linkedin.com/in "{value}" "Computer Science"',
      category: "professional_academic",
      notes: "Finds LinkedIn profiles matching the full name and computer science backgrounds.",
    },
    {
      label: "Academic or Corporate Listing",
      queryPattern: '"{value}" "{context}"',
      category: "professional_academic",
      notes: "Finds public web pages mentioning the name and company/college together.",
    },
    {
      label: "Student, Hackathon or Internship leads",
      queryPattern: '"{value}" (hackathon OR internship OR student)',
      category: "professional_academic",
      notes: "Queries university student listings, hackathon tables, or internships.",
    },
    {
      label: "Public Documents / Resume PDF",
      queryPattern: '"{value}" filetype:pdf',
      category: "professional_academic",
      notes: "Locates public resume PDFs or academic rosters.",
    },
  ],
};
