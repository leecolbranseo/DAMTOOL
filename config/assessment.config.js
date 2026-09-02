// assessment.config.js
//
// Single source of truth for the Data & Analytics Maturity Assessment.
// Per the dev spec: pillars, weighting, band structure and tie-break priority
// are all config — nothing about scoring should be hardcoded in calculateResult().
//
// ⚠️ PLACEHOLDER CONTENT: pillar wording, order, and tie-break priority below
// are drafts for testing the concept end-to-end. Lee still needs to:
//   1. Confirm/rewrite the pillar wording (draft below, from spec v0.1)
//   2. Confirm the tie-break priority ranking (currently = pillar order, 1–7)
//   3. Confirm per-pillar weighting (currently equal, weight 1 each)
// Band names/copy below ARE confirmed — mapped to the real "Data maturity
// journey" curve (Fragmented/Foundational/Operational/Optimising/Strategic),
// not the spec draft's placeholder band names.

/**
 * Each pillar has 4 answer options (A–D) scored 4/3/2/1.
 * `tieBreakPriority` = 1 is highest priority (wins ties for "primary constraint").
 */
const PILLARS = [
  {
    id: 'data_quality',
    label: 'Data accessibility & quality',
    foundation: 'Data',
    weight: 1,
    tieBreakPriority: 1,
    question: 'How easily can your team access clean, reliable data when they need it?',
    options: [
      { key: 'A', score: 4, text: 'Clean, reliable data is available on demand, with no manual work' },
      { key: 'B', score: 3, text: 'Mostly reliable, but some manual checking or cleaning is needed' },
      { key: 'C', score: 2, text: 'Data is often incomplete, inconsistent, or hard to access' },
      { key: 'D', score: 1, text: 'Data is frequently unreliable or very difficult to get hold of' },
    ],
  },
  {
    id: 'data_governance',
    label: 'Data governance & ownership',
    foundation: 'Data',
    weight: 1,
    tieBreakPriority: 2,
    question: 'How clearly defined are data ownership and processes across your organisation?',
    options: [
      { key: 'A', score: 4, text: 'Clear ownership and documented processes across the business' },
      { key: 'B', score: 3, text: 'Ownership is mostly clear, but processes are informal' },
      { key: 'C', score: 2, text: 'Ownership is unclear or inconsistent between teams' },
      { key: 'D', score: 1, text: 'No clear ownership or governance in place' },
    ],
  },
  {
    id: 'tech_stack',
    label: 'Technology & tooling',
    foundation: 'Technology',
    weight: 1,
    tieBreakPriority: 3,
    question: 'How well does your current tech stack support advanced analytics and reporting?',
    options: [
      { key: 'A', score: 4, text: 'Our stack fully supports advanced analytics and reporting needs' },
      { key: 'B', score: 3, text: 'It mostly supports our needs, with some gaps or workarounds' },
      { key: 'C', score: 2, text: 'It struggles to support what we actually need to do' },
      { key: 'D', score: 1, text: "It's a significant blocker to doing analytics well" },
    ],
  },
  {
    id: 'integration',
    label: 'Integration / unified view',
    foundation: 'Technology',
    weight: 1,
    tieBreakPriority: 4,
    question: 'How connected are your data sources into a single view of the customer or business?',
    options: [
      { key: 'A', score: 4, text: 'Fully unified — one trusted view across all major sources' },
      { key: 'B', score: 3, text: 'Mostly connected, with a few gaps or manual joins' },
      { key: 'C', score: 2, text: 'Data sits in silos that rarely get combined' },
      { key: 'D', score: 1, text: "Sources are disconnected and effectively can't be combined" },
    ],
  },
  {
    id: 'analytical_capability',
    label: 'Analytical capability',
    foundation: 'Human Insight',
    weight: 1,
    tieBreakPriority: 5,
    question: 'How confident is your team in interpreting data and turning it into action?',
    options: [
      { key: 'A', score: 4, text: 'Very confident — the team regularly turns data into clear action' },
      { key: 'B', score: 3, text: 'Reasonably confident, but it takes effort or specialist help' },
      { key: 'C', score: 2, text: 'The team struggles to interpret data with confidence' },
      { key: 'D', score: 1, text: 'The team lacks confidence or capability to use data at all' },
    ],
  },
  {
    id: 'speed_of_insight',
    label: 'Speed of insight to action',
    foundation: 'Expertise',
    weight: 1,
    tieBreakPriority: 6,
    question: 'How quickly can insights be translated into real business decisions?',
    options: [
      { key: 'A', score: 4, text: 'Insights lead to decisions quickly, often within days' },
      { key: 'B', score: 3, text: 'Reasonably quick, but there are process delays' },
      { key: 'C', score: 2, text: 'It typically takes a long time for insight to reach a decision' },
      { key: 'D', score: 1, text: "Insights rarely translate into action at all" },
    ],
  },
  {
    id: 'personalisation',
    label: 'Data-driven personalisation',
    foundation: 'Expertise',
    weight: 1,
    tieBreakPriority: 7,
    question: 'To what extent does your organisation use data to personalise experiences in real time?',
    options: [
      { key: 'A', score: 4, text: 'Real-time, dynamic personalisation across most touchpoints' },
      { key: 'B', score: 3, text: 'Some personalisation, but not real-time' },
      { key: 'C', score: 2, text: 'Data is collected but rarely used to personalise' },
      { key: 'D', score: 1, text: 'No meaningful personalisation' },
    ],
  },
];

/**
 * Constraint eligibility floor (WPRA lesson, built in from day one):
 * a pillar can only be named the "biggest limitation" if its raw score
 * is genuinely weak (C or D). A mostly-A/B respondent should never be
 * told they have a limitation that doesn't exist.
 */
const CONSTRAINT_ELIGIBILITY_FLOOR = 2; // raw score <= this qualifies

/**
 * Band structure — mapped to Fresh Egg's actual "Data maturity journey"
 * curve (Fragmented → Foundational → Operational → Optimising → Strategic),
 * matching the client-situation/commercial-risk language already used on
 * that framework, not the spec draft's placeholder band names.
 * Thresholds are derived from the 7-pillar, equal-weight, 4-point-scale
 * config above: min possible = 7, max possible = 28.
 * ⚠️ If pillar count or weighting changes, these thresholds must be recalculated.
 */
const BANDS = [
  {
    id: 'fragmented',
    name: 'Fragmented',
    color: 'blue',
    min: 7,
    max: 10,
    headline: 'Conflicting data is holding back good decisions',
    intro:
      'Different reports show different figures, and visibility across the business is poor. Right now, decisions tend to rest on assumptions rather than evidence — which risks wasted investment, stakeholder misalignment, and missed growth opportunities.',
    teaseHeadline: 'Your data has real gaps, with a clear path to close them',
    teaseCopy:
      "We've identified structural gaps that are significantly limiting your ability to make confident, data-led decisions.",
    whatThisMeansHeadline: 'These gaps typically result in:',
    whatThisMeansPoints: [
      'Decisions based on assumptions rather than evidence',
      'Wasted investment and misaligned stakeholders',
      'Missed growth opportunities',
    ],
    emailAccent: { text: '#3E86AE', bg: '#E8F3FA' },
    recommendedService: 'Data Landscape Audit',
  },
  {
    id: 'foundational',
    name: 'Foundational',
    color: 'green',
    min: 11,
    max: 14,
    headline: 'Your data is becoming trusted, but it takes real effort',
    intro:
      "Data is starting to be trusted, but analysts still spend hours cleaning it by hand. That means teams spend more time finding, validating and reconciling data than acting on it — slowing progress and adding operational cost.",
    teaseHeadline: 'Your data foundations are forming, with clear next steps ahead',
    teaseCopy:
      "We've identified gaps that are limiting how efficiently your team can turn data into action.",
    whatThisMeansHeadline: 'These gaps typically result in:',
    whatThisMeansPoints: [
      'Analysts spending hours cleaning data instead of acting on it',
      'Slower progress towards a trusted single view',
      'Increasing operational cost',
    ],
    emailAccent: { text: '#3F9973', bg: '#E9F7F0' },
    recommendedService: 'Unified Analytics Platform (Mastertable)',
  },
  {
    id: 'operational',
    name: 'Operational',
    color: 'yellow',
    min: 15,
    max: 18,
    headline: 'Reporting is improving, but insight often stalls before action',
    intro:
      "Reporting and monitoring are getting better, and dashboards exist — but they don't always get acted on. The organisation can see what's happening, but struggles to consistently translate that insight into improved marketing performance and commercial outcomes.",
    teaseHeadline: 'Your reporting is solid, with room to turn insight into action',
    teaseCopy: "We've identified where insight is stalling before it reaches a decision.",
    whatThisMeansHeadline: 'This typically results in:',
    whatThisMeansPoints: [
      'Dashboards that exist but rarely get acted on',
      'Insight that does not consistently reach commercial decisions',
      'Marketing performance and reporting confidence out of step',
    ],
    emailAccent: { text: '#B8951F', bg: '#FBF3DC' },
    recommendedService: 'Automated Anomaly & Insight Detection',
  },
  {
    id: 'optimising',
    name: 'Optimising',
    color: 'orange',
    min: 19,
    max: 22,
    headline: 'Targeting is sharper, but performance gains are plateauing',
    intro:
      "Targeting and attribution have improved, but marketing performance is starting to plateau. Further gains are getting harder to achieve, and investment may not yet be directed towards the highest-value opportunities.",
    teaseHeadline: 'Your data maturity is strong, with room to sharpen further',
    teaseCopy: "We've identified where further gains are getting harder to reach.",
    whatThisMeansHeadline: 'This typically results in:',
    whatThisMeansPoints: [
      'Performance gains becoming harder to achieve',
      'Investment not always directed to the highest-value opportunities',
      'Marketing performance starting to plateau',
    ],
    emailAccent: { text: '#C97A2E', bg: '#FCEEE0' },
    recommendedService: 'Smart Bidding Intelligence',
  },
  {
    id: 'strategic',
    name: 'Strategic',
    color: 'pink',
    min: 23,
    max: 28,
    headline: "You're making predictive, investment-led decisions",
    intro:
      'Your organisation is already looking at AI, forecasting and predictive modelling to guide decisions. The main commercial risk now is competitors with more advanced data capabilities responding faster and capturing market share.',
    teaseHeadline: 'Your data maturity is excelling, with fine-tuning still to gain',
    teaseCopy:
      "Even top performers find new opportunities with a closer look — here's where yours might be.",
    whatThisMeansHeadline: 'With minimal constraints, your business is well placed to:',
    whatThisMeansPoints: [
      'Make predictive, investment-led decisions with confidence',
      'Respond faster than competitors relying on less mature data',
      'Capture market share through faster iteration',
    ],
    emailAccent: { text: '#B45C86', bg: '#FBEAF1' },
    recommendedService: 'Marketing Mix Modelling (MMM)',
  },
];

module.exports = { PILLARS, BANDS, CONSTRAINT_ELIGIBILITY_FLOOR };
