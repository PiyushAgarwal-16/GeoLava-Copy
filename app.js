/**
 * Urban Intelligence & Building Telemetry Interactive Controller
 * Minimalist Architectural Edition with Live Coordinate Calibration
 */

document.addEventListener('DOMContentLoaded', () => {
  const viewportCard = document.getElementById('viewportCard');
  const spotlightImage = document.getElementById('spotlightImage');
  const svgOverlay = document.getElementById('svgOverlay');
  const hudCard = document.getElementById('hudCard');
  const calibrateToggleBtn = document.getElementById('calibrateToggleBtn');
  const calibrationBar = document.getElementById('calibrationBar');
  const calCoords = document.getElementById('calCoords');
  const calLastClick = document.getElementById('calLastClick');
  const calBuildingSelect = document.getElementById('calBuildingSelect');
  const copyToast = document.getElementById('copyToast');

  let activeBuildingId = null;
  let isCalibrating = false;

  // Initialize vector overlay & hit zones
  initSvgLayers();

  // Initialize HUD standby mode
  setHudStandby();

  // Setup Calibration mode & interactions
  setupCalibration();

  /**
   * Builds all SVG elements: wireframe geometry, pins, hit zones, and calibration vertex markers
   */
  function initSvgLayers() {
    svgOverlay.innerHTML = '';

    // Create SVG Defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
    svgOverlay.appendChild(defs);

    BUILDINGS.forEach((bldg) => {
      const bldgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      bldgGroup.setAttribute('class', 'building-vector-group');
      bldgGroup.setAttribute('id', `group-${bldg.id}`);
      bldgGroup.setAttribute('data-id', bldg.id);

      // 1. Roof Wireframe Polygon
      if (bldg.roofPolygon && bldg.roofPolygon.length > 0) {
        const roofPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        roofPoly.setAttribute('class', 'wireframe-roof');
        roofPoly.setAttribute('points', pointsToString(bldg.roofPolygon));
        bldgGroup.appendChild(roofPoly);
      }

      // 2. 3D Architectural Wireframe Edges
      if (bldg.wireframeEdges && bldg.wireframeEdges.length > 0) {
        bldg.wireframeEdges.forEach(([p1, p2]) => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'wireframe-edge');
          line.setAttribute('x1', p1[0]);
          line.setAttribute('y1', p1[1]);
          line.setAttribute('x2', p2[0]);
          line.setAttribute('y2', p2[1]);
          bldgGroup.appendChild(line);
        });
      }

      // 3. Sub-Features (terrace circular ring)
      if (bldg.subFeatures && bldg.subFeatures.length > 0) {
        bldg.subFeatures.forEach((feat) => {
          if (feat.circle) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'wireframe-subfeature');
            circle.setAttribute('cx', feat.circle.cx);
            circle.setAttribute('cy', feat.circle.cy);
            circle.setAttribute('r', feat.circle.r);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '1.6');
            circle.setAttribute('stroke-dasharray', '5 4');
            circle.setAttribute('fill', 'rgba(255, 255, 255, 0.04)');
            bldgGroup.appendChild(circle);
          }
        });
      }

      // 4. Minimalist Diamond Callout Pins & Labels
      if (bldg.pins && bldg.pins.length > 0) {
        const calloutGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        calloutGroup.setAttribute('class', 'callout-group');

        bldg.pins.forEach((pin) => {
          const isLeft = pin.labelPos[0] < pin.pos[0];

          // Fine dotted leader line
          const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          leader.setAttribute('class', 'pin-leader-line');
          leader.setAttribute('x1', pin.pos[0]);
          leader.setAttribute('y1', pin.pos[1]);
          leader.setAttribute('x2', pin.labelPos[0]);
          leader.setAttribute('y2', pin.labelPos[1]);
          calloutGroup.appendChild(leader);

          // Diamond Node
          const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          diamond.setAttribute('class', 'pin-diamond-shape');
          diamond.setAttribute(
            'points',
            `${pin.pos[0]},${pin.pos[1] - 8} ${pin.pos[0] + 8},${pin.pos[1]} ${pin.pos[0]},${pin.pos[1] + 8} ${pin.pos[0] - 8},${pin.pos[1]}`
          );
          calloutGroup.appendChild(diamond);

          // Minimalist Badge Box
          const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          badgeGroup.setAttribute('class', 'svg-pin-badge');

          const boxWidth = 220;
          const boxHeight = 32;
          const boxX = isLeft ? pin.labelPos[0] - boxWidth : pin.labelPos[0];
          const boxY = pin.labelPos[1] - (boxHeight / 2);

          const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeRect.setAttribute('x', boxX);
          badgeRect.setAttribute('y', boxY);
          badgeRect.setAttribute('width', boxWidth);
          badgeRect.setAttribute('height', boxHeight);
          badgeRect.setAttribute('rx', '4');
          badgeRect.setAttribute('fill', 'rgba(12, 15, 20, 0.92)');
          badgeRect.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
          badgeRect.setAttribute('stroke-width', '1');
          badgeGroup.appendChild(badgeRect);

          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleText.setAttribute('x', isLeft ? boxX + boxWidth - 12 : boxX + 12);
          titleText.setAttribute('y', boxY + 20);
          titleText.setAttribute('text-anchor', isLeft ? 'end' : 'start');
          titleText.textContent = pin.title;
          badgeGroup.appendChild(titleText);

          calloutGroup.appendChild(badgeGroup);
        });

        bldgGroup.appendChild(calloutGroup);
      }

      // 5. Hit Zone Polygon (for instant, smooth hover detection)
      const hitZone = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      hitZone.setAttribute('class', 'building-hit-zone');
      hitZone.setAttribute('points', pointsToString(bldg.polygon));
      hitZone.setAttribute('data-id', bldg.id);

      hitZone.addEventListener('mouseenter', () => {
        if (!isCalibrating) {
          activateBuilding(bldg);
        }
      });

      hitZone.addEventListener('mouseleave', () => {
        if (!isCalibrating && activeBuildingId === bldg.id) {
          deactivateBuilding();
        }
      });

      bldgGroup.appendChild(hitZone);

      // 6. Calibration Vertex Indicators (Numbered dots on every polygon point)
      const calVertexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      calVertexGroup.setAttribute('class', 'calibration-vertex-group');
      calVertexGroup.setAttribute('id', `cal-group-${bldg.id}`);
      calVertexGroup.style.display = 'none';

      bldg.polygon.forEach(([x, y], idx) => {
        const vG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        vG.setAttribute('class', 'calibration-vertex');
        vG.setAttribute('transform', `translate(${x}, ${y})`);

        const vCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        vCircle.setAttribute('class', 'cal-vertex-circle');
        vCircle.setAttribute('r', '12');

        const vText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        vText.setAttribute('class', 'cal-vertex-text');
        vText.setAttribute('text-anchor', 'middle');
        vText.setAttribute('dy', '4.5');
        vText.textContent = idx;

        vG.appendChild(vCircle);
        vG.appendChild(vText);

        // Click on a vertex to copy its exact array code
        vG.addEventListener('click', (e) => {
          e.stopPropagation();
          const coordText = `[${x}, ${y}]`;
          navigator.clipboard.writeText(coordText);
          showToast(`Point ${idx} of ${bldg.name}: ${coordText} copied!`);
          calLastClick.textContent = `Point ${idx}: [${x}, ${y}] (copied)`;
        });

        calVertexGroup.appendChild(vG);
      });

      bldgGroup.appendChild(calVertexGroup);
      svgOverlay.appendChild(bldgGroup);
    });
  }

  /**
   * Activates a building: updates spotlight cutout, vector wireframes, and HUD card
   */
  function activateBuilding(bldg) {
    activeBuildingId = bldg.id;
    viewportCard.classList.add('has-focus');

    // 1. Calculate CSS percentage clip-path for spotlight illumination
    const clipPolygonString = bldg.polygon
      .map(([x, y]) => {
        const xPct = ((x / IMAGE_CONFIG.width) * 100).toFixed(3);
        const yPct = ((y / IMAGE_CONFIG.height) * 100).toFixed(3);
        return `${xPct}% ${yPct}%`;
      })
      .join(', ');

    spotlightImage.style.clipPath = `polygon(${clipPolygonString})`;
    spotlightImage.style.webkitClipPath = `polygon(${clipPolygonString})`;

    // 2. Activate wireframe vector group
    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.remove('active-building');
    });
    const activeGroup = document.getElementById(`group-${bldg.id}`);
    if (activeGroup) {
      activeGroup.classList.add('active-building');
    }

    // 3. Smart HUD Docking (dock right if building is on the left edge)
    const isLeftBuilding = bldg.polygon.some(([x]) => x < 500);
    if (isLeftBuilding) {
      hudCard.classList.add('dock-right');
    } else {
      hudCard.classList.remove('dock-right');
    }

    // 4. Update Minimalist HUD Card
    updateHudCard(bldg);
  }

  /**
   * Deactivates the current building and resets to standby state
   */
  function deactivateBuilding() {
    activeBuildingId = null;
    viewportCard.classList.remove('has-focus');
    hudCard.classList.remove('dock-right');

    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.remove('active-building');
    });

    setHudStandby();
  }

  /**
   * Updates HUD Card with Building Details, Sensitivity Pills, and Metrics
   */
  function updateHudCard(bldg) {
    hudCard.classList.remove('state-standby');

    document.getElementById('hudBldgName').textContent = bldg.name;
    document.getElementById('hudBldgMeta').textContent = `${bldg.address} • ${bldg.category}`;

    // Sensitivity Pills (5 monochrome segments per row)
    renderPillMeter('meterCondition', bldg.sensitivity.physicalCondition);
    renderPillMeter('meterMomentum', bldg.sensitivity.developmentMomentum);
    renderPillMeter('meterTrajectory', bldg.sensitivity.neighborhoodTrajectory);

    // Metrics
    document.getElementById('metricValuation').textContent = bldg.metrics.valuation;
    document.getElementById('metricEfficiency').textContent = bldg.metrics.efficiency;

    // Single Fact Line
    const randomFact = bldg.facts[Math.floor(Math.random() * bldg.facts.length)];
    document.getElementById('hudFactText').textContent = randomFact;
  }

  /**
   * Renders 5 pill segments for a sensitivity meter row
   */
  function renderPillMeter(containerId, activeCount) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const seg = document.createElement('div');
      seg.className = `pill-segment ${i <= activeCount ? 'active' : ''}`;
      container.appendChild(seg);
    }
  }

  /**
   * Sets HUD Card to Standby Mode
   */
  function setHudStandby() {
    hudCard.classList.add('state-standby');
    document.getElementById('hudBldgName').textContent = 'District Telemetry';
    document.getElementById('hudBldgMeta').textContent = 'Hover over a building to inspect';
  }

  /**
   * Helper: converts coordinate array to SVG points string
   */
  function pointsToString(points) {
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  }

  /**
   * Displays temporary toast notification
   */
  function showToast(msg) {
    copyToast.textContent = msg;
    copyToast.classList.add('show');
    setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2000);
  }

  /**
   * Sets up interactive calibration mode
   */
  function setupCalibration() {
    // Toggle button in header
    calibrateToggleBtn.addEventListener('click', toggleCalibration);

    // Keyboard shortcut 'C'
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'c' || e.key === 'C') && !e.target.matches('input, textarea, select')) {
        toggleCalibration();
      }
    });

    // Dropdown to filter which building's vertices are displayed
    calBuildingSelect.addEventListener('change', updateCalibrationFilter);

    // Track mouse coordinates over the viewport
    viewportCard.addEventListener('mousemove', (e) => {
      const rect = viewportCard.getBoundingClientRect();
      const scaleX = IMAGE_CONFIG.width / rect.width;
      const scaleY = IMAGE_CONFIG.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      if (isCalibrating) {
        calCoords.textContent = `Cursor: X: ${x}, Y: ${y}`;
      }
    });

    // Click on image to copy coordinates
    viewportCard.addEventListener('click', (e) => {
      if (!isCalibrating) return;

      const rect = viewportCard.getBoundingClientRect();
      const scaleX = IMAGE_CONFIG.width / rect.width;
      const scaleY = IMAGE_CONFIG.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      const coordString = `[${x}, ${y}]`;
      navigator.clipboard.writeText(coordString);
      showToast(`Copied ${coordString} to clipboard!`);
      calLastClick.textContent = `Last clicked: ${coordString} (copied)`;
    });
  }

  /**
   * Toggles calibration mode on/off
   */
  function toggleCalibration() {
    isCalibrating = !isCalibrating;
    document.body.classList.toggle('mode-calibration', isCalibrating);
    calibrationBar.classList.toggle('open', isCalibrating);
    calibrateToggleBtn.classList.toggle('active', isCalibrating);
    calibrateToggleBtn.textContent = isCalibrating ? '✕ Exit Calibration' : '📐 Calibrate';

    if (isCalibrating) {
      deactivateBuilding();
      updateCalibrationFilter();
    } else {
      document.querySelectorAll('.calibration-vertex-group').forEach((g) => {
        g.style.display = 'none';
      });
      document.querySelectorAll('.building-vector-group').forEach((g) => {
        g.classList.remove('cal-focused');
      });
    }
  }

  /**
   * Updates which building's vertex dots are visible
   */
  function updateCalibrationFilter() {
    const val = calBuildingSelect.value;

    BUILDINGS.forEach((bldg) => {
      const vGroup = document.getElementById(`cal-group-${bldg.id}`);
      const bGroup = document.getElementById(`group-${bldg.id}`);
      const shouldShow = val === 'all' || val === bldg.id;

      if (vGroup) {
        vGroup.style.display = shouldShow ? 'block' : 'none';
      }
      if (bGroup) {
        bGroup.classList.toggle('cal-focused', shouldShow);
      }
    });
  }
});
