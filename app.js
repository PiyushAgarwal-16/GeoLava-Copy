/**
 * Urban Intelligence & Building Telemetry Interactive Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const viewportCard = document.getElementById('viewportCard');
  const baseImage = document.getElementById('baseImage');
  const spotlightImage = document.getElementById('spotlightImage');
  const svgOverlay = document.getElementById('svgOverlay');
  const hudCard = document.getElementById('hudCard');
  const calibrationBar = document.getElementById('calibrationBar');
  const coordDisplay = document.getElementById('coordDisplay');

  let activeBuildingId = null;
  let factInterval = null;
  let calibrationMode = false;

  // Initialize SVG vector layers & hit zones
  initSvgLayers();

  // Initialize HUD standby mode
  setHudStandby();

  // Setup theme toggle & calibration mode
  setupControls();

  /**
   * Builds all SVG elements: defs, glow filters, wireframe geometry, pins, and hit zones
   */
  function initSvgLayers() {
    svgOverlay.innerHTML = '';

    // Create SVG Defs for Glow and Pattern Filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-badge" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="rgba(0,0,0,0.85)" />
      </filter>
      <pattern id="solar-grid-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="rgba(56, 189, 248, 0.14)" />
        <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(56, 189, 248, 0.55)" stroke-width="1.2" />
      </pattern>
    `;
    svgOverlay.appendChild(defs);

    // Render each building's vector group
    BUILDINGS.forEach((bldg) => {
      const bldgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      bldgGroup.setAttribute('class', 'building-vector-group');
      bldgGroup.setAttribute('id', `group-${bldg.id}`);

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

      // 3. Sub-Features (Terraces, Solar arrays, Skylights)
      if (bldg.subFeatures && bldg.subFeatures.length > 0) {
        bldg.subFeatures.forEach((feat) => {
          if (feat.circle) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'wireframe-subfeature');
            circle.setAttribute('cx', feat.circle.cx);
            circle.setAttribute('cy', feat.circle.cy);
            circle.setAttribute('r', feat.circle.r);
            circle.setAttribute('stroke', feat.color || '#10b981');
            circle.setAttribute('stroke-width', '3');
            circle.setAttribute('fill', 'rgba(16, 185, 129, 0.2)');
            circle.setAttribute('filter', 'url(#glow-cyan)');
            bldgGroup.appendChild(circle);

            if (feat.innerCircle) {
              const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              innerCircle.setAttribute('class', 'wireframe-subfeature');
              innerCircle.setAttribute('cx', feat.innerCircle.cx);
              innerCircle.setAttribute('cy', feat.innerCircle.cy);
              innerCircle.setAttribute('r', feat.innerCircle.r);
              innerCircle.setAttribute('stroke', '#ffffff');
              innerCircle.setAttribute('stroke-width', '2');
              innerCircle.setAttribute('stroke-dasharray', '6 5');
              innerCircle.setAttribute('fill', 'rgba(255, 255, 255, 0.08)');
              bldgGroup.appendChild(innerCircle);
            }
          } else if (feat.polygon) {
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('class', 'wireframe-subfeature');
            poly.setAttribute('points', pointsToString(feat.polygon));
            poly.setAttribute('stroke', feat.color || '#38bdf8');
            poly.setAttribute('stroke-width', '2.5');
            poly.setAttribute('fill', 'url(#solar-grid-pattern)');
            bldgGroup.appendChild(poly);
          }
        });
      }

      // 4. Diamond Callout Pins & Native SVG Typography Tags
      if (bldg.pins && bldg.pins.length > 0) {
        const calloutGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        calloutGroup.setAttribute('class', 'callout-group');

        bldg.pins.forEach((pin) => {
          const pinColor = pin.color || '#38bdf8';
          const isLeft = pin.labelPos[0] < pin.pos[0];

          // Fine dotted leader line
          const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          leader.setAttribute('class', 'pin-leader-line');
          leader.setAttribute('x1', pin.pos[0]);
          leader.setAttribute('y1', pin.pos[1]);
          leader.setAttribute('x2', pin.labelPos[0]);
          leader.setAttribute('y2', pin.labelPos[1]);
          calloutGroup.appendChild(leader);

          // Animated pulsating radar wave ring
          const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ring.setAttribute('class', 'pin-radar-ring');
          ring.setAttribute('cx', pin.pos[0]);
          ring.setAttribute('cy', pin.pos[1]);
          ring.setAttribute('r', '8');
          ring.setAttribute('stroke', pinColor);
          calloutGroup.appendChild(ring);

          // Glowing diamond shape
          const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          diamond.setAttribute('class', 'pin-diamond-shape');
          diamond.setAttribute(
            'points',
            `${pin.pos[0]},${pin.pos[1] - 10} ${pin.pos[0] + 10},${pin.pos[1]} ${pin.pos[0]},${pin.pos[1] + 10} ${pin.pos[0] - 10},${pin.pos[1]}`
          );
          diamond.setAttribute('fill', '#ffffff');
          diamond.setAttribute('stroke', pinColor);
          calloutGroup.appendChild(diamond);

          // High-contrast Native SVG Badge Box
          const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          badgeGroup.setAttribute('class', 'svg-pin-badge');
          badgeGroup.setAttribute('filter', 'url(#glow-badge)');

          const boxWidth = 270;
          const boxHeight = 52;
          const boxX = isLeft ? pin.labelPos[0] - boxWidth : pin.labelPos[0];
          const boxY = pin.labelPos[1] - (boxHeight / 2);

          // Badge Background Rectangle
          const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeRect.setAttribute('x', boxX);
          badgeRect.setAttribute('y', boxY);
          badgeRect.setAttribute('width', boxWidth);
          badgeRect.setAttribute('height', boxHeight);
          badgeRect.setAttribute('rx', '6');
          badgeRect.setAttribute('fill', 'rgba(10, 14, 22, 0.94)');
          badgeRect.setAttribute('stroke', 'rgba(255, 255, 255, 0.25)');
          badgeRect.setAttribute('stroke-width', '1.2');
          badgeGroup.appendChild(badgeRect);

          // Accent side bar
          const accentBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          accentBar.setAttribute('x', isLeft ? boxX + boxWidth - 4 : boxX);
          accentBar.setAttribute('y', boxY);
          accentBar.setAttribute('width', '4');
          accentBar.setAttribute('height', boxHeight);
          accentBar.setAttribute('rx', '2');
          accentBar.setAttribute('fill', pinColor);
          badgeGroup.appendChild(accentBar);

          // Primary Title Text
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleText.setAttribute('x', isLeft ? boxX + boxWidth - 14 : boxX + 14);
          titleText.setAttribute('y', boxY + 22);
          titleText.setAttribute('text-anchor', isLeft ? 'end' : 'start');
          titleText.setAttribute('fill', '#ffffff');
          titleText.setAttribute('font-family', 'var(--font-mono)');
          titleText.setAttribute('font-size', '13.5');
          titleText.setAttribute('font-weight', '700');
          titleText.setAttribute('letter-spacing', '0.08em');
          titleText.textContent = pin.title;
          badgeGroup.appendChild(titleText);

          // Subtitle Text
          const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          subText.setAttribute('x', isLeft ? boxX + boxWidth - 14 : boxX + 14);
          subText.setAttribute('y', boxY + 40);
          subText.setAttribute('text-anchor', isLeft ? 'end' : 'start');
          subText.setAttribute('fill', pinColor);
          subText.setAttribute('font-family', 'var(--font-mono)');
          subText.setAttribute('font-size', '10.5');
          subText.setAttribute('font-weight', '600');
          subText.setAttribute('letter-spacing', '0.06em');
          subText.textContent = pin.subtitle;
          badgeGroup.appendChild(subText);

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
        activateBuilding(bldg);
      });

      hitZone.addEventListener('mouseleave', () => {
        if (activeBuildingId === bldg.id) {
          deactivateBuilding();
        }
      });

      bldgGroup.appendChild(hitZone);
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

    // 3. Smart HUD Docking (avoid occluding buildings in the bottom-left)
    const isLeftBuilding = bldg.polygon.some(([x]) => x < 600) && bldg.polygon.every(([x]) => x < 1300);
    if (isLeftBuilding) {
      hudCard.classList.add('dock-right');
    } else {
      hudCard.classList.remove('dock-right');
    }

    // 4. Update HUD Telemetry Card
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
    if (factInterval) {
      clearInterval(factInterval);
      factInterval = null;
    }

    hudCard.classList.remove('state-standby');

    // Code & Name
    document.getElementById('hudCode').textContent = bldg.code;
    document.getElementById('hudBldgName').textContent = bldg.name;
    document.getElementById('hudBldgAddress').textContent = `${bldg.address} • ${bldg.stories} Fl • ${bldg.category}`;

    // Sensitivity Pills (5-segments per row, exactly as in Screenshot 2)
    renderPillMeter('meterCondition', bldg.sensitivity.physicalCondition);
    renderPillMeter('meterMomentum', bldg.sensitivity.developmentMomentum);
    renderPillMeter('meterTrajectory', bldg.sensitivity.neighborhoodTrajectory);

    // Metrics (from Screenshot 4)
    document.getElementById('metricValuation').innerHTML = `<span class="trend-up">▲</span> ${bldg.metrics.valuation}`;
    document.getElementById('metricEfficiency').innerHTML = `<span class="trend-up">▲</span> ${bldg.metrics.maintenanceEfficiency}`;
    document.getElementById('metricSolar').textContent = bldg.metrics.solarPotential;
    document.getElementById('metricCarbon').textContent = bldg.metrics.carbonOffset;

    // Dynamic Fact Feed
    let currentFactIndex = 0;
    const factTextElem = document.getElementById('hudFactText');
    if (bldg.facts && bldg.facts.length > 0) {
      factTextElem.textContent = bldg.facts[0];
      factInterval = setInterval(() => {
        currentFactIndex = (currentFactIndex + 1) % bldg.facts.length;
        factTextElem.style.opacity = '0';
        setTimeout(() => {
          factTextElem.textContent = bldg.facts[currentFactIndex];
          factTextElem.style.opacity = '1';
        }, 220);
      }, 4500);
    }
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
   * Sets HUD Card to Standby / Sector Overview Mode
   */
  function setHudStandby() {
    if (factInterval) {
      clearInterval(factInterval);
      factInterval = null;
    }

    hudCard.classList.add('state-standby');
    document.getElementById('hudCode').textContent = 'SECTOR 04 // STANDBY';
    document.getElementById('hudBldgName').textContent = 'District Aerial Telemetry';
    document.getElementById('hudBldgAddress').textContent = 'Hover over any structure to inspect architectural telemetry';

    document.getElementById('metricValuation').innerHTML = '$642.8 M';
    document.getElementById('metricEfficiency').innerHTML = '94.6%';
    document.getElementById('metricSolar').textContent = '4,120 MWh / yr';
    document.getElementById('metricCarbon').textContent = '1,240 t / yr';
  }

  /**
   * Helper: converts coordinate array to SVG points string
   */
  function pointsToString(points) {
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  }

  /**
   * Controls: theme switcher, calibration mode, and mouse coordinates
   */
  function setupControls() {
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      themeBtn.textContent = document.body.classList.contains('theme-light') ? '🌙 Dark Mode' : '☀️ Blueprint';
    });

    const calibrateBtn = document.getElementById('calibrateToggleBtn');
    calibrateBtn.addEventListener('click', () => {
      calibrationMode = !calibrationMode;
      calibrationBar.classList.toggle('open', calibrationMode);
      calibrateBtn.textContent = calibrationMode ? '✕ Close Calibration' : '📐 Calibrate';
    });

    // Keyboard shortcut 'C' for calibration
    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') {
        calibrationMode = !calibrationMode;
        calibrationBar.classList.toggle('open', calibrationMode);
        calibrateBtn.textContent = calibrationMode ? '✕ Close Calibration' : '📐 Calibrate';
      }
    });

    // Track mouse position over viewport for calibration
    viewportCard.addEventListener('mousemove', (e) => {
      if (!calibrationMode) return;
      const rect = viewportCard.getBoundingClientRect();
      const scaleX = IMAGE_CONFIG.width / rect.width;
      const scaleY = IMAGE_CONFIG.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      coordDisplay.textContent = `X: ${x}, Y: ${y} [${((x / IMAGE_CONFIG.width) * 100).toFixed(1)}%, ${((y / IMAGE_CONFIG.height) * 100).toFixed(1)}%]`;
    });
  }
});
