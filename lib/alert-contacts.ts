export interface AlertContact {
  name: string;
  email: string;
}

// Category → list of organisations to notify.
// Replace placeholder emails with real NGO/authority contacts for production.
const CONTACTS_BY_CATEGORY: Record<string, AlertContact[]> = {
  wildlife: [
    { name: 'RSPCA Wildlife Team',  email: 'wildlife@rspca.org.uk' },
    { name: 'The Wildlife Trusts',  email: 'info@wildlifetrusts.org' },
  ],
  plant: [
    { name: 'Natural England',      email: 'enquiries@naturalengland.org.uk' },
  ],
  marine: [
    { name: 'Marine Conservation Society', email: 'info@mcsuk.org' },
  ],
  invasive: [
    { name: 'GB Non-Native Species Secretariat', email: 'nonnative@fera.gsi.gov.uk' },
    { name: 'Natural England',                   email: 'enquiries@naturalengland.org.uk' },
  ],
  habitat_destruction: [
    { name: 'Forestry Commission',  email: 'fcenquiries@forestrycommission.gov.uk' },
    { name: 'Natural England',      email: 'enquiries@naturalengland.org.uk' },
  ],
  illegal_dumping: [
    { name: 'Environment Agency',   email: 'enquiries@environment-agency.gov.uk' },
  ],
  pollution: [
    { name: 'Environment Agency',   email: 'enquiries@environment-agency.gov.uk' },
  ],
  environmental_emergency: [
    { name: 'Environment Agency Emergency Line', email: 'enquiries@environment-agency.gov.uk' },
  ],
  // alert_type values used by the reports API
  invasive_species: [
    { name: 'GB Non-Native Species Secretariat', email: 'nonnative@fera.gsi.gov.uk' },
  ],
  high_severity: [
    { name: 'Environment Agency',   email: 'enquiries@environment-agency.gov.uk' },
  ],
};

export function getAlertContacts(alertType: string): AlertContact[] {
  const matched = CONTACTS_BY_CATEGORY[alertType] ?? [];
  const admin: AlertContact = {
    name:  'BioGuard Admin',
    email: process.env.ALERT_RECIPIENT_EMAIL ?? 'admin@bioguard.co.uk',
  };
  // Always include admin; merge with matched contacts, deduplicating by email
  const all = [admin, ...matched];
  return all.filter((c, i, arr) => arr.findIndex((x) => x.email === c.email) === i);
}
