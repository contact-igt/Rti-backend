export type AuthorityRecord = {
  id: string;
  name: string;
  department?: string;
  jurisdiction: 'central';
  topics: string[];
  keywords: string[];
  description: string;
  source: string;
};

export const centralAuthorities = [
  {
    id: 'central-doppw',
    name: "Department of Pension & Pensioners' Welfare",
    department: 'Ministry of Personnel, Public Grievances and Pensions',
    jurisdiction: 'central',
    topics: [
      'pension application',
      'pension application processing',
      'pension processing',
      'pension policy',
      'pension grievance'
    ],
    keywords: ['pension', 'pensioner', 'retirement benefit', 'family pension'],
    description: 'Handles Central Government pension policy and pensioners’ welfare matters.',
    source: 'https://www.doppw.gov.in/'
  },
  {
    id: 'central-cpao',
    name: 'Central Pension Accounting Office',
    department: 'Department of Expenditure, Ministry of Finance',
    jurisdiction: 'central',
    topics: ['pension payment', 'pension accounting', 'pension disbursement', 'pension payment order'],
    keywords: ['pension', 'ppo', 'bank', 'arrears', 'payment'],
    description: 'Handles authorization, accounting and bank-related payment of Central civil pensions.',
    source: 'https://cpao.nic.in/about.php'
  },
  {
    id: 'central-dopt',
    name: 'Department of Personnel and Training',
    department: 'Ministry of Personnel, Public Grievances and Pensions',
    jurisdiction: 'central',
    topics: ['central government recruitment', 'service rules', 'personnel policy', 'right to information policy'],
    keywords: ['recruitment', 'appointment', 'service record', 'personnel', 'civil service', 'rti policy'],
    description: 'Handles Central Government personnel, service and administrative policy matters.',
    source: 'https://dopt.gov.in/'
  },
  {
    id: 'central-higher-education',
    name: 'Department of Higher Education',
    department: 'Ministry of Education',
    jurisdiction: 'central',
    topics: ['higher education policy', 'central university', 'college education', 'scholarship administration'],
    keywords: ['university', 'college', 'higher education', 'ugc', 'scholarship'],
    description: 'Handles Central Government higher-education policy and programmes.',
    source: 'https://www.education.gov.in/en/higher_education'
  },
  {
    id: 'central-school-education',
    name: 'Department of School Education and Literacy',
    department: 'Ministry of Education',
    jurisdiction: 'central',
    topics: ['school education policy', 'school literacy programme', 'central school programme'],
    keywords: ['school', 'literacy', 'teacher education', 'school education'],
    description: 'Handles Central Government school-education and literacy policy and programmes.',
    source: 'https://www.education.gov.in/en/school-education'
  },
  {
    id: 'central-cbse',
    name: 'Central Board of Secondary Education',
    department: 'Ministry of Education',
    jurisdiction: 'central',
    topics: ['cbse examination', 'cbse result', 'cbse affiliation', 'central board certificate'],
    keywords: ['cbse', 'board exam', 'marksheet', 'school affiliation', 'certificate'],
    description: 'Handles CBSE examinations, results, certificates and school affiliation matters.',
    source: 'https://www.cbse.gov.in/'
  },
  {
    id: 'central-posts',
    name: 'Department of Posts',
    department: 'Ministry of Communications',
    jurisdiction: 'central',
    topics: ['postal service', 'postal savings', 'mail delivery', 'post office scheme'],
    keywords: ['post office', 'postal', 'speed post', 'mail', 'parcel'],
    description: 'Handles India Post services, postal operations and post-office schemes.',
    source: 'https://www.indiapost.gov.in/'
  },
  {
    id: 'central-revenue',
    name: 'Department of Revenue',
    department: 'Ministry of Finance',
    jurisdiction: 'central',
    topics: ['direct tax policy', 'indirect tax policy', 'customs administration', 'revenue administration'],
    keywords: ['income tax', 'gst', 'customs', 'tax', 'revenue'],
    description: 'Handles Central Government revenue administration and tax-policy matters.',
    source: 'https://dor.gov.in/'
  },
  {
    id: 'central-mha',
    name: 'Ministry of Home Affairs',
    jurisdiction: 'central',
    topics: ['citizenship administration', 'central internal security', 'union territory administration'],
    keywords: ['citizenship', 'internal security', 'union territory', 'foreign contribution'],
    description: 'Handles Central Government home affairs, citizenship and internal-security matters.',
    source: 'https://www.mha.gov.in/'
  },
  {
    id: 'central-mea-psp',
    name: 'Passport Seva Project (PSP) Division',
    department: 'Ministry of External Affairs',
    jurisdiction: 'central',
    topics: [
      'passport',
      'passport seva',
      'passport application',
      'passport issuance',
      'passport reissue',
      'passport renewal',
      'passport status',
      'passport office',
      'regional passport office',
      'psk',
      'passport seva kendra',
      'psp division'
    ],
    keywords: ['passport', 'passport seva', 'psk', 'passport seva kendra', 'psp division'],
    description: 'Handles passport services and Passport Seva operations under the Ministry of External Affairs.',
    source: 'https://www.passportindia.gov.in/psp/RTI'
  },
  {
    id: 'central-railways',
    name: 'Ministry of Railways',
    jurisdiction: 'central',
    topics: ['railway service', 'railway recruitment', 'railway pension', 'train operation'],
    keywords: ['railway', 'train', 'irctc', 'rail ticket', 'rail employee'],
    description: 'Handles Indian Railways policy, operations and railway-administration matters.',
    source: 'https://indianrailways.gov.in/'
  }
] satisfies AuthorityRecord[];
