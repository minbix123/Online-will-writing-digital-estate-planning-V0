/**
 * Domain Fixtures for Indian Online Will-Writing & Digital Estate Planning Platform
 * Authoritative source of realistic test data covering Bangalore, Mumbai, Delhi, NRI, etc.
 */

const fixtures = {
  // Demo credentials per PROJECT.md § Feature 8 & R3
  demoUsers: {
    customer: {
      email: 'customer@demo.com',
      password: 'password123',
      name: 'Demo Customer',
      role: 'CUSTOMER'
    },
    nriCustomer: {
      email: 'nri@demo.com',
      password: 'password123',
      name: 'NRI Customer',
      role: 'CUSTOMER'
    },
    lawyer: {
      email: 'lawyer@demo.com',
      password: 'password123',
      name: 'Demo Lawyer',
      role: 'LAWYER'
    },
    admin: {
      email: 'admin@demo.com',
      password: 'password123',
      name: 'Demo Admin',
      role: 'ADMIN'
    }
  },

  // Testators across Indian geographic and legal profiles
  testators: {
    bangaloreTech: {
      fullName: 'Aarav Sharma',
      dateOfBirth: '1992-05-14',
      nationality: 'Indian',
      address: 'Flat 402, Palm Meadows, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      email: 'aarav.sharma@example.com',
      phone: '+91 98450 12345',
      maritalStatus: 'Married',
      spouseName: 'Meera Sharma',
      hasChildren: 'Yes',
      hasMinorChildren: 'Yes'
    },
    mumbaiBusiness: {
      fullName: 'Vikram Singhania',
      dateOfBirth: '1956-11-20',
      nationality: 'Indian',
      address: '12-A, Sea Face Towers, Worli',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      email: 'vikram.singhania@example.com',
      phone: '+91 98200 54321',
      maritalStatus: 'Married',
      spouseName: 'Sunita Singhania',
      hasChildren: 'Yes',
      hasMinorChildren: 'No',
      hasExistingWill: 'Yes'
    },
    dubaiNRI: {
      fullName: 'Rajesh Patel',
      dateOfBirth: '1981-08-05',
      nationality: 'Indian',
      address: 'Villa 14, Arabian Ranches',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      email: 'rajesh.patel@example.com',
      phone: '+971 50 123 4567',
      maritalStatus: 'Married',
      spouseName: 'Kavita Patel',
      isNRI: 'Yes',
      countryOfResidence: 'United Arab Emirates',
      foreignAssetCountries: 'UAE, Singapore'
    },
    delhiRetired: {
      fullName: 'Col. Devendra Verma',
      dateOfBirth: '1950-03-12',
      nationality: 'Indian',
      address: 'House 88, Sector 15A',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      email: 'col.verma@example.com',
      phone: '+91 98110 99887',
      maritalStatus: 'Widowed',
      hasChildren: 'Yes',
      hasMinorChildren: 'No',
      hasExistingWill: 'No'
    },
    singleYoung: {
      fullName: 'Rohan Deshmukh',
      dateOfBirth: '1998-09-25',
      nationality: 'Indian',
      address: 'Flat 101, Aundh Heights',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      email: 'rohan.d@example.com',
      phone: '+91 97654 32100',
      maritalStatus: 'Single',
      hasChildren: 'No',
      hasMinorChildren: 'No',
      hasExistingWill: 'No'
    }
  },

  // Children and Guardians
  guardianship: {
    children: [
      { name: 'Ananya Sharma', dateOfBirth: '2020-04-10', relationship: 'Biological' }, // Minor (age 6)
      { name: 'Kabir Sharma', dateOfBirth: '2023-01-15', relationship: 'Biological' }    // Minor (age 3)
    ],
    guardian: {
      guardianName: 'Sunita Sharma',
      guardianRelationship: 'Paternal Aunt',
      guardianAddress: 'House 45, Indiranagar, Bengaluru, Karnataka - 560038',
      alternateGuardianName: 'Ramesh Sharma'
    }
  },

  // Indian Asset Portfolios
  assets: {
    bangalorePortfolio: [
      {
        type: 'Property',
        description: 'Residential Apartment #402, Palm Meadows, Whitefield, Bengaluru (PID: 104-W012-402)',
        value: 17500000,
        ownershipPercentage: 100
      },
      {
        type: 'BankAccount',
        description: 'HDFC Bank Savings A/c No. 50100234567890, Indiranagar Branch, Bengaluru',
        value: 1250000,
        ownershipPercentage: 100
      },
      {
        type: 'Investments',
        description: 'Zerodha Broking Demat A/c 1208160012345678 (Equity, Mutual Funds, Sovereign Gold Bonds)',
        value: 4500000,
        ownershipPercentage: 100
      },
      {
        type: 'DigitalAssets',
        description: 'Bitcoin Hardware Ledger Wallet (xpub6CUGRUonZ...), GitHub Repository IP, Google Workspace domain',
        value: 800000,
        ownershipPercentage: 100
      }
    ],
    mumbaiCommercialPortfolio: [
      {
        type: 'BusinessInterests',
        description: '51% equity shares in Singhania Logistics Private Limited (CIN: U60200MH2002PTC135790)',
        value: 85000000,
        ownershipPercentage: 51
      },
      {
        type: 'Property',
        description: 'Commercial Office Space 801, Peninsula Corporate Park, Lower Parel, Mumbai',
        value: 35000000,
        ownershipPercentage: 100
      },
      {
        type: 'PersonalProperty',
        description: 'Family Heirloom Diamond Jewelry and 1965 Vintage Mercedes Benz 230SL',
        value: 6000000,
        ownershipPercentage: 100
      }
    ],
    nriCrossBorderPortfolio: [
      {
        type: 'Property',
        description: 'Ancestral agricultural land (Survey No. 412), Anand, Gujarat, India',
        value: 12000000,
        ownershipPercentage: 100
      },
      {
        type: 'BankAccount',
        description: 'State Bank of India NRE/NRO Account #30987654321, Overseas Branch, Mumbai',
        value: 5000000,
        ownershipPercentage: 100
      },
      {
        type: 'Property',
        description: 'Freehold Villa 14, Arabian Ranches, Dubai, United Arab Emirates',
        value: 42000000,
        ownershipPercentage: 100
      }
    ]
  },

  // Beneficiaries
  beneficiaries: {
    standardFamily: [
      { name: 'Meera Sharma', relationship: 'Spouse', allocation: '50% of entire residuary estate' },
      { name: 'Ananya Sharma', relationship: 'Daughter', allocation: '25% held in trust until age 21' },
      { name: 'Kabir Sharma', relationship: 'Son', allocation: '25% held in trust until age 21' }
    ],
    equalSplitTwoHeirs: [
      { name: 'Aditya Singhania', relationship: 'Son', allocation: '50%' },
      { name: 'Rhea Singhania', relationship: 'Daughter', allocation: '50%' }
    ],
    singleBeneficiary: [
      { name: 'Sunita Singhania', relationship: 'Spouse', allocation: '100% absolute ownership' }
    ]
  },

  // Executors
  executors: {
    trustedProfessional: {
      executorName: 'Suresh Kumar, FCA',
      executorRelationship: 'Chartered Accountant / Family Advisor',
      executorAddress: 'Flat 12, Cauvery Apartments, Malleshwaram, Bengaluru - 560003',
      executorPhone: '+91 98440 11223',
      alternateExecutorName: 'Neha Verma, Advocate'
    },
    friendExecutor: {
      executorName: 'Deepak Merchant',
      executorRelationship: 'Close Personal Friend',
      executorAddress: 'B-44, Marine Lines, Mumbai - 400020',
      executorPhone: '+91 98201 98765',
      alternateExecutorName: 'Anil Kapadia'
    }
  },

  // Section payloads for autosave & questionnaire engine
  sectionPayloads: {
    personalInfo: {
      fullName: 'Aarav Sharma',
      dateOfBirth: '1992-05-14',
      nationality: 'Indian',
      address: 'Flat 402, Palm Meadows, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      email: 'aarav.sharma@example.com',
      phone: '+91 98450 12345',
      maritalStatus: 'Married',
      spouseName: 'Meera Sharma'
    },
    children: {
      hasChildren: 'Yes',
      childrenList: [
        { name: 'Ananya Sharma', dateOfBirth: '2020-04-10', relationship: 'Biological' },
        { name: 'Kabir Sharma', dateOfBirth: '2023-01-15', relationship: 'Biological' }
      ]
    },
    guardian: {
      guardianName: 'Sunita Sharma',
      guardianRelationship: 'Paternal Aunt',
      guardianAddress: 'House 45, Indiranagar, Bengaluru, Karnataka - 560038',
      alternateGuardianName: 'Ramesh Sharma'
    },
    assets: {
      assetsList: [
        {
          type: 'Property',
          description: 'Apartment #402, Palm Meadows, Whitefield, Bengaluru',
          value: 17500000,
          ownershipPercentage: 100
        },
        {
          type: 'BankAccount',
          description: 'HDFC Bank Savings A/c 50100234567890',
          value: 1250000,
          ownershipPercentage: 100
        }
      ]
    },
    nri: {
      isNRI: 'No'
    },
    beneficiaries: {
      beneficiariesList: [
        { name: 'Meera Sharma', relationship: 'Spouse', allocation: '50%' },
        { name: 'Ananya Sharma', relationship: 'Daughter', allocation: '25%' },
        { name: 'Kabir Sharma', relationship: 'Son', allocation: '25%' }
      ]
    },
    executor: {
      executorName: 'Suresh Kumar',
      executorRelationship: 'Chartered Accountant',
      executorAddress: 'Flat 12, Cauvery Apartments, Malleshwaram, Bengaluru',
      executorPhone: '+91 98440 11223',
      alternateExecutorName: 'Neha Verma'
    },
    existingWill: {
      hasExistingWill: 'No'
    }
  },

  // Extreme & adversarial boundaries for Tier 2 testing
  adversarial: {
    sqlInjection: "' OR '1'='1' --",
    sqlInjectionUnion: "admin@demo.com' UNION SELECT * FROM User --",
    xssScript: '<script>alert("xss")</script><img src=x onerror=alert(1)>',
    hugeString10k: 'A'.repeat(10000),
    negativeAssetValue: -500000,
    overflowPercent: 150,
    unicodeIndicNames: {
      hindi: 'आरव शर्मा',
      tamil: 'ஆரவ் சர்மா',
      kannada: 'ಆರವ್ ಶರ್ಮಾ',
      marathi: 'विक्रम सिंघानिया'
    },
    malformedEmails: [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@example.com',
      'Joe Smith <email@example.com>',
      'email.example.com',
      'email@example@example.com'
    ],
    malformedPhones: [
      '123',
      'abcd-efg-hijk',
      '++919876543210',
      '000000000000000000000000000'
    ]
  }
};

module.exports = fixtures;
