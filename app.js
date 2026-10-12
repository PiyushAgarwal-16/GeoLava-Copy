/**
 * Urban Intelligence & Building Telemetry Controller
 * Interactive Drag-and-Drop & Point Re-Plotting Editor Edition
 */

document.addEventListener('DOMContentLoaded', () => {
  const viewportCard = document.getElementById('viewportCard');
  const spotlightImage = document.getElementById('spotlightImage');
  const svgOverlay = document.getElementById('svgOverlay');
  const hudCard = document.getElementById('hudCard');
  const copyToast = document.getElementById('copyToast');

  // Toolbar Elements
  const editToggleBtn = document.getElementById('editToggleBtn');
  const editorBar = document.getElementById('editorBar');
  const editBuildingSelect = document.getElementById('editBuildingSelect');
  const modeDragBtn = document.getElementById('modeDragBtn');
  const modeReplotBtn = document.getElementById('modeReplotBtn');
  const editStatusReadout = document.getElementById('editStatusReadout');
  const exportCodeBtn = document.getElementById('exportCodeBtn');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const footerModeInfo = document.getElementById('footerModeInfo');

  const STORAGE_KEY = 'building_telemetry_custom_coords_v2';

  // Deep clone initial defaults for reset support
  const DEFAULT_BUILDINGS = JSON.parse(JSON.stringify(BUILDINGS));

  // Load any saved custom coordinates from localStorage
  loadSavedCoordinates();

  // Application State
  let activeHoverBuildingId = null;
  let isEditing = false;
  let editBuildingId = 'bldg-terrace';
  let editSubMode = 'drag'; // 'drag' or 'replot'
  let replotPoints = [];
  let dragPointIndex = null;

  // Initialize SVG vector overlay
  initSvgLayers();

  // Initialize HUD in standby state
  setHudStandby();

  // Setup Visual Editor Controller
  setupEditorController();

  // Synchronize building geometry (wireframes and roof)
  BUILDINGS.forEach(syncBuildingGeometry);

  /**
   * Builds the entire SVG overlay: hit zones, wireframes, callouts, and editor handles
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
      const roofPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      roofPoly.setAttribute('class', 'wireframe-roof');
      roofPoly.setAttribute('id', `roof-${bldg.id}`);
      roofPoly.setAttribute('points', pointsToString(bldg.roofPolygon || []));
      bldgGroup.appendChild(roofPoly);

      // 2. Wireframe Edges Group
      const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      edgesGroup.setAttribute('id', `edges-${bldg.id}`);
      bldgGroup.appendChild(edgesGroup);
      renderWireframeEdges(bldg, edgesGroup);

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

      // 5. Hit Zone Polygon
      const hitZone = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      hitZone.setAttribute('class', 'building-hit-zone');
      hitZone.setAttribute('id', `hitzone-${bldg.id}`);
      hitZone.setAttribute('points', pointsToString(bldg.polygon));
      hitZone.setAttribute('data-id', bldg.id);

      hitZone.addEventListener('mouseenter', () => {
        if (!isEditing) {
          activateBuildingHover(bldg);
        }
      });

      hitZone.addEventListener('mouseleave', () => {
        if (!isEditing && activeHoverBuildingId === bldg.id) {
          deactivateBuildingHover();
        }
      });

      bldgGroup.appendChild(hitZone);
      svgOverlay.appendChild(bldgGroup);
    });

    // Layer for Re-plotting Preview Elements
    const replotLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    replotLayer.setAttribute('id', 'replotLayer');
    svgOverlay.appendChild(replotLayer);

    // Layer for Draggable Handle Groups
    const handlesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    handlesLayer.setAttribute('id', 'handlesLayer');
    svgOverlay.appendChild(handlesLayer);
  }

  /**
   * Renders wireframe edge line elements for a building
   */
  function renderWireframeEdges(bldg, container) {
    container.innerHTML = '';
    (bldg.wireframeEdges || []).forEach(([p1, p2]) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'wireframe-edge');
      line.setAttribute('x1', p1[0]);
      line.setAttribute('y1', p1[1]);
      line.setAttribute('x2', p2[0]);
      line.setAttribute('y2', p2[1]);
      container.appendChild(line);
    });
  }

  /**
   * Synchronizes building roof and 3D wireframe edges from its polygon
   */
  function syncBuildingGeometry(bldg) {
    const pts = bldg.polygon;
    if (!pts || pts.length < 3) return;

    if (bldg.id === 'bldg-terrace' && pts.length === 6) {
      // 0: top roof, 1: right roof, 2: front-right roof, 3: front-right ground, 4: front-left ground, 5: front-left roof
      bldg.roofPolygon = [pts[0], pts[1], pts[2], pts[5]];
      bldg.wireframeEdges = [
        [pts[0], pts[1]],
        [pts[1], pts[2]],
        [pts[2], pts[5]],
        [pts[5], pts[0]],
        [pts[2], pts[3]],
        [pts[5], pts[4]],
        [pts[4], pts[3]],
      ];
    } else if (bldg.id === 'bldg-left-tower' && pts.length === 4) {
      bldg.roofPolygon = [pts[0], pts[1], [pts[1][0], 120], [pts[0][0], 120]];
      bldg.wireframeEdges = [
        [pts[1], pts[2]],
        [pts[0], pts[1]],
        [[0, 240], [pts[1][0] + (pts[2][0] - pts[1][0]) * 0.16, 240]],
        [[0, 480], [pts[1][0] + (pts[2][0] - pts[1][0]) * 0.32, 480]],
        [[0, 720], [pts[1][0] + (pts[2][0] - pts[1][0]) * 0.48, 720]],
        [[0, 960], [pts[1][0] + (pts[2][0] - pts[1][0]) * 0.65, 960]],
        [[0, 1200], [pts[1][0] + (pts[2][0] - pts[1][0]) * 0.81, 1200]],
      ];
    } else if (bldg.id === 'bldg-dark-midrise' && pts.length === 6) {
      bldg.roofPolygon = [pts[0], pts[1], pts[2], pts[5]];
      bldg.wireframeEdges = [
        [pts[0], pts[1]],
        [pts[1], pts[2]],
        [pts[2], pts[5]],
        [pts[5], pts[0]],
        [pts[5], pts[4]],
        [pts[2], pts[3]],
        [pts[4], pts[3]],
      ];
    } else if (bldg.id === 'bldg-civic-pavilion' && pts.length === 7) {
      bldg.roofPolygon = [pts[0], pts[1], pts[2], pts[6]];
      bldg.wireframeEdges = [
        [pts[0], pts[1]],
        [pts[1], pts[2]],
        [pts[2], pts[6]],
        [pts[6], pts[0]],
        [pts[2], pts[3]],
        [pts[3], pts[4]],
      ];
    }

    // Update SVG elements live
    const hitZone = document.getElementById(`hitzone-${bldg.id}`);
    if (hitZone) hitZone.setAttribute('points', pointsToString(bldg.polygon));

    const roofPoly = document.getElementById(`roof-${bldg.id}`);
    if (roofPoly && bldg.roofPolygon) roofPoly.setAttribute('points', pointsToString(bldg.roofPolygon));

    const edgesGroup = document.getElementById(`edges-${bldg.id}`);
    if (edgesGroup) renderWireframeEdges(bldg, edgesGroup);
  }

  /**
   * Applies CSS percentage clip-path to spotlight image
   */
  function applySpotlightCutout(bldg) {
    const clipString = bldg.polygon
      .map(([x, y]) => {
        const xPct = ((x / IMAGE_CONFIG.width) * 100).toFixed(3);
        const yPct = ((y / IMAGE_CONFIG.height) * 100).toFixed(3);
        return `${xPct}% ${yPct}%`;
      })
      .join(', ');

    spotlightImage.style.clipPath = `polygon(${clipString})`;
    spotlightImage.style.webkitClipPath = `polygon(${clipString})`;
  }

  /**
   * Activates building hover state
   */
  function activateBuildingHover(bldg) {
    activeHoverBuildingId = bldg.id;
    viewportCard.classList.add('has-focus');

    applySpotlightCutout(bldg);

    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.remove('active-building');
    });
    const activeGroup = document.getElementById(`group-${bldg.id}`);
    if (activeGroup) activeGroup.classList.add('active-building');

    // Smart HUD Docking
    const isLeftBuilding = bldg.polygon.some(([x]) => x < 500);
    hudCard.classList.toggle('dock-right', isLeftBuilding);

    updateHudCard(bldg);
  }

  /**
   * Deactivates building hover state
   */
  function deactivateBuildingHover() {
    activeHoverBuildingId = null;
    viewportCard.classList.remove('has-focus');
    hudCard.classList.remove('dock-right');

    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.remove('active-building');
    });

    setHudStandby();
  }

  /**
   * Updates HUD Card with building information
   */
  function updateHudCard(bldg) {
    hudCard.classList.remove('state-standby');
    document.getElementById('hudBldgName').textContent = bldg.name;
    document.getElementById('hudBldgMeta').textContent = `${bldg.address} • ${bldg.category}`;

    renderPillMeter('meterCondition', bldg.sensitivity.physicalCondition);
    renderPillMeter('meterMomentum', bldg.sensitivity.developmentMomentum);
    renderPillMeter('meterTrajectory', bldg.sensitivity.neighborhoodTrajectory);

    document.getElementById('metricValuation').textContent = bldg.metrics.valuation;
    document.getElementById('metricEfficiency').textContent = bldg.metrics.efficiency;

    const randomFact = bldg.facts[Math.floor(Math.random() * bldg.facts.length)];
    document.getElementById('hudFactText').textContent = randomFact;
  }

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

  function setHudStandby() {
    hudCard.classList.add('state-standby');
    document.getElementById('hudBldgName').textContent = 'District Telemetry';
    document.getElementById('hudBldgMeta').textContent = 'Hover over a building to inspect';
  }

  function pointsToString(points) {
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  }

  function showToast(msg) {
    copyToast.textContent = msg;
    copyToast.classList.add('show');
    setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2200);
  }

  // ==========================================================================
  // INTERACTIVE VISUAL EDITOR LOGIC
  // ==========================================================================

  function setupEditorController() {
    // 1. Toggle Button & Shortcut 'E'
    editToggleBtn.addEventListener('click', toggleEditMode);
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'e' || e.key === 'E') && !e.target.matches('input, textarea, select')) {
        toggleEditMode();
      }
    });

    // 2. Building Select Change
    editBuildingSelect.addEventListener('change', () => {
      editBuildingId = editBuildingSelect.value;
      if (isEditing) {
        replotPoints = [];
        renderEditorHandles();
      }
    });

    // 3. Sub-Mode Toggle Buttons ('drag' vs 'replot')
    modeDragBtn.addEventListener('click', () => {
      setEditSubMode('drag');
    });

    modeReplotBtn.addEventListener('click', () => {
      setEditSubMode('replot');
    });

    // 4. Copy Code Button
    exportCodeBtn.addEventListener('click', exportCoordinatesCode);

    // 5. Reset to Defaults Button
    resetDefaultsBtn.addEventListener('click', resetToDefaults);

    // 6. Viewport click handling for Re-plot Mode
    viewportCard.addEventListener('click', handleViewportClick);

    // 7. Track mouse over viewport to update readout coordinates
    viewportCard.addEventListener('mousemove', (e) => {
      if (!isEditing || dragPointIndex !== null) return;
      const [x, y] = getMouseImageCoords(e);
      if (editSubMode === 'replot') {
        const bldg = getEditBuilding();
        const nextIdx = replotPoints.length;
        editStatusReadout.textContent = `Click Point ${nextIdx + 1} of ${bldg.polygon.length} [Cursor: X: ${x}, Y: ${y}]`;
      } else {
        editStatusReadout.textContent = `Cursor: X: ${x}, Y: ${y} • Drag handles to adjust alignment`;
      }
    });
  }

  function toggleEditMode() {
    isEditing = !isEditing;
    document.body.classList.toggle('mode-editor', isEditing);
    editorBar.classList.toggle('open', isEditing);
    editToggleBtn.classList.toggle('active', isEditing);
    editToggleBtn.textContent = isEditing ? '✕ Exit Editor' : '✏️ Edit Mode';
    footerModeInfo.textContent = isEditing ? 'VIEW MODE: INTERACTIVE CALIBRATION' : 'VIEW MODE: HOVER TELEMETRY';

    if (isEditing) {
      deactivateBuildingHover();
      renderEditorHandles();
    } else {
      clearEditorHandles();
      clearReplotLayer();
      deactivateBuildingHover();
    }
  }

  function setEditSubMode(mode) {
    editSubMode = mode;
    modeDragBtn.classList.toggle('active', mode === 'drag');
    modeReplotBtn.classList.toggle('active', mode === 'replot');
    replotPoints = [];
    clearReplotLayer();

    const bldg = getEditBuilding();
    if (mode === 'replot') {
      clearEditorHandles();
      editStatusReadout.textContent = `Click Point 1 of ${bldg.polygon.length} on the image to mark new boundary`;
      showToast(`Re-plot Mode: Click ${bldg.polygon.length} points on the image`);
    } else {
      renderEditorHandles();
      editStatusReadout.textContent = `Drag handles to adjust alignment live`;
    }
  }

  function getEditBuilding() {
    return BUILDINGS.find((b) => b.id === editBuildingId) || BUILDINGS[0];
  }

  function getMouseImageCoords(e) {
    const rect = viewportCard.getBoundingClientRect();
    const scaleX = IMAGE_CONFIG.width / rect.width;
    const scaleY = IMAGE_CONFIG.height / rect.height;
    const x = Math.min(IMAGE_CONFIG.width, Math.max(0, Math.round((e.clientX - rect.left) * scaleX)));
    const y = Math.min(IMAGE_CONFIG.height, Math.max(0, Math.round((e.clientY - rect.top) * scaleY)));
    return [x, y];
  }

  /**
   * Renders draggable handles for the active editing building
   */
  function renderEditorHandles() {
    clearEditorHandles();
    clearReplotLayer();

    const bldg = getEditBuilding();
    const handlesLayer = document.getElementById('handlesLayer');

    // Highlight active building in viewport
    viewportCard.classList.add('has-focus');
    applySpotlightCutout(bldg);

    document.querySelectorAll('.building-vector-group').forEach((g) => {
      g.classList.toggle('is-editing', g.getAttribute('data-id') === bldg.id);
      g.classList.toggle('active-building', g.getAttribute('data-id') === bldg.id);
    });

    // Create a draggable handle for each vertex
    bldg.polygon.forEach(([x, y], idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'drag-handle-group');
      g.setAttribute('transform', `translate(${x}, ${y})`);
      g.setAttribute('data-idx', idx);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'drag-handle-circle');
      circle.setAttribute('r', '13');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'drag-handle-text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '4.5');
      text.textContent = idx;

      g.appendChild(circle);
      g.appendChild(text);

      // Handle pointer events for drag and drop
      g.addEventListener('pointerdown', (e) => {
        if (editSubMode !== 'drag') return;
        e.preventDefault();
        e.stopPropagation();

        dragPointIndex = idx;
        g.classList.add('is-dragging');
        g.setPointerCapture(e.pointerId);

        editStatusReadout.textContent = `Dragging Point ${idx}...`;

        function onPointerMove(moveEvent) {
          if (dragPointIndex === null) return;
          const [newX, newY] = getMouseImageCoords(moveEvent);

          // Update building vertex live
          bldg.polygon[dragPointIndex] = [newX, newY];

          // Synchronize 3D lines, roof, and spotlight cutout live
          syncBuildingGeometry(bldg);
          applySpotlightCutout(bldg);

          // Move the handle
          g.setAttribute('transform', `translate(${newX}, ${newY})`);
          editStatusReadout.textContent = `Point ${dragPointIndex}: [${newX}, ${newY}]`;
        }

        function onPointerUp(upEvent) {
          g.removeEventListener('pointermove', onPointerMove);
          g.removeEventListener('pointerup', onPointerUp);
          g.removeEventListener('pointercancel', onPointerUp);
          g.classList.remove('is-dragging');

          try {
            g.releasePointerCapture(upEvent.pointerId);
          } catch (err) {}

          const [finalX, finalY] = bldg.polygon[dragPointIndex];
          dragPointIndex = null;

          // Auto-save to localStorage
          saveCustomCoordinates();
          showToast(`Point ${idx} updated to [${finalX}, ${finalY}] (Saved)`);
          editStatusReadout.textContent = `Point ${idx} saved at [${finalX}, ${finalY}]`;
        }

        g.addEventListener('pointermove', onPointerMove);
        g.addEventListener('pointerup', onPointerUp);
        g.addEventListener('pointercancel', onPointerUp);
      });

      handlesLayer.appendChild(g);
    });
  }

  function clearEditorHandles() {
    const handlesLayer = document.getElementById('handlesLayer');
    if (handlesLayer) handlesLayer.innerHTML = '';
  }

  function clearReplotLayer() {
    const replotLayer = document.getElementById('replotLayer');
    if (replotLayer) replotLayer.innerHTML = '';
  }

  /**
   * Handles click events when in Re-plot Points Mode
   */
  function handleViewportClick(e) {
    if (!isEditing || editSubMode !== 'replot') return;

    const bldg = getEditBuilding();
    const requiredCount = bldg.polygon.length;
    const [x, y] = getMouseImageCoords(e);

    replotPoints.push([x, y]);

    // Update replot preview graphics
    renderReplotPreview(bldg, requiredCount);

    if (replotPoints.length < requiredCount) {
      editStatusReadout.textContent = `Plotted Point ${replotPoints.length} of ${requiredCount}... Next point:`;
      showToast(`Marked Point ${replotPoints.length - 1}: [${x}, ${y}]`);
    } else {
      // Completed plotting all points!
      bldg.polygon = JSON.parse(JSON.stringify(replotPoints));
      replotPoints = [];

      syncBuildingGeometry(bldg);
      applySpotlightCutout(bldg);
      saveCustomCoordinates();

      showToast(`All ${requiredCount} points plotted & saved!`);
      setEditSubMode('drag'); // Switch to drag mode for fine-tuning
    }
  }

  /**
   * Renders preview dots and polygon lines during Re-plot Mode
   */
  function renderReplotPreview(bldg, requiredCount) {
    const replotLayer = document.getElementById('replotLayer');
    if (!replotLayer) return;
    replotLayer.innerHTML = '';

    // Draw connecting preview path
    if (replotPoints.length > 1) {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('class', 'replot-preview-poly');
      poly.setAttribute('points', pointsToString(replotPoints));
      replotLayer.appendChild(poly);
    }

    // Draw vertex dots for each clicked point
    replotPoints.forEach(([x, y], idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x}, ${y})`);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'replot-click-dot');
      circle.setAttribute('r', '11');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'drag-handle-text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '4');
      text.textContent = idx;

      g.appendChild(circle);
      g.appendChild(text);
      replotLayer.appendChild(g);
    });
  }

  /**
   * Exports updated coordinates formatted for data.js
   */
  function exportCoordinatesCode() {
    const bldg = getEditBuilding();
    const ptsCode = bldg.polygon
      .map(([x, y], idx) => `      [${x}, ${y}], // [${idx}]`)
      .join('\n');

    const snippet = `    // Updated coordinates for ${bldg.name}\n    polygon: [\n${ptsCode}\n    ],`;

    navigator.clipboard.writeText(snippet);
    showToast(`Code copied to clipboard! (Ready to paste in data.js)`);
    console.log(`\n/* ========== EXPORTED COORDINATES FOR ${bldg.name.toUpperCase()} ========== */\n` + snippet);
  }

  /**
   * Saves coordinates to localStorage
   */
  function saveCustomCoordinates() {
    const customData = {};
    BUILDINGS.forEach((b) => {
      customData[b.id] = b.polygon;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));
  }

  /**
   * Loads custom coordinates from localStorage on startup
   */
  function loadSavedCoordinates() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        BUILDINGS.forEach((b) => {
          if (parsed[b.id] && Array.isArray(parsed[b.id])) {
            b.polygon = parsed[b.id];
          }
        });
      }
    } catch (e) {
      console.warn('Could not load custom coordinates', e);
    }
  }

  /**
   * Resets all coordinates back to hardcoded defaults
   */
  function resetToDefaults() {
    if (!confirm('Revert all building coordinates back to original defaults?')) return;

    localStorage.removeItem(STORAGE_KEY);

    // Restore deep clone
    DEFAULT_BUILDINGS.forEach((def) => {
      const bldg = BUILDINGS.find((b) => b.id === def.id);
      if (bldg) {
        bldg.polygon = JSON.parse(JSON.stringify(def.polygon));
        syncBuildingGeometry(bldg);
      }
    });

    if (isEditing) {
      renderEditorHandles();
    } else {
      deactivateBuildingHover();
    }

    showToast('Reset coordinates to original defaults');
  }
});
