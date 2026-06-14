// src/constants/locations.ts

export const STATES_BY_COUNTRY: Record<string, string[]> = {
  'India': [
    'Gujarat',
    'Maharashtra',
    'Karnataka',
    'Tamil Nadu',
    'Telangana',
    'Delhi',
    'Uttar Pradesh',
    'West Bengal'
  ],
  'United States': [
    'California',
    'New York',
    'Texas',
    'Washington',
    'Massachusetts'
  ],
  'United Kingdom': [
    'England',
    'Scotland',
    'Wales',
    'Northern Ireland'
  ],
  'Canada': [
    'Ontario',
    'British Columbia',
    'Quebec',
    'Alberta'
  ],
  'UAE': [
    'Abu Dhabi',
    'Dubai',
    'Sharjah'
  ],
  'Australia': [
    'New South Wales',
    'Victoria',
    'Queensland'
  ],
  'Germany': [
    'Bavaria',
    'Berlin',
    'Hamburg'
  ],
  'Singapore': [
    'Central Region',
    'East Region',
    'West Region'
  ]
};

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  // India States
  'Gujarat': ['Ahmedabad', 'Vadodara', 'Surat', 'Rajkot', 'Gandhinagar'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Karimnagar'],
  'Delhi': ['New Delhi', 'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'],
  'Uttar Pradesh': ['Noida', 'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Durgapur'],

  // US States
  'California': ['San Francisco', 'Los Angeles', 'San Jose', 'San Diego', 'Sacramento'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
  'Texas': ['Austin', 'Houston', 'Dallas', 'San Antonio'],
  'Washington': ['Seattle', 'Bellevue', 'Redmond', 'Spokane'],
  'Massachusetts': ['Boston', 'Cambridge', 'Worcester', 'Springfield'],

  // UK Countries
  'England': ['London', 'Manchester', 'Birmingham', 'Leeds'],
  'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen'],
  'Wales': ['Cardiff', 'Swansea'],
  'Northern Ireland': ['Belfast'],

  // Canada Provinces
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga'],
  'British Columbia': ['Vancouver', 'Victoria'],
  'Quebec': ['Montreal', 'Quebec City'],
  'Alberta': ['Calgary', 'Edmonton'],

  // UAE Emirates
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain'],
  'Dubai': ['Dubai City', 'Jebel Ali'],
  'Sharjah': ['Sharjah City'],

  // Australia States
  'New South Wales': ['Sydney'],
  'Victoria': ['Melbourne'],
  'Queensland': ['Brisbane'],

  // Germany States
  'Bavaria': ['Munich'],
  'Berlin': ['Berlin'],
  'Hamburg': ['Hamburg'],

  // Singapore Regions
  'Central Region': ['Downtown Core', 'Bukit Merah'],
  'East Region': ['Tampines', 'Bedok'],
  'West Region': ['Jurong', 'Clementi']
};
