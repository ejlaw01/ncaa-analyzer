/**
 * Format a date as YYYY-MM-DD in Eastern time.
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Format a date as M/D for display.
 */
export function shortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Get today's date string in YYYY-MM-DD (Eastern).
 */
export function todayString() {
  return formatDate(new Date());
}

/**
 * NCAA conference mapping. Maps common team names to their conference.
 * This covers the major conferences; teams not found default to "Other".
 */
const CONFERENCE_MAP = {
  // Big Ten
  "Illinois": "Big Ten", "Illinois Fighting Illini": "Big Ten",
  "Indiana": "Big Ten", "Indiana Hoosiers": "Big Ten",
  "Iowa": "Big Ten", "Iowa Hawkeyes": "Big Ten",
  "Maryland": "Big Ten", "Maryland Terrapins": "Big Ten",
  "Michigan": "Big Ten", "Michigan Wolverines": "Big Ten",
  "Michigan State": "Big Ten", "Michigan State Spartans": "Big Ten",
  "Minnesota": "Big Ten", "Minnesota Golden Gophers": "Big Ten",
  "Nebraska": "Big Ten", "Nebraska Cornhuskers": "Big Ten",
  "Northwestern": "Big Ten", "Northwestern Wildcats": "Big Ten",
  "Ohio State": "Big Ten", "Ohio State Buckeyes": "Big Ten",
  "Oregon": "Big Ten", "Oregon Ducks": "Big Ten",
  "Penn State": "Big Ten", "Penn State Nittany Lions": "Big Ten",
  "Purdue": "Big Ten", "Purdue Boilermakers": "Big Ten",
  "Rutgers": "Big Ten", "Rutgers Scarlet Knights": "Big Ten",
  "UCLA": "Big Ten", "UCLA Bruins": "Big Ten",
  "USC": "Big Ten", "USC Trojans": "Big Ten",
  "Washington": "Big Ten", "Washington Huskies": "Big Ten",
  "Wisconsin": "Big Ten", "Wisconsin Badgers": "Big Ten",

  // SEC
  "Alabama": "SEC", "Alabama Crimson Tide": "SEC",
  "Arkansas": "SEC", "Arkansas Razorbacks": "SEC",
  "Auburn": "SEC", "Auburn Tigers": "SEC",
  "Florida": "SEC", "Florida Gators": "SEC",
  "Georgia": "SEC", "Georgia Bulldogs": "SEC",
  "Kentucky": "SEC", "Kentucky Wildcats": "SEC",
  "LSU": "SEC", "LSU Tigers": "SEC",
  "Mississippi State": "SEC", "Mississippi State Bulldogs": "SEC",
  "Missouri": "SEC", "Missouri Tigers": "SEC",
  "Oklahoma": "SEC", "Oklahoma Sooners": "SEC",
  "Ole Miss": "SEC", "Ole Miss Rebels": "SEC",
  "South Carolina": "SEC", "South Carolina Gamecocks": "SEC",
  "Tennessee": "SEC", "Tennessee Volunteers": "SEC",
  "Texas": "SEC", "Texas Longhorns": "SEC",
  "Texas A&M": "SEC", "Texas A&M Aggies": "SEC",
  "Vanderbilt": "SEC", "Vanderbilt Commodores": "SEC",

  // Big 12
  "Arizona": "Big 12", "Arizona Wildcats": "Big 12",
  "Arizona State": "Big 12", "Arizona State Sun Devils": "Big 12",
  "Baylor": "Big 12", "Baylor Bears": "Big 12",
  "BYU": "Big 12", "BYU Cougars": "Big 12",
  "Cincinnati": "Big 12", "Cincinnati Bearcats": "Big 12",
  "Colorado": "Big 12", "Colorado Buffaloes": "Big 12",
  "Houston": "Big 12", "Houston Cougars": "Big 12",
  "Iowa State": "Big 12", "Iowa State Cyclones": "Big 12",
  "Kansas": "Big 12", "Kansas Jayhawks": "Big 12",
  "Kansas State": "Big 12", "Kansas State Wildcats": "Big 12",
  "Oklahoma State": "Big 12", "Oklahoma State Cowboys": "Big 12",
  "TCU": "Big 12", "TCU Horned Frogs": "Big 12",
  "Texas Tech": "Big 12", "Texas Tech Red Raiders": "Big 12",
  "UCF": "Big 12", "UCF Knights": "Big 12",
  "Utah": "Big 12", "Utah Utes": "Big 12",
  "West Virginia": "Big 12", "West Virginia Mountaineers": "Big 12",

  // ACC
  "Boston College": "ACC", "Boston College Eagles": "ACC",
  "Clemson": "ACC", "Clemson Tigers": "ACC",
  "Duke": "ACC", "Duke Blue Devils": "ACC",
  "Florida State": "ACC", "Florida State Seminoles": "ACC",
  "Georgia Tech": "ACC", "Georgia Tech Yellow Jackets": "ACC",
  "Louisville": "ACC", "Louisville Cardinals": "ACC",
  "Miami": "ACC", "Miami Hurricanes": "ACC", "Miami (FL)": "ACC",
  "NC State": "ACC", "NC State Wolfpack": "ACC", "North Carolina State": "ACC",
  "North Carolina": "ACC", "North Carolina Tar Heels": "ACC",
  "Notre Dame": "ACC", "Notre Dame Fighting Irish": "ACC",
  "Pittsburgh": "ACC", "Pittsburgh Panthers": "ACC", "Pitt": "ACC",
  "SMU": "ACC", "SMU Mustangs": "ACC",
  "Stanford": "ACC", "Stanford Cardinal": "ACC",
  "Syracuse": "ACC", "Syracuse Orange": "ACC",
  "Virginia": "ACC", "Virginia Cavaliers": "ACC",
  "Virginia Tech": "ACC", "Virginia Tech Hokies": "ACC",
  "Wake Forest": "ACC", "Wake Forest Demon Deacons": "ACC",
  "Cal": "ACC", "California": "ACC", "California Golden Bears": "ACC",

  // Big East
  "Butler": "Big East", "Butler Bulldogs": "Big East",
  "UConn": "Big East", "Connecticut": "Big East", "Connecticut Huskies": "Big East",
  "Creighton": "Big East", "Creighton Bluejays": "Big East",
  "DePaul": "Big East", "DePaul Blue Demons": "Big East",
  "Georgetown": "Big East", "Georgetown Hoyas": "Big East",
  "Marquette": "Big East", "Marquette Golden Eagles": "Big East",
  "Providence": "Big East", "Providence Friars": "Big East",
  "Seton Hall": "Big East", "Seton Hall Pirates": "Big East",
  "St. John's": "Big East", "St. John's Red Storm": "Big East",
  "Villanova": "Big East", "Villanova Wildcats": "Big East",
  "Xavier": "Big East", "Xavier Musketeers": "Big East",
};

/**
 * Look up conference for a team name. Tries exact match, then substring.
 */
export function getConference(teamName) {
  if (CONFERENCE_MAP[teamName]) return CONFERENCE_MAP[teamName];

  // Try substring matching
  for (const [key, conf] of Object.entries(CONFERENCE_MAP)) {
    if (teamName.includes(key) || key.includes(teamName)) {
      return conf;
    }
  }
  return "Other";
}

/**
 * Determine the conference for a matchup (use home team, fallback to away).
 */
export function getMatchupConference(homeTeam, awayTeam) {
  const homeConf = getConference(homeTeam);
  if (homeConf !== "Other") return homeConf;
  return getConference(awayTeam);
}
