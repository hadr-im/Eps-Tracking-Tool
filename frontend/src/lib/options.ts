/*
  The fixed vocabularies the filters offer.

  These are deliberately hard-coded rather than derived from whatever happens
  to be in the database. A filter built from existing values can only ever
  offer what has already been recorded, so a university with no leads yet
  silently disappears from the list — and a typo in one row becomes a filter
  option of its own. Keeping the canonical list here means the filters stay
  the same on every page and in every department.

  Both lists mirror the sign-up form, so they must be edited together with it.
*/

/*
  The LC's catchment: Sousse and the surrounding institutions.

  `value` is the institution's code, not its display name, because that is the
  only part of the stored value that is stable. The sign-up form has written
  the same place several different ways over time — "ISET Sousse" and "ISET:
  Institut Supérieur des Études Technologiques de Sousse" are both in the data,
  and EPI alone appears under two spellings — so filtering on a full name would
  match one variant and silently drop the rest.

  The API treats this value as a prefix, which catches every spelling of a
  given institution. The codes are distinct prefixes of one another's: ISSAT
  and ISSI, ISIS and ISITCOM, ESSTS and ESSTHS all stay separate.
*/
export const UNIVERSITIES = [
  { value: 'FSEG',    label: 'FSEG Sousse' },
  { value: 'FLSH',    label: 'FLSH Sousse' },
  // Stored under the GFI code: École Polytechnique Privée de Sousse.
  { value: 'GFI',     label: 'Polytech Sousse' },
  { value: 'UPSAT',   label: 'UPSAT Sousse' },
  { value: 'EPI',     label: 'EPI Group' },
  { value: 'ISBAS',   label: 'ISBAS Sousse' },
  { value: 'IHEC',    label: 'IHEC Sousse' },
  { value: 'FMS',     label: 'FMS' },
  // Recorded as ISSI: Institut Supérieur des Sciences Infirmières de Sousse.
  { value: 'ISSI',    label: 'ISSISO' },
  { value: 'ISSAT',   label: 'ISSAT Sousse' },
  { value: 'ISET',    label: 'ISET Sousse' },
  { value: 'FDSP',    label: 'FDSP Sousse' },
  { value: 'IMSET',   label: 'IMSET Sousse' },
  { value: 'ENISO',   label: 'ENISO' },
  { value: 'ISITCOM', label: 'ISITCOM Hammam Sousse' },
  { value: 'ISA',     label: 'ISA Chott Mariem' },
  { value: 'ISGS',    label: 'ISGS' },
  { value: 'ESSTS',   label: 'ESSTS Sousse' },
  { value: 'ISFF',    label: 'ISFF Sousse' },
  { value: 'ISTLS',   label: 'ISTLS Sousse' },
  { value: 'ESPITA',  label: 'ESPITA Sousse' },
  { value: 'ESSTHS',  label: 'ESSTHS Hammam Sousse' },
  { value: 'IHES',    label: 'IHES Sousse' },
  { value: 'ESTIM',   label: 'ESTIM Sousse' },
  { value: 'ISIS',    label: 'ISIS Sousse' },
  { value: 'Horizon', label: 'Horizon School of Digital Technologies' },
  { value: 'ISMS',    label: 'ISMS Sousse' },
] as const;

// "Academic Background" on the sign-up form.
export const FIELDS_OF_STUDY = [
  'Accounting',
  'Architecture',
  'Arts',
  'Audit',
  'Automotive engineering',
  'Banking',
  'Biomedical Science',
  'Business administration',
  'Civil engineering',
  'Communication & journalism',
  'Computer engineering',
  'Computer sciences',
  'Design',
  'Economics',
  'Education',
  'Electrical engineering',
  'Electronics engineering',
  'Entrepreneurship',
  'Finance',
  'Graphic design',
  'Human Resources',
  'Industrial engineering',
  'Languages',
  'Law',
  'Literature',
  'Logistics',
  'Marketing',
  'Mathematics',
  'Mechanical engineering',
  'Media Arts',
  'Nursing',
  'Sales',
  'Social Work',
  'Software development and programming',
  'Statistics',
  'Sustainability',
  'Systems and Computing Engineering',
  'Telecommunication Engineering',
  'Tourism & hotel management',
  // Last deliberately: it is the catch-all, not another subject.
  'Other',
] as const;

/*
  Stored as a number, so the label carries the ordinal and the value stays
  comparable. Five covers the Tunisian licence/master/engineering span.
*/
export const YEARS_OF_STUDY = [
  { value: '1', label: '1st year' },
  { value: '2', label: '2nd year' },
  { value: '3', label: '3rd year' },
  { value: '4', label: '4th year' },
  { value: '5', label: '5th year' },
] as const;
