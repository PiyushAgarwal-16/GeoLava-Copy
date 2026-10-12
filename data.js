/**
 * Urban Intelligence & Building Telemetry Dataset
 * Precision-mapped for Buildings.webp (2210 x 1473)
 */

const IMAGE_CONFIG = {
  src: 'Buildings.webp',
  width: 2210,
  height: 1473,
};

const BUILDINGS = [
  {
    id: 'bldg-terrace',
    name: 'The Terrace Landmark',
    code: 'BLDG-01 // TER-CTR',
    category: 'Commercial & Biophilic Terrace',
    address: '680 Folsom Street',
    sensitivity: {
      physicalCondition: 4,      // 1 to 5
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
    // Exact 6-point 3D isometric volume
    polygon: [
      [1342, 238],
      [1736, 396],
      [1508, 638],
      [1482, 1072],
      [992, 836],
      [1006, 412],
    ],
    // Roof boundary polygon
    roofPolygon: [
      [1342, 238],
      [1736, 396],
      [1508, 638],
      [1006, 412],
    ],
    // 3D wireframe edges
    wireframeEdges: [
      [[1342, 238], [1736, 396]],
      [[1736, 396], [1508, 638]],
      [[1508, 638], [1006, 412]],
      [[1006, 412], [1342, 238]],
      [[1508, 638], [1482, 1072]],
      [[1006, 412], [992, 836]],
      [[992, 836], [1482, 1072]],
    ],
    // Subtle circular terrace outline
    subFeatures: [
      {
        type: 'terrace',
        circle: { cx: 1448, cy: 410, r: 84 },
        innerCircle: { cx: 1448, cy: 410, r: 52 },
      },
    ],
    // Minimalist Callout Pins
    pins: [
      {
        pos: [1448, 410],
        labelPos: [1680, 320],
        title: 'BIOPHILIC SKY TERRACE',
      },
      {
        pos: [1240, 720],
        labelPos: [950, 680],
        title: 'STRUCTURAL INTEGRITY',
      },
    ],
  },
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
    polygon: [
      [0, 0],
      [408, 0],
      [426, 1473],
      [0, 1473],
    ],
    roofPolygon: [
      [0, 0],
      [408, 0],
      [408, 120],
      [0, 120],
    ],
    wireframeEdges: [
      [[408, 0], [426, 1473]],
      [[0, 240], [411, 240]],
      [[0, 480], [415, 480]],
      [[0, 720], [419, 720]],
      [[0, 960], [422, 960]],
      [[0, 1200], [425, 1200]],
    ],
    subFeatures: [],
    pins: [
      {
        pos: [280, 420],
        labelPos: [520, 360],
        title: 'ENERGY EFFICIENCY',
      },
    ],
  },
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
    polygon: [
      [1736, 396],
      [1970, 500],
      [1796, 606],
      [1776, 1184],
      [1482, 1072],
      [1508, 638],
    ],
    roofPolygon: [
      [1736, 396],
      [1970, 500],
      [1796, 606],
      [1508, 638],
    ],
    wireframeEdges: [
      [[1736, 396], [1970, 500]],
      [[1970, 500], [1796, 606]],
      [[1796, 606], [1508, 638]],
      [[1508, 638], [1736, 396]],
      [[1508, 638], [1482, 1072]],
      [[1796, 606], [1776, 1184]],
      [[1482, 1072], [1776, 1184]],
    ],
    subFeatures: [],
    pins: [
      {
        pos: [1680, 780],
        labelPos: [1940, 750],
        title: 'SEISMIC MOMENT FRAME',
      },
    ],
  },
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
    polygon: [
      [468, 54],
      [1138, 162],
      [772, 418],
      [772, 442],
      [688, 456],
      [420, 360],
      [420, 246],
    ],
    roofPolygon: [
      [468, 54],
      [1138, 162],
      [772, 418],
      [420, 246],
    ],
    wireframeEdges: [
      [[468, 54], [1138, 162]],
      [[1138, 162], [772, 418]],
      [[772, 418], [420, 246]],
      [[420, 246], [468, 54]],
      [[772, 418], [772, 442]],
      [[772, 442], [688, 456]],
    ],
    subFeatures: [],
    pins: [
      {
        pos: [770, 220],
        labelPos: [1020, 160],
        title: 'COFFERED TRELLIS ROOF',
      },
    ],
  },
];
