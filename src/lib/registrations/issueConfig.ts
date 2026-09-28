// Issue-details fields for a registration, per service. Generalises
// nextfrontend's BookingModal Step2 (built for refrigerators) to every
// service in the navbar (backend/scripts/seedNavbarServices.ts).
//
// Looked up by the service link's slug (last segment of its website path);
// services an admin adds later fall back to a keyword match on the name,
// then to GENERAL_CONFIG.

export interface IssueConfig {
  // Appliance services ask for brand + model number; others hide them.
  showBrand: boolean;
  // Noun used in labels, e.g. "Refrigerator" → "Select Refrigerator Brand".
  subject: string;
  typeLabel: string;
  typeOptions: string[];
  sizeLabel?: string;
  sizeOptions?: string[];
  issueLabel: string;
  issues: string[];
  placeholder: string;
}

const APPLIANCE_ISSUE_LABEL = 'What seems to be the issue?';
const NEED_LABEL = 'What do you need?';
const PROPERTY_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Villa', 'Office'];

const appliance = (config: Omit<IssueConfig, 'showBrand' | 'issueLabel'>): IssueConfig => ({
  showBrand: true,
  issueLabel: APPLIANCE_ISSUE_LABEL,
  ...config,
});

const service = (config: Omit<IssueConfig, 'showBrand' | 'issueLabel'> & { issueLabel?: string }): IssueConfig => ({
  showBrand: false,
  issueLabel: NEED_LABEL,
  ...config,
});

const PEST_CONTROL_BASE = {
  typeLabel: 'Property Type',
  typeOptions: PROPERTY_TYPES,
  sizeLabel: 'Treatment Area',
  sizeOptions: ['Kitchen only', 'Kitchen + Bathrooms', 'Full home', 'Full home + Balcony'],
  issueLabel: 'What is the pest problem?',
};

const CONFIG_BY_SLUG: Record<string, IssueConfig> = {
  // ─── Home Appliance ────────────────────────────────────────────────────────
  'refrigerator-service': appliance({
    subject: 'Refrigerator',
    typeLabel: 'Refrigerator Type',
    typeOptions: ['Single Door', 'Double Door', 'Side by Side', 'Triple Door'],
    sizeLabel: 'Refrigerator Capacity (in Liters)',
    sizeOptions: ['Below 200L', '200L - 300L', '300L - 400L', 'Above 400L'],
    issues: ['Not Cooling', 'Cooling Issues', 'Gas Leakage', 'Water Leakage', 'Ice Build-up', 'Strange Noise', 'Door Issue', 'Other Issue'],
    placeholder: 'E.g. Refrigerator is not cooling from last 2 days, not freezing properly, etc.',
  }),
  'ac-service': appliance({
    subject: 'AC',
    typeLabel: 'AC Type',
    typeOptions: ['Split AC', 'Window AC', 'Cassette AC', 'Portable AC'],
    sizeLabel: 'AC Capacity (in Tons)',
    sizeOptions: ['1 Ton', '1.5 Ton', '2 Ton', 'Above 2 Ton'],
    issues: ['Not Cooling', 'Water Leakage', 'Gas Refill', 'Strange Noise', 'Bad Smell', 'Not Turning On', 'Installation / Uninstall', 'Deep Clean Service'],
    placeholder: 'E.g. AC is not cooling properly and water is dripping from the indoor unit.',
  }),
  'washing-machine-services': appliance({
    subject: 'Washing Machine',
    typeLabel: 'Washing Machine Type',
    typeOptions: ['Front Load', 'Top Load', 'Semi Automatic'],
    sizeLabel: 'Washing Machine Capacity (in Kg)',
    sizeOptions: ['Below 6 Kg', '6 - 7 Kg', '7 - 8 Kg', 'Above 8 Kg'],
    issues: ['Not Draining', 'Not Spinning', 'Strange Noise', 'Error Code on Display', 'Water Leakage', 'Door Lock Issue', 'Not Turning On', 'Other Issue'],
    placeholder: 'E.g. Machine stops mid-cycle and water does not drain.',
  }),
  'television-repair-services': appliance({
    subject: 'TV',
    typeLabel: 'TV Type',
    typeOptions: ['LED / LCD', 'Smart TV', 'OLED / QLED', 'Plasma'],
    sizeLabel: 'Screen Size',
    sizeOptions: ['Below 32"', '32" - 43"', '43" - 55"', 'Above 55"'],
    issues: ['No Display', 'No Sound', 'Lines on Screen', 'Smart TV Not Connecting', 'Remote / Port Issue', 'Not Turning On', 'Wall Mount / Installation', 'Other Issue'],
    placeholder: 'E.g. TV turns on but there is no picture, only sound.',
  }),
  'microwave-oven-services': appliance({
    subject: 'Microwave',
    typeLabel: 'Microwave Type',
    typeOptions: ['Solo', 'Grill', 'Convection', 'OTG'],
    sizeLabel: 'Microwave Capacity (in Liters)',
    sizeOptions: ['Below 20L', '20L - 25L', '25L - 30L', 'Above 30L'],
    issues: ['Not Heating', 'Sparking Inside', 'Turntable Not Rotating', 'Display / Panel Error', 'Door Not Closing', 'Fan Noise', 'Not Turning On', 'Other Issue'],
    placeholder: 'E.g. Microwave runs but food does not heat up.',
  }),
  'geyser-repair-services': appliance({
    subject: 'Geyser',
    typeLabel: 'Geyser Type',
    typeOptions: ['Storage Geyser', 'Instant Geyser', 'Gas Geyser', 'Solar Heater'],
    sizeLabel: 'Geyser Capacity (in Liters)',
    sizeOptions: ['Below 10L', '10L - 15L', '15L - 25L', 'Above 25L'],
    issues: ['No Hot Water', 'Water Leakage', 'Tripping the MCB', 'Thermostat Issue', 'Installation', 'Descaling & Servicing', 'Strange Noise', 'Other Issue'],
    placeholder: 'E.g. Geyser trips the MCB whenever it is switched on.',
  }),
  'chimney-repair-services': appliance({
    subject: 'Chimney',
    typeLabel: 'Chimney Type',
    typeOptions: ['Wall Mounted', 'Island', 'Built-in', 'Straight Line'],
    sizeLabel: 'Chimney Size',
    sizeOptions: ['60 cm', '75 cm', '90 cm'],
    issues: ['Low Suction', 'Loud Motor Noise', 'Filter Cleaning / Replacement', 'Light Not Working', 'Auto-clean Not Working', 'Installation', 'Oil Leakage', 'Other Issue'],
    placeholder: 'E.g. Suction is very weak and the motor makes noise.',
  }),

  // ─── Pest Control ──────────────────────────────────────────────────────────
  'general-pest-control': service({
    ...PEST_CONTROL_BASE,
    subject: 'Pest Control',
    issues: ['Cockroach Infestation', 'Ants Everywhere', 'Lizards & Spiders', 'General Maintenance', 'Post-renovation Treatment', 'Others'],
    placeholder: 'E.g. Cockroaches in the kitchen and bathrooms for the last month.',
  }),
  'termite-control': service({
    ...PEST_CONTROL_BASE,
    subject: 'Termite Control',
    sizeOptions: ['Single room', 'Furniture only', 'Full home', 'Pre-construction site'],
    issues: ['Active Termite Trails', 'Wooden Furniture Damage', 'Wall / Ceiling Infestation', 'Pre-construction Treatment', 'Preventive Treatment', 'Others'],
    placeholder: 'E.g. Termite trails on the bedroom wardrobe and door frames.',
  }),
  'cockroach-control': service({
    ...PEST_CONTROL_BASE,
    subject: 'Cockroach Control',
    issues: ['Kitchen Infestation', 'Bathroom Cockroaches', 'Small Brown Cockroaches', 'American Cockroaches', 'Recurring Problem', 'Others'],
    placeholder: 'E.g. Small cockroaches inside kitchen cabinets and near the sink.',
  }),
  'mosquito-control': service({
    ...PEST_CONTROL_BASE,
    subject: 'Mosquito Control',
    sizeOptions: ['Indoor only', 'Indoor + Balcony', 'Terrace / Garden', 'Society common area'],
    issues: ['Adult Mosquitoes Indoors', 'Balcony / Terrace Larvae', 'Society Common Areas', 'Water Body Treatment', 'Recurring Problem', 'Others'],
    placeholder: 'E.g. Heavy mosquitoes in the evening, stagnant water on the terrace.',
  }),
  'bed-bug-treatment': service({
    ...PEST_CONTROL_BASE,
    subject: 'Bed Bug Treatment',
    sizeLabel: 'Number of Beds / Sofas',
    sizeOptions: ['1', '2', '3', '4', '5+'],
    issues: ['Mattress Infestation', 'Sofa Infestation', 'Full Apartment Treatment', 'Post-travel / Hotel Exposure', 'Recurring Problem', 'Others'],
    placeholder: 'E.g. Bed bugs in two mattresses and the living-room sofa.',
  }),

  // ─── Sofa Cleaning ─────────────────────────────────────────────────────────
  'sofa-shampooing': service({
    subject: 'Sofa',
    typeLabel: 'Sofa Material',
    typeOptions: ['Fabric', 'Leather', 'Suede / Velvet', 'Rexine'],
    sizeLabel: 'Number of Seats',
    sizeOptions: ['1 - 3 Seats', '4 - 5 Seats', '6 - 7 Seats', '8+ Seats'],
    issues: ['Deep Stains', 'Bad Odour', 'General Dust & Grime', 'Post-party Cleanup', 'Pet Hair & Odour', 'Others'],
    placeholder: 'E.g. 5-seater fabric sofa with tea stains on two cushions.',
  }),
  'sofa-dry-cleaning': service({
    subject: 'Sofa',
    typeLabel: 'Sofa Material',
    typeOptions: ['Suede', 'Velvet', 'Delicate Fabric', 'Leather'],
    sizeLabel: 'Number of Seats',
    sizeOptions: ['1 - 3 Seats', '4 - 5 Seats', '6 - 7 Seats', '8+ Seats'],
    issues: ['Suede / Velvet Sofa', 'Delicate Fabric', 'Quick Refresh Needed', 'Light Stains', 'Post-guest Cleaning', 'Others'],
    placeholder: 'E.g. Velvet 3-seater needs a refresh before guests arrive.',
  }),
  'carpet-cleaning': service({
    subject: 'Carpet',
    typeLabel: 'Carpet Type',
    typeOptions: ['Rug', 'Wall-to-wall', 'Persian / Handmade', 'Office Carpet'],
    sizeLabel: 'Carpet Area (sq ft)',
    sizeOptions: ['Below 50 sq ft', '50 - 100 sq ft', '100 - 200 sq ft', 'Above 200 sq ft'],
    issues: ['Heavy Soiling', 'Wine / Food Stains', 'Pet Odour', 'Post-renovation Dust', 'Rug Refresh', 'Others'],
    placeholder: 'E.g. 8x10 ft rug with food stains near the dining area.',
  }),
  'mattress-cleaning': service({
    subject: 'Mattress',
    typeLabel: 'Mattress Size',
    typeOptions: ['Single', 'Double', 'Queen', 'King'],
    sizeLabel: 'Number of Mattresses',
    sizeOptions: ['1', '2', '3', '4+'],
    issues: ['Dust Mite Allergy', 'Sweat Stains', 'Bad Odour', 'Post-illness Cleaning', 'General Deep Clean', 'Others'],
    placeholder: 'E.g. Two queen mattresses with sweat stains, family member has dust allergy.',
  }),

  // ─── Home Cleaning ─────────────────────────────────────────────────────────
  'home-cleaning': service({
    subject: 'Home',
    typeLabel: 'Property Type',
    typeOptions: PROPERTY_TYPES,
    sizeLabel: 'Furnishing',
    sizeOptions: ['Unfurnished', 'Semi-furnished', 'Fully Furnished'],
    issues: ['Full-home Deep Clean', 'Move-in / Move-out', 'Post-renovation', 'Pre-festival Cleaning', 'General Maintenance', 'Others'],
    placeholder: 'E.g. 3 BHK semi-furnished flat, move-in cleaning before shifting.',
  }),
  'kitchen-cleaning': service({
    subject: 'Kitchen',
    typeLabel: 'Kitchen Type',
    typeOptions: ['Modular', 'Non-modular', 'Open Kitchen'],
    sizeLabel: 'Kitchen Size',
    sizeOptions: ['Small', 'Medium', 'Large'],
    issues: ['Heavy Grease', 'Chimney Exterior', 'Cabinet Interiors', 'Sink & Tap Descaling', 'Backsplash Tiles', 'Others'],
    placeholder: 'E.g. Modular kitchen with heavy grease on tiles and cabinets.',
  }),
  'bathroom-cleaning': service({
    subject: 'Bathroom',
    typeLabel: 'Bathroom Type',
    typeOptions: ['Indian', 'Western', 'With Bathtub'],
    sizeLabel: 'Number of Bathrooms',
    sizeOptions: ['1', '2', '3', '4+'],
    issues: ['Hard Water Stains', 'Grout Blackening', 'Bad Odour', 'Descaling Fittings', 'Full Sanitisation', 'Others'],
    placeholder: 'E.g. Two bathrooms with hard water stains on tiles and taps.',
  }),

  // ─── Beauty & Salon ────────────────────────────────────────────────────────
  'beauty-salon-services': service({
    subject: 'Salon',
    typeLabel: 'Service For',
    typeOptions: ['Women', 'Girls (below 16)'],
    sizeLabel: 'Number of People',
    sizeOptions: ['1', '2', '3', '4+'],
    issueLabel: 'Which services?',
    issues: ['Waxing', 'Threading & De-tan', 'Facial & Clean-up', 'Hair Spa / Haircut', 'Manicure & Pedicure', 'Others'],
    placeholder: 'E.g. Full-arm waxing and facial for 2 people.',
  }),
  'salon-for-men': service({
    subject: 'Salon',
    typeLabel: 'Service For',
    typeOptions: ['Men', 'Boys (below 16)'],
    sizeLabel: 'Number of People',
    sizeOptions: ['1', '2', '3', '4+'],
    issueLabel: 'Which services?',
    issues: ['Haircut', 'Beard Styling', 'Facial & Clean-up', 'Hair Colour', 'Head Massage', 'Others'],
    placeholder: 'E.g. Haircut and beard styling for 2 people.',
  }),
  'spa-massage': service({
    subject: 'Spa',
    typeLabel: 'Therapist Preference',
    typeOptions: ['Female Therapist', 'Male Therapist', 'No Preference'],
    sizeLabel: 'Session Duration',
    sizeOptions: ['60 min', '90 min', '120 min'],
    issueLabel: 'Which massage?',
    issues: ['Swedish Relaxation', 'Deep Tissue', 'Aromatherapy', 'Head & Shoulder', 'Foot Reflexology', 'Others'],
    placeholder: 'E.g. 90-minute deep tissue massage, lower back pain.',
  }),
  'makeup-services': service({
    subject: 'Makeup',
    typeLabel: 'Occasion',
    typeOptions: ['Party', 'Engagement', 'Wedding', 'Photoshoot'],
    sizeLabel: 'Number of People',
    sizeOptions: ['1', '2', '3', '4+'],
    issueLabel: 'Which makeup?',
    issues: ['Party Makeup', 'Engagement', 'Bridal Makeup', 'Airbrush HD', 'Trial Session', 'Others'],
    placeholder: 'E.g. Bridal makeup with hair styling, trial session needed a week before.',
  }),
};

// For service links added later with a slug not listed above.
const KEYWORD_FALLBACKS: { match: RegExp; slug: string }[] = [
  { match: /refrigerator|fridge/i, slug: 'refrigerator-service' },
  { match: /\bac\b|air ?condition/i, slug: 'ac-service' },
  { match: /washing/i, slug: 'washing-machine-services' },
  { match: /\btv\b|television/i, slug: 'television-repair-services' },
  { match: /microwave|oven/i, slug: 'microwave-oven-services' },
  { match: /geyser|water heater/i, slug: 'geyser-repair-services' },
  { match: /chimney/i, slug: 'chimney-repair-services' },
  { match: /termite/i, slug: 'termite-control' },
  { match: /pest|cockroach|mosquito|bug/i, slug: 'general-pest-control' },
  { match: /sofa/i, slug: 'sofa-shampooing' },
  { match: /carpet|rug/i, slug: 'carpet-cleaning' },
  { match: /mattress/i, slug: 'mattress-cleaning' },
  { match: /kitchen/i, slug: 'kitchen-cleaning' },
  { match: /bathroom/i, slug: 'bathroom-cleaning' },
  { match: /clean/i, slug: 'home-cleaning' },
  { match: /makeup/i, slug: 'makeup-services' },
  { match: /spa|massage/i, slug: 'spa-massage' },
  { match: /men/i, slug: 'salon-for-men' },
  { match: /salon|beauty/i, slug: 'beauty-salon-services' },
];

export const GENERAL_CONFIG: IssueConfig = service({
  subject: 'Service',
  typeLabel: 'Service Type',
  typeOptions: ['Repair', 'Installation', 'Servicing', 'Inspection'],
  issues: ['Repair', 'Installation', 'Servicing / Maintenance', 'Deep Cleaning', 'Inspection', 'Other'],
  placeholder: 'E.g. Describe the work needed, area size, number of rooms, etc.',
});

export function getIssueConfig(service?: { name: string; path: string }): IssueConfig {
  if (!service) return GENERAL_CONFIG;
  const slug = service.path.split('/').filter(Boolean).pop() ?? '';
  if (CONFIG_BY_SLUG[slug]) return CONFIG_BY_SLUG[slug];
  const fallback = KEYWORD_FALLBACKS.find(({ match }) => match.test(service.name));
  return fallback ? CONFIG_BY_SLUG[fallback.slug] : GENERAL_CONFIG;
}
