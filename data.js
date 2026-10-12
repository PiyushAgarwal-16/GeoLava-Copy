/**
 * ============================================================================
 * URBAN INTELLIGENCE & BUILDING TELEMETRY DATASET
 * Coordinate Reference System: Buildings.webp (Width: 2210px, Height: 1473px)
 * ============================================================================
 *
 * HOW TO MANUALLY CALIBRATE COORDINATES:
 * -------------------------------------
 * 1. Open index.html in your browser.
 * 2. Press 'C' or click "📐 Calibrate" in the top header.
 * 3. As you move your mouse over Buildings.webp, the live [X, Y] coordinates
 *    are shown on screen.
 * 4. Click anywhere on the image to copy the exact [X, Y] coordinates.
 * 5. Numbered markers (0, 1, 2...) match the point indices in this file.
 * 6. Update the corresponding [X, Y] values below.
 *
 * Coordinate axis guide:
 * - X: 0 (far left)  --->  2210 (far right)
 * - Y: 0 (top edge)  --->  1473 (bottom edge)
 * ============================================================================
 */

const IMAGE_CONFIG = {
  src: 'Buildings.webp',
  width: 2210,
  height: 1473,
};

const BUILDINGS = [
  // --------------------------------------------------------------------------
  // 1. THE TERRACE LANDMARK (Central Brick 7-story Building with Circular Garden)
  // --------------------------------------------------------------------------
  {
    id: 'bldg-terrace',
    name: 'The Terrace Landmark',
    code: 'BLDG-01 // TER-CTR',
    category: 'Commercial & Biophilic Terrace',
    address: '680 Folsom Street',
    sensitivity: {
      physicalCondition: 4,      // Meter: 1 to 5
      developmentMomentum: 5,
      neighborhoodTrajectory: 4,
    },
    metrics: {
      valuation: '$68.4 M',
      efficiency: '94%',
    },
    facts: [
      'Circular biophilic sky terrace reduces peak summer thermal absorption by 22%.',
      'Ground-floor anchor retail occupied by flagship pharmacy with over 4,800 daily visits.',
      'Comprehensive seismic retrofitting completed with grade-level elastomeric isolators.',
    ],

    // ------------------------------------------------------------------------
    // [polygon]: Outer boundary enclosing the entire 3D building volume
    // Used for hover detection hitbox & spotlight illumination cutout
    // ------------------------------------------------------------------------
    polygon: [
      [1342, 238],  // [0] Top roof apex (rear wall where building meets the rear tower)
      [1822, 437],  // [1] Right roof corner (where roof hedge meets the dark building)
      [1508, 638],  // [2] Front-right roof corner (where front facade meets side wall)
      [1482, 1072], // [3] Front-right street base corner (sidewalk edge near alley)
      [992, 836],   // [4] Front-left street base corner (sidewalk corner near Walgreens entrance)
      [1006, 412],  // [5] Front-left roof corner (where roof hedge meets front-left wall)
    ],

    // ------------------------------------------------------------------------
    // [roofPolygon]: Flat plane tracing the 4 corners of the roof perimeter
    // ------------------------------------------------------------------------
    roofPolygon: [
      [1342, 238],  // [0] Rear roof corner
      [1822, 437],  // [1] Right roof corner
      [1508, 638],  // [2] Front-right roof corner
      [1006, 412],  // [3] Front-left roof corner
    ],

    // ------------------------------------------------------------------------
    // [wireframeEdges]: Glowing isometric 3D structural lines [[X1, Y1], [X2, Y2]]
    // ------------------------------------------------------------------------
    wireframeEdges: [
      // --- Roof Perimeter Edges ---
      [[1342, 238], [1822, 437]], // Rear roof line (top-left to top-right)
      [[1822, 437], [1508, 638]], // Right roof line (along dark building border)
      [[1508, 638], [1006, 412]], // Front roof line (above front facade windows)
      [[1006, 412], [1342, 238]], // Left roof line (along street-facing west side)

      // --- Vertical Corner Drop Lines (Roof down to Street) ---
      [[1508, 638], [1482, 1072]], // Front-right corner drop (roof to sidewalk)
      [[1006, 412], [992, 836]],   // Front-left corner drop (roof to sidewalk)

      // --- Ground Sidewalk Line ---
      [[992, 836], [1482, 1072]],  // Base street line along Walgreens storefront
    ],

    // ------------------------------------------------------------------------
    // [subFeatures]: Architectural circular terrace garden overlay
    // ------------------------------------------------------------------------
    subFeatures: [
      {
        type: 'terrace',
        circle: { cx: 1448, cy: 410, r: 84 },      // Outer green hedge ring [Center X, Center Y, Radius]
        innerCircle: { cx: 1448, cy: 410, r: 52 }, // Inner circular patio ring
      },
    ],

    // ------------------------------------------------------------------------
    // [pins]: Callout diamond pins & leader lines
    // pos = [X, Y] of diamond on the building
    // labelPos = [X, Y] where the text badge is positioned
    // ------------------------------------------------------------------------
    pins: [
      {
        pos: [1448, 410],       // Diamond on the rooftop circular patio
        labelPos: [1680, 320],  // Badge placed upper-right
        title: 'BIOPHILIC SKY TERRACE',
      },
      {
        pos: [1240, 720],       // Diamond on the front brick facade
        labelPos: [950, 680],   // Badge placed to the left
        title: 'STRUCTURAL INTEGRITY',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. MONTGOMERY FINANCIAL TOWER (Far-Left Modern High-Rise Glass Skyscraper)
  // --------------------------------------------------------------------------
  {
    id: 'bldg-left-tower',
    name: 'Montgomery Financial Tower',
    code: 'BLDG-02 // TWR-WEST',
    category: 'Class A Commercial High-Rise',
    address: '555 Montgomery Street',
    sensitivity: {
      physicalCondition: 5,
      developmentMomentum: 4,
      neighborhoodTrajectory: 5,
    },
    metrics: {
      valuation: '$210.4 M',
      efficiency: '98%',
    },
    facts: [
      'LEED Platinum certified with dynamic electrochromic glazed curtain wall.',
      'Tuned mass liquid column dampers on upper stories mitigate wind sway.',
      'Destination-dispatch elevator system feeds regenerative power to the grid.',
    ],

    // ------------------------------------------------------------------------
    // [polygon]: Left boundary of the viewport covering the tower volume
    // ------------------------------------------------------------------------
    polygon: [
      [0, 0],         // [0] Top-left frame corner
      [408, 0],       // [1] Top-right roof edge of tower
      [426, 1473],    // [2] Bottom-right vertical corner of tower at frame bottom
      [0, 1473],      // [3] Bottom-left frame corner
    ],

    roofPolygon: [
      [0, 0],         // [0] Top-left
      [408, 0],       // [1] Top-right
      [408, 120],     // [2] Upper roof tier right
      [0, 120],       // [3] Upper roof tier left
    ],

    // ------------------------------------------------------------------------
    // [wireframeEdges]: Vertical tower spine & horizontal floor dividers
    // ------------------------------------------------------------------------
    wireframeEdges: [
      [[408, 0], [426, 1473]],   // Primary vertical edge separating tower from street
      [[0, 240], [411, 240]],    // Floor dividing band 1
      [[0, 480], [415, 480]],    // Floor dividing band 2
      [[0, 720], [419, 720]],    // Floor dividing band 3
      [[0, 960], [422, 960]],    // Floor dividing band 4
      [[0, 1200], [425, 1200]],  // Floor dividing band 5
    ],

    subFeatures: [],

    pins: [
      {
        pos: [280, 420],       // Diamond on the curtain wall facade
        labelPos: [520, 360],  // Badge placed over street
        title: 'ENERGY EFFICIENCY',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. SLATE & IRON LOFTS (Dark Steel/Glass Building immediately right of Terrace)
  // --------------------------------------------------------------------------
  {
    id: 'bldg-dark-midrise',
    name: 'Slate & Iron Lofts',
    code: 'BLDG-03 // SLATE-MID',
    category: 'Creative Office & Studios',
    address: '660 Folsom Street',
    sensitivity: {
      physicalCondition: 4,
      developmentMomentum: 4,
      neighborhoodTrajectory: 4,
    },
    metrics: {
      valuation: '$38.2 M',
      efficiency: '91%',
    },
    facts: [
      'Historic iron sash facade seismically reinforced with internal steel moment frames.',
      'Preserved exterior egress fire escape compliant with municipal standards.',
      'Sound-attenuating acoustic glazing tailored for design and media tenants.',
    ],

    // ------------------------------------------------------------------------
    // [polygon]: 3D volume of the dark 6-story building
    // ------------------------------------------------------------------------
    polygon: [
      [1736, 396],   // [0] Left-rear roof corner (shared with Terrace Landmark)
      [1970, 500],   // [1] Right-rear roof corner (meets building behind)
      [1796, 606],   // [2] Right-front roof corner (meets adjacent brick building)
      [1776, 1184],  // [3] Right-front street sidewalk corner
      [1482, 1072],  // [4] Left-front street sidewalk corner (shared with Terrace Landmark)
      [1508, 638],   // [5] Left-front roof corner (shared with Terrace Landmark)
    ],

    roofPolygon: [
      [1736, 396],   // [0] Left-rear roof corner
      [1970, 500],   // [1] Right-rear roof corner
      [1796, 606],   // [2] Right-front roof corner
      [1508, 638],   // [3] Left-front roof corner
    ],

    wireframeEdges: [
      // --- Roof Perimeter ---
      [[1736, 396], [1970, 500]], // Rear roof line
      [[1970, 500], [1796, 606]], // Right roof line (along brick neighbor)
      [[1796, 606], [1508, 638]], // Front roof line (above front dark facade)
      [[1508, 638], [1736, 396]], // Left roof line (along Terrace wall)

      // --- Vertical Corner Drop Lines ---
      [[1508, 638], [1482, 1072]], // Left vertical corner (roof to street)
      [[1796, 606], [1776, 1184]], // Right vertical corner (roof to street)

      // --- Ground Sidewalk Line ---
      [[1482, 1072], [1776, 1184]], // Street base line
    ],

    subFeatures: [],

    pins: [
      {
        pos: [1680, 780],      // Diamond on the dark steel window facade
        labelPos: [1940, 750], // Badge placed to the right
        title: 'SEISMIC MOMENT FRAME',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. YERBA CIVIC PAVILION (Brutalist Waffle-Roof Trellis Canopy on Top-Left)
  // --------------------------------------------------------------------------
  {
    id: 'bldg-civic-pavilion',
    name: 'Yerba Civic Pavilion',
    code: 'BLDG-04 // PAV-NORTH',
    category: 'Exhibition & Civic Center',
    address: '750 Howard Street',
    sensitivity: {
      physicalCondition: 4,
      developmentMomentum: 3,
      neighborhoodTrajectory: 4,
    },
    metrics: {
      valuation: '$54.0 M',
      efficiency: '88%',
    },
    facts: [
      'Geometric coffered waffle-ceiling trellis engineered for column-free interior galleries.',
      'Central pyramidal skylight lantern provides diffuse daylight to lower exhibition levels.',
      'Integrated stormwater drainage channels concealed within architectural cantilever.',
    ],

    // ------------------------------------------------------------------------
    // [polygon]: Cantilever trellis roof and entrance column envelope
    // ------------------------------------------------------------------------
    polygon: [
      [468, 54],     // [0] Top-left cantilever corner
      [1138, 162],   // [1] Top-right cantilever corner (facing north court)
      [772, 418],    // [2] Bottom-right cantilever corner (apex pointing toward street)
      [772, 442],    // [3] Base of corner support column
      [688, 456],    // [4] Entrance plaza curb
      [420, 360],    // [5] Southwest entrance wall
      [420, 246],    // [6] Trellis left edge where it meets Montgomery Tower
    ],

    roofPolygon: [
      [468, 54],     // [0] Top-left
      [1138, 162],   // [1] Top-right
      [772, 418],    // [2] Bottom-right
      [420, 246],    // [3] Bottom-left (at tower boundary)
    ],

    wireframeEdges: [
      // --- Trellis Roof Perimeter ---
      [[468, 54], [1138, 162]],   // North trellis edge
      [[1138, 162], [772, 418]],   // East trellis edge
      [[772, 418], [420, 246]],   // South trellis edge
      [[420, 246], [468, 54]],     // West trellis edge

      // --- Column Support Edge ---
      [[772, 418], [772, 442]],   // Vertical column corner
      [[772, 442], [688, 456]],   // Ground entrance band
    ],

    subFeatures: [],

    pins: [
      {
        pos: [770, 220],       // Diamond near the central skylight
        labelPos: [1020, 160], // Badge placed upper-right
        title: 'COFFERED TRELLIS ROOF',
      },
    ],
  },
];
