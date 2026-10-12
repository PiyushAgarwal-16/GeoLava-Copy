/**
 * Urban Intelligence & Building Telemetry Interactive Controller
 * Minimalist Architectural Edition
 */

document.addEventListener('DOMContentLoaded', () => {
  const viewportCard = document.getElementById('viewportCard');
  const baseImage = document.getElementById('baseImage');
  const spotlightImage = document.getElementById('spotlightImage');
  const svgOverlay = document.getElementById('svgOverlay');
  const hudCard = document.getElementById('hudCard');

  let activeBuildingId = null;

  // Initialize vector overlay & hit zones
  initSvgLayers();

  // Initialize HUD standby mode
  setHudStandby();

  /**
   * Builds all SVG elements: wireframe geometry, pins, and hit zones
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

      // 3. Sub-Features (e.g. subtle terrace circular rings)
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

    // 3. Smart HUD Docking (avoid occluding buildings on the left)
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

    // Single Fact Line (randomly pick from facts array)
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
});
