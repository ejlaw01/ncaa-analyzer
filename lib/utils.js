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
 * NCAA conference mapping for all 31 D1 conferences.
 * Includes Odds API name variants (e.g. "St" vs "State", abbreviated names).
 * Teams not found default to "Other".
 */
const CONFERENCE_MAP = {
  // Big Ten
  "Illinois Fighting Illini": "Big Ten", "Indiana Hoosiers": "Big Ten",
  "Iowa Hawkeyes": "Big Ten", "Maryland Terrapins": "Big Ten",
  "Michigan Wolverines": "Big Ten", "Michigan St Spartans": "Big Ten", "Michigan State Spartans": "Big Ten",
  "Minnesota Golden Gophers": "Big Ten", "Nebraska Cornhuskers": "Big Ten",
  "Northwestern Wildcats": "Big Ten", "Ohio St Buckeyes": "Big Ten", "Ohio State Buckeyes": "Big Ten",
  "Oregon Ducks": "Big Ten", "Penn St Nittany Lions": "Big Ten", "Penn State Nittany Lions": "Big Ten",
  "Purdue Boilermakers": "Big Ten", "Rutgers Scarlet Knights": "Big Ten",
  "UCLA Bruins": "Big Ten", "USC Trojans": "Big Ten",
  "Washington Huskies": "Big Ten", "Wisconsin Badgers": "Big Ten",

  // SEC
  "Alabama Crimson Tide": "SEC", "Arkansas Razorbacks": "SEC",
  "Auburn Tigers": "SEC", "Florida Gators": "SEC",
  "Georgia Bulldogs": "SEC", "Kentucky Wildcats": "SEC",
  "LSU Tigers": "SEC", "Mississippi St Bulldogs": "SEC", "Mississippi State Bulldogs": "SEC",
  "Missouri Tigers": "SEC", "Oklahoma Sooners": "SEC",
  "Ole Miss Rebels": "SEC", "South Carolina Gamecocks": "SEC",
  "Tennessee Volunteers": "SEC", "Texas Longhorns": "SEC",
  "Texas A&M Aggies": "SEC", "Vanderbilt Commodores": "SEC",

  // Big 12
  "Arizona Wildcats": "Big 12", "Arizona St Sun Devils": "Big 12", "Arizona State Sun Devils": "Big 12",
  "Baylor Bears": "Big 12", "BYU Cougars": "Big 12",
  "Cincinnati Bearcats": "Big 12", "Colorado Buffaloes": "Big 12",
  "Houston Cougars": "Big 12", "Iowa State Cyclones": "Big 12",
  "Kansas Jayhawks": "Big 12", "Kansas St Wildcats": "Big 12", "Kansas State Wildcats": "Big 12",
  "Oklahoma St Cowboys": "Big 12", "Oklahoma State Cowboys": "Big 12",
  "TCU Horned Frogs": "Big 12", "Texas Tech Red Raiders": "Big 12",
  "UCF Knights": "Big 12", "Utah Utes": "Big 12",
  "West Virginia Mountaineers": "Big 12",

  // ACC
  "Boston College Eagles": "ACC", "California Golden Bears": "ACC",
  "Clemson Tigers": "ACC", "Duke Blue Devils": "ACC",
  "Florida St Seminoles": "ACC", "Florida State Seminoles": "ACC",
  "Georgia Tech Yellow Jackets": "ACC", "Louisville Cardinals": "ACC",
  "Miami Hurricanes": "ACC", "Miami (FL) Hurricanes": "ACC",
  "NC State Wolfpack": "ACC", "North Carolina Tar Heels": "ACC",
  "Notre Dame Fighting Irish": "ACC", "Pittsburgh Panthers": "ACC",
  "SMU Mustangs": "ACC", "Stanford Cardinal": "ACC",
  "Syracuse Orange": "ACC", "Virginia Cavaliers": "ACC",
  "Virginia Tech Hokies": "ACC", "Wake Forest Demon Deacons": "ACC",

  // Big East
  "Butler Bulldogs": "Big East", "Connecticut Huskies": "Big East", "UConn Huskies": "Big East",
  "Creighton Bluejays": "Big East", "DePaul Blue Demons": "Big East",
  "Georgetown Hoyas": "Big East", "Marquette Golden Eagles": "Big East",
  "Providence Friars": "Big East", "Seton Hall Pirates": "Big East",
  "St. John's Red Storm": "Big East", "Villanova Wildcats": "Big East",
  "Xavier Musketeers": "Big East",

  // AAC (American)
  "Charlotte 49ers": "AAC", "East Carolina Pirates": "AAC",
  "Florida Atlantic Owls": "AAC", "Memphis Tigers": "AAC",
  "North Texas Mean Green": "AAC", "Rice Owls": "AAC",
  "South Florida Bulls": "AAC", "Temple Owls": "AAC",
  "Tulane Green Wave": "AAC", "Tulsa Golden Hurricane": "AAC",
  "UAB Blazers": "AAC", "UTSA Roadrunners": "AAC",
  "Wichita St Shockers": "AAC", "Wichita State Shockers": "AAC",

  // Atlantic 10
  "Davidson Wildcats": "A-10", "Dayton Flyers": "A-10",
  "Duquesne Dukes": "A-10", "Fordham Rams": "A-10",
  "George Mason Patriots": "A-10", "George Washington Revolutionaries": "A-10",
  "La Salle Explorers": "A-10", "Loyola Chicago Ramblers": "A-10",
  "Rhode Island Rams": "A-10", "Richmond Spiders": "A-10",
  "Saint Bonaventure Bonnies": "A-10", "St. Bonaventure Bonnies": "A-10",
  "Saint Joseph's Hawks": "A-10", "St. Joseph's Hawks": "A-10",
  "Saint Louis Billikens": "A-10", "St. Louis Billikens": "A-10",
  "VCU Rams": "A-10",

  // ASUN
  "Austin Peay Governors": "ASUN", "Bellarmine Knights": "ASUN",
  "Central Arkansas Bears": "ASUN", "Eastern Kentucky Colonels": "ASUN",
  "FGCU Eagles": "ASUN", "Jacksonville Dolphins": "ASUN",
  "Lipscomb Bisons": "ASUN", "North Alabama Lions": "ASUN",
  "North Florida Ospreys": "ASUN", "Queens Royals": "ASUN",
  "Stetson Hatters": "ASUN", "West Georgia Wolves": "ASUN",

  // Big Sky
  "Eastern Washington Eagles": "Big Sky", "Idaho Vandals": "Big Sky",
  "Idaho St Bengals": "Big Sky", "Idaho State Bengals": "Big Sky",
  "Montana Grizzlies": "Big Sky", "Montana St Bobcats": "Big Sky", "Montana State Bobcats": "Big Sky",
  "Northern Arizona Lumberjacks": "Big Sky",
  "Northern Colorado Bears": "Big Sky", "Portland St Vikings": "Big Sky", "Portland State Vikings": "Big Sky",
  "Sacramento St Hornets": "Big Sky", "Sacramento State Hornets": "Big Sky",
  "Weber St Wildcats": "Big Sky", "Weber State Wildcats": "Big Sky",

  // Big South
  "Charleston Southern Buccaneers": "Big South", "Gardner-Webb Runnin' Bulldogs": "Big South",
  "High Point Panthers": "Big South", "Longwood Lancers": "Big South",
  "Presbyterian Blue Hose": "Big South", "Radford Highlanders": "Big South",
  "UNC Asheville Bulldogs": "Big South", "USC Upstate Spartans": "Big South",
  "Winthrop Eagles": "Big South",

  // Big West
  "Cal Poly Mustangs": "Big West", "Cal St Bakersfield Roadrunners": "Big West", "Cal State Bakersfield Roadrunners": "Big West",
  "Cal St Fullerton Titans": "Big West", "Cal State Fullerton Titans": "Big West",
  "Cal St Northridge Matadors": "Big West", "Cal State Northridge Matadors": "Big West",
  "Hawaii Rainbow Warriors": "Big West", "Hawai'i Rainbow Warriors": "Big West",
  "Long Beach St Beach": "Big West", "Long Beach State Beach": "Big West",
  "UC Davis Aggies": "Big West", "UC Irvine Anteaters": "Big West",
  "UC Riverside Highlanders": "Big West", "UC San Diego Tritons": "Big West",
  "UC Santa Barbara Gauchos": "Big West",

  // CAA (Coastal Athletic)
  "Campbell Fighting Camels": "CAA", "Charleston Cougars": "CAA",
  "Drexel Dragons": "CAA", "Elon Phoenix": "CAA",
  "Hampton Pirates": "CAA", "Hofstra Pride": "CAA",
  "Monmouth Hawks": "CAA", "North Carolina A&T Aggies": "CAA",
  "Northeastern Huskies": "CAA", "Stony Brook Seawolves": "CAA",
  "Towson Tigers": "CAA", "UNC Wilmington Seahawks": "CAA",
  "William & Mary Tribe": "CAA",

  // Conference USA
  "Delaware Blue Hens": "C-USA", "FIU Panthers": "C-USA",
  "Jacksonville St Gamecocks": "C-USA", "Jacksonville State Gamecocks": "C-USA",
  "Kennesaw St Owls": "C-USA", "Kennesaw State Owls": "C-USA",
  "Liberty Flames": "C-USA", "Louisiana Tech Bulldogs": "C-USA",
  "Middle Tennessee Blue Raiders": "C-USA",
  "Missouri St Bears": "C-USA", "Missouri State Bears": "C-USA",
  "New Mexico St Aggies": "C-USA", "New Mexico State Aggies": "C-USA",
  "Sam Houston Bearkats": "C-USA", "Sam Houston St Bearkats": "C-USA",
  "UTEP Miners": "C-USA", "Western Kentucky Hilltoppers": "C-USA",

  // Horizon League
  "Cleveland St Vikings": "Horizon", "Cleveland State Vikings": "Horizon",
  "Detroit Mercy Titans": "Horizon", "Green Bay Phoenix": "Horizon",
  "IU Indianapolis Jaguars": "Horizon", "Milwaukee Panthers": "Horizon",
  "Northern Kentucky Norse": "Horizon",
  "Oakland Golden Grizzlies": "Horizon",
  "Purdue Fort Wayne Mastodons": "Horizon", "Robert Morris Colonials": "Horizon",
  "Wright St Raiders": "Horizon", "Wright State Raiders": "Horizon",
  "Youngstown St Penguins": "Horizon", "Youngstown State Penguins": "Horizon",

  // Ivy League
  "Brown Bears": "Ivy", "Columbia Lions": "Ivy",
  "Cornell Big Red": "Ivy", "Dartmouth Big Green": "Ivy",
  "Harvard Crimson": "Ivy", "Penn Quakers": "Ivy",
  "Princeton Tigers": "Ivy", "Yale Bulldogs": "Ivy",

  // MAAC
  "Canisius Golden Griffins": "MAAC", "Fairfield Stags": "MAAC",
  "Iona Gaels": "MAAC", "Manhattan Jaspers": "MAAC",
  "Marist Red Foxes": "MAAC", "Merrimack Warriors": "MAAC",
  "Mount St. Mary's Mountaineers": "MAAC", "Niagara Purple Eagles": "MAAC",
  "Quinnipiac Bobcats": "MAAC", "Rider Broncs": "MAAC",
  "Sacred Heart Pioneers": "MAAC", "Saint Peter's Peacocks": "MAAC", "St. Peter's Peacocks": "MAAC",
  "Siena Saints": "MAAC",

  // MAC (Mid-American)
  "Akron Zips": "MAC", "Ball St Cardinals": "MAC", "Ball State Cardinals": "MAC",
  "Bowling Green Falcons": "MAC", "Buffalo Bulls": "MAC",
  "Central Michigan Chippewas": "MAC", "Eastern Michigan Eagles": "MAC",
  "Kent St Golden Flashes": "MAC", "Kent State Golden Flashes": "MAC",
  "Miami (OH) RedHawks": "MAC", "Northern Illinois Huskies": "MAC",
  "Ohio Bobcats": "MAC", "Toledo Rockets": "MAC",
  "UMass Minutemen": "MAC", "Western Michigan Broncos": "MAC",

  // MEAC
  "Coppin St Eagles": "MEAC", "Coppin State Eagles": "MEAC",
  "Delaware St Hornets": "MEAC", "Delaware State Hornets": "MEAC",
  "Howard Bison": "MEAC",
  "Maryland-Eastern Shore Hawks": "MEAC", "Maryland Eastern Shore Hawks": "MEAC",
  "Morgan St Bears": "MEAC", "Morgan State Bears": "MEAC",
  "Norfolk St Spartans": "MEAC", "Norfolk State Spartans": "MEAC",
  "North Carolina Central Eagles": "MEAC",
  "South Carolina St Bulldogs": "MEAC", "South Carolina State Bulldogs": "MEAC",

  // Missouri Valley
  "Belmont Bruins": "MVC", "Bradley Braves": "MVC",
  "Drake Bulldogs": "MVC", "Evansville Purple Aces": "MVC",
  "UIC Flames": "MVC", "Illinois St Redbirds": "MVC", "Illinois State Redbirds": "MVC",
  "Indiana St Sycamores": "MVC", "Indiana State Sycamores": "MVC",
  "Murray St Racers": "MVC", "Murray State Racers": "MVC",
  "Northern Iowa Panthers": "MVC", "Southern Illinois Salukis": "MVC",
  "Valparaiso Beacons": "MVC",

  // Mountain West
  "Air Force Falcons": "Mountain West", "Boise St Broncos": "Mountain West", "Boise State Broncos": "Mountain West",
  "Colorado St Rams": "Mountain West", "Colorado State Rams": "Mountain West",
  "Fresno St Bulldogs": "Mountain West", "Fresno State Bulldogs": "Mountain West",
  "Grand Canyon Antelopes": "Mountain West",
  "Nevada Wolf Pack": "Mountain West", "New Mexico Lobos": "Mountain West",
  "San Diego St Aztecs": "Mountain West", "San Diego State Aztecs": "Mountain West",
  "San Jose St Spartans": "Mountain West", "San Jose State Spartans": "Mountain West",
  "UNLV Rebels": "Mountain West", "Utah St Aggies": "Mountain West", "Utah State Aggies": "Mountain West",
  "Wyoming Cowboys": "Mountain West",

  // NEC (Northeast)
  "Central Connecticut Blue Devils": "NEC", "Central Connecticut St Blue Devils": "NEC",
  "Chicago St Cougars": "NEC", "Chicago State Cougars": "NEC",
  "Fairleigh Dickinson Knights": "NEC", "Le Moyne Dolphins": "NEC",
  "LIU Sharks": "NEC", "Mercyhurst Lakers": "NEC",
  "Saint Francis Red Flash": "NEC", "St. Francis Red Flash": "NEC",
  "Stonehill Skyhawks": "NEC", "Wagner Seahawks": "NEC",

  // Ohio Valley
  "Eastern Illinois Panthers": "OVC", "Lindenwood Lions": "OVC",
  "Little Rock Trojans": "OVC",
  "Morehead St Eagles": "OVC", "Morehead State Eagles": "OVC",
  "Southeast Missouri Redhawks": "OVC", "SE Missouri St Redhawks": "OVC",
  "SIU Edwardsville Cougars": "OVC",
  "Southern Indiana Screaming Eagles": "OVC",
  "Tennessee St Tigers": "OVC", "Tennessee State Tigers": "OVC",
  "Tennessee Tech Golden Eagles": "OVC",
  "UT Martin Skyhawks": "OVC", "Western Illinois Leathernecks": "OVC",

  // Patriot League
  "American Eagles": "Patriot", "Army Black Knights": "Patriot",
  "Boston University Terriers": "Patriot", "Bucknell Bison": "Patriot",
  "Colgate Raiders": "Patriot", "Holy Cross Crusaders": "Patriot",
  "Lafayette Leopards": "Patriot", "Lehigh Mountain Hawks": "Patriot",
  "Loyola Maryland Greyhounds": "Patriot", "Navy Midshipmen": "Patriot",

  // Southern Conference
  "Chattanooga Mocs": "SoCon", "East Tennessee St Buccaneers": "SoCon", "East Tennessee State Buccaneers": "SoCon",
  "Furman Paladins": "SoCon", "Mercer Bears": "SoCon",
  "Samford Bulldogs": "SoCon", "The Citadel Bulldogs": "SoCon",
  "UNC Greensboro Spartans": "SoCon", "VMI Keydets": "SoCon",
  "Western Carolina Catamounts": "SoCon", "Wofford Terriers": "SoCon",

  // Southland
  "East Texas A&M Lions": "Southland", "Houston Christian Huskies": "Southland",
  "Incarnate Word Cardinals": "Southland", "Lamar Cardinals": "Southland",
  "McNeese Cowboys": "Southland", "New Orleans Privateers": "Southland",
  "Nicholls St Colonels": "Southland", "Nicholls State Colonels": "Southland",
  "Northwestern St Demons": "Southland", "Northwestern State Demons": "Southland",
  "SE Louisiana Lions": "Southland", "Southeastern Louisiana Lions": "Southland",
  "Stephen F. Austin Lumberjacks": "Southland",
  "Texas A&M-CC Islanders": "Southland", "Texas A&M-Corpus Christi Islanders": "Southland",
  "UT Rio Grande Valley Vaqueros": "Southland", "UTRGV Vaqueros": "Southland",

  // Summit League
  "Denver Pioneers": "Summit", "Kansas City Roos": "Summit",
  "North Dakota Fighting Hawks": "Summit",
  "North Dakota St Bison": "Summit", "North Dakota State Bison": "Summit",
  "Omaha Mavericks": "Summit", "Oral Roberts Golden Eagles": "Summit",
  "South Dakota Coyotes": "Summit",
  "South Dakota St Jackrabbits": "Summit", "South Dakota State Jackrabbits": "Summit",
  "St. Thomas Tommies": "Summit",

  // Sun Belt
  "Appalachian St Mountaineers": "Sun Belt", "Appalachian State Mountaineers": "Sun Belt",
  "Arkansas St Red Wolves": "Sun Belt", "Arkansas State Red Wolves": "Sun Belt",
  "Coastal Carolina Chanticleers": "Sun Belt",
  "Georgia Southern Eagles": "Sun Belt", "Georgia St Panthers": "Sun Belt", "Georgia State Panthers": "Sun Belt",
  "James Madison Dukes": "Sun Belt",
  "Louisiana Ragin' Cajuns": "Sun Belt", "Louisiana-Monroe Warhawks": "Sun Belt", "UL Monroe Warhawks": "Sun Belt",
  "Marshall Thundering Herd": "Sun Belt", "Old Dominion Monarchs": "Sun Belt",
  "South Alabama Jaguars": "Sun Belt", "Southern Miss Golden Eagles": "Sun Belt",
  "Texas St Bobcats": "Sun Belt", "Texas State Bobcats": "Sun Belt",
  "Troy Trojans": "Sun Belt",

  // SWAC
  "Alabama A&M Bulldogs": "SWAC", "Alabama St Hornets": "SWAC", "Alabama State Hornets": "SWAC",
  "Alcorn St Braves": "SWAC", "Alcorn State Braves": "SWAC",
  "Arkansas-Pine Bluff Golden Lions": "SWAC",
  "Bethune-Cookman Wildcats": "SWAC", "Florida A&M Rattlers": "SWAC",
  "Grambling St Tigers": "SWAC", "Grambling State Tigers": "SWAC",
  "Jackson St Tigers": "SWAC", "Jackson State Tigers": "SWAC",
  "Miss Valley St Delta Devils": "SWAC", "Mississippi Valley State Delta Devils": "SWAC",
  "Prairie View A&M Panthers": "SWAC",
  "Southern Jaguars": "SWAC", "Texas Southern Tigers": "SWAC",

  // WAC
  "Abilene Christian Wildcats": "WAC", "California Baptist Lancers": "WAC",
  "Southern Utah Thunderbirds": "WAC",
  "Tarleton St Texans": "WAC", "Tarleton State Texans": "WAC",
  "UT Arlington Mavericks": "WAC",
  "Utah Tech Trailblazers": "WAC", "Utah Valley Wolverines": "WAC",

  // WCC (West Coast)
  "Gonzaga Bulldogs": "WCC", "Loyola Marymount Lions": "WCC",
  "Oregon St Beavers": "WCC", "Oregon State Beavers": "WCC",
  "Pacific Tigers": "WCC", "Pepperdine Waves": "WCC",
  "Portland Pilots": "WCC", "Saint Mary's Gaels": "WCC", "St. Mary's Gaels": "WCC",
  "San Diego Toreros": "WCC", "San Francisco Dons": "WCC",
  "Santa Clara Broncos": "WCC", "Seattle Redhawks": "WCC",
  "Washington St Cougars": "WCC", "Washington State Cougars": "WCC",

  // America East
  "Albany Great Danes": "America East", "Binghamton Bearcats": "America East",
  "Bryant Bulldogs": "America East", "Maine Black Bears": "America East",
  "New Hampshire Wildcats": "America East", "NJIT Highlanders": "America East",
  "UMBC Retrievers": "America East", "UMass Lowell River Hawks": "America East",
  "Vermont Catamounts": "America East",
};

/**
 * Look up conference for a team name. Tries exact match, then substring
 * using only full-name keys (those with a space, e.g. "Northwestern Wildcats")
 * to avoid false matches like "Northwestern St" → "Northwestern" (Big Ten).
 */
export function getConference(teamName) {
  if (CONFERENCE_MAP[teamName]) return CONFERENCE_MAP[teamName];

  // Only substring-match against full-name keys (with mascot) to avoid
  // "Northwestern" matching "Northwestern St Demons", etc.
  for (const [key, conf] of Object.entries(CONFERENCE_MAP)) {
    if (key.includes(" ") && teamName.includes(key)) {
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
