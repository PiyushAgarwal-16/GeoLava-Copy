/**
 * Urban Intelligence & Building Telemetry Controller
 * Interactive Drag-and-Drop & Arbitrary N-Point Creation / Re-Plotting Engine
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
  const newBuildingBtn = document.getElementById('newBuildingBtn');
  const modeDragBtn = document.getElementById('modeDragBtn');
  const modeReplotBtn = document.getElementById('modeReplotBtn');
  const editStatusReadout = document.getElementById('editStatusReadout');
  const plotActionCluster = document.getElementById('plotActionCluster');
  const finishPlotBtn = document.getElementById('finishPlotBtn');
  const undoPlotBtn = document.getElementById('undoPlotBtn');
  const cancelPlotBtn = document.getElementById('cancelPlotBtn');
  const deleteBuildingBtn = document.getElementById('deleteBuildingBtn');
  const exportCodeBtn = document.getElementById('exportCodeBtn');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const footerModeInfo = document.getElementById('footerModeInfo');
  const indexedCountText = document.getElementById('indexedCountText');

  const STORAGE_KEY = 'building_telemetry_custom_coords_v4';

  // Deep clone initial defaults for reset support
  const DEFAULT_BUILDINGS = JSON.parse(JSON.stringify(BUILDINGS));

  // Load any saved custom coordinates & custom buildings from localStorage
  loadSavedCoordinates();

  // Application State
  let activeHoverBuildingId = null;
  let isEditing = false;
  let editBuildingId = BUILDINGS[0] ? BUILDINGS[0].id : 'bldg-terrace';
  let editSubMode = 'drag'; // 'drag' or 'replot'
  let replotPoints = [];
  let dragPointIndex = null;

  // Initialize SVG vector overlay
  initSvgLayers();

  // Populate building select options
  populateBuildingSelect();

  // Initialize HUD in standby state
  setHudStandby();

  // Setup Visual Editor Controller
  setupEditorController();

  // Synchronize building geometry (wireframes and roof)
  BUILDINGS.forEach(syncBuildingGeometry);

  // Check URL parameters for direct edit mode activation
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('edit') === '1' || urlParams.get('edit') === 'true') {
    toggleEditMode();
    if (urlParams.get('submode') === 'replot') {
      setEditSubMode('replot');
    }
  } else if (urlParams.get('hover')) {
    const targetBldg = BUILDINGS.find((b) => b.id === urlParams.get('hover'));
    if (targetBldg) {
      setTimeout(() => activateBuildingHover(targetBldg), 60);
    }
  }

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

    // Render SVG group for each building
    BUILDINGS.forEach(renderBuildingSvgGroup);

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
   * Renders or re-renders an individual building's SVG vector group and hit zone
   */
  function renderBuildingSvgGroup(bldg) {
    const existing = document.getElementById(`group-${bldg.id}`);
    if (existing) existing.remove();

    const replotLayer = document.getElementById('replotLayer');

    const bldgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bldgGroup.setAttribute('class', 'building-vector-group');
    bldgGroup.setAttribute('id', `group-${bldg.id}`);
    bldgGroup.setAttribute('data-id', bldg.id);

    // 1. Roof Wireframe Polygon
    const roofPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    roofPoly.setAttribute('class', 'wireframe-roof');
    roofPoly.setAttribute('id', `roof-${bldg.id}`);
    roofPoly.setAttribute('points', pointsToString(bldg.roofPolygon || bldg.polygon || []));
    bldgGroup.appendChild(roofPoly);

    // 2. Wireframe Edges Group
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.setAttribute('id', `edges-${bldg.id}`);
    bldgGroup.appendChild(edgesGroup);
    renderWireframeEdges(bldg, edgesGroup);

    // 3. Sub-Features (e.g. circular terrace garden)
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

    // 4. Hit Zone Polygon
    const hitZone = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    hitZone.setAttribute('class', 'building-hit-zone');
    hitZone.setAttribute('id', `hitzone-${bldg.id}`);
    hitZone.setAttribute('points', pointsToString(bldg.polygon || []));
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

    if (replotLayer) {
      svgOverlay.insertBefore(bldgGroup, replotLayer);
    } else {
      svgOverlay.appendChild(bldgGroup);
    }
  }

  /**
   * Populates the building select dropdown and updates stats
   */
  function populateBuildingSelect() {
    if (!editBuildingSelect) return;
    editBuildingSelect.innerHTML = '';

    BUILDINGS.forEach((bldg, idx) => {
      const opt = document.createElement('option');
      opt.value = bldg.id;
      const ptCount = bldg.polygon ? bldg.polygon.length : 0;
      opt.textContent = `${idx + 1}. ${bldg.name} (${ptCount} pts)${bldg.isCustom ? ' ★' : ''}`;
      editBuildingSelect.appendChild(opt);
    });

    if (BUILDINGS.some((b) => b.id === editBuildingId)) {
      editBuildingSelect.value = editBuildingId;
    } else if (BUILDINGS.length > 0) {
      editBuildingId = BUILDINGS[0].id;
      editBuildingSelect.value = editBuildingId;
    }

    // Update delete button visibility (only custom buildings can be deleted)
    const currentBldg = getEditBuilding();
    if (deleteBuildingBtn) {
      deleteBuildingBtn.style.display = currentBldg && currentBldg.isCustom ? 'inline-block' : 'none';
    }

    // Update footer indexed count
    if (indexedCountText) {
      indexedCountText.textContent = `INDEXED: ${BUILDINGS.length} STRUCTURES`;
    }
  }

  /**
   * Renders wireframe edge line elements for a building
   */
  function renderWireframeEdges(bldg, container) {
    if (!container) return;
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
    if (!pts || pts.length < 3) {
      bldg.roofPolygon = [];
      bldg.wireframeEdges = [];
      return;
    }

    // Known default geometry mapping
    if (bldg.id === 'bldg-terrace' && pts.length === 6) {
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
      const rightX = pts[1][0];
      bldg.wireframeEdges = [
        [pts[1], pts[2]],
        [pts[0], pts[1]],
        [[0, 240], [rightX + (pts[2][0] - rightX) * 0.16, 240]],
        [[0, 480], [rightX + (pts[2][0] - rightX) * 0.32, 480]],
        [[0, 720], [rightX + (pts[2][0] - rightX) * 0.48, 720]],
        [[0, 960], [rightX + (pts[2][0] - rightX) * 0.65, 960]],
        [[0, 1200], [rightX + (pts[2][0] - rightX) * 0.81, 1200]],
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
    } else {
      // General arbitrary N-point polygon wireframe:
      // Continuous closed perimeter loop with glowing vector strokes
      bldg.roofPolygon = pts;
      bldg.wireframeEdges = pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
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
    if (!bldg || !bldg.polygon || bldg.polygon.length < 3) {
      spotlightImage.style.clipPath = 'none';
      spotlightImage.style.webkitClipPath = 'none';
      return;
    }
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

    // Dynamic transform-origin based on building centroid for realistic perspective lift
    if (bldg.polygon && bldg.polygon.length > 0) {
      let sumX = 0;
      let sumY = 0;
      bldg.polygon.forEach(([x, y]) => {
        sumX += x;
        sumY += y;
      });
      const avgX = sumX / bldg.polygon.length;
      const avgY = sumY / bldg.polygon.length;
      const cxPct = ((avgX / IMAGE_CONFIG.width) * 100).toFixed(2);
      const cyPct = ((avgY / IMAGE_CONFIG.height) * 100).toFixed(2);
      spotlightImage.style.transformOrigin = `${cxPct}% ${cyPct}%`;
    } else {
      spotlightImage.style.transformOrigin = 'center center';
    }

    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.remove('active-building');
    });

    const activeGroup = document.getElementById(`group-${bldg.id}`);
    if (activeGroup) activeGroup.classList.add('active-building');

    // Smart HUD Docking
    const isLeftBuilding = bldg.polygon && bldg.polygon.some(([x]) => x < 500);
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
    spotlightImage.style.transformOrigin = 'center center';

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
    document.getElementById('hudBldgMeta').textContent = `${bldg.address || 'San Francisco SOMA'} • ${bldg.category || 'Architectural Asset'}`;

    renderPillMeter('meterCondition', (bldg.sensitivity && bldg.sensitivity.physicalCondition) || 4);
    renderPillMeter('meterMomentum', (bldg.sensitivity && bldg.sensitivity.developmentMomentum) || 4);
    renderPillMeter('meterTrajectory', (bldg.sensitivity && bldg.sensitivity.neighborhoodTrajectory) || 4);

    document.getElementById('metricValuation').textContent = (bldg.metrics && bldg.metrics.valuation) || '$45.0 M';
    document.getElementById('metricEfficiency').textContent = (bldg.metrics && bldg.metrics.efficiency) || '92%';

    const facts = bldg.facts && bldg.facts.length > 0 ? bldg.facts : ['Asset telemetry active in SOMA district monitoring model.'];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
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
    return (points || []).map(([x, y]) => `${x},${y}`).join(' ');
  }

  function showToast(msg) {
    copyToast.textContent = msg;
    copyToast.classList.add('show');
    setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2400);
  }

  // ==========================================================================
  // INTERACTIVE VISUAL EDITOR LOGIC (WITH ARBITRARY POINT CREATION)
  // ==========================================================================

  function setupEditorController() {
    // 1. Toggle Button & Shortcut 'E'
    editToggleBtn.addEventListener('click', toggleEditMode);
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;

      if (e.key === 'e' || e.key === 'E') {
        toggleEditMode();
        return;
      }

      // Hotkeys while in replot / create mode
      if (isEditing && editSubMode === 'replot') {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishCurrentPlot();
        } else if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          undoLastPlotPoint();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelPlotting();
        }
      }
    });

    // 2. Building Select Change
    editBuildingSelect.addEventListener('change', () => {
      editBuildingId = editBuildingSelect.value;
      const currentBldg = getEditBuilding();
      if (deleteBuildingBtn) {
        deleteBuildingBtn.style.display = currentBldg && currentBldg.isCustom ? 'inline-block' : 'none';
      }
      if (isEditing) {
        replotPoints = [];
        clearReplotLayer();
        renderEditorHandles();
      }
    });

    // 3. New Building Button (+ New Building)
    if (newBuildingBtn) {
      newBuildingBtn.addEventListener('click', handleNewBuildingClick);
    }

    // 4. Sub-Mode Toggle Buttons ('drag' vs 'replot')
    modeDragBtn.addEventListener('click', () => {
      setEditSubMode('drag');
    });

    modeReplotBtn.addEventListener('click', () => {
      setEditSubMode('replot');
    });

    // 5. Plot Action Buttons (Finish, Undo, Cancel)
    if (finishPlotBtn) finishPlotBtn.addEventListener('click', finishCurrentPlot);
    if (undoPlotBtn) undoPlotBtn.addEventListener('click', undoLastPlotPoint);
    if (cancelPlotBtn) cancelPlotBtn.addEventListener('click', cancelPlotting);

    // 6. Delete Building Button
    if (deleteBuildingBtn) {
      deleteBuildingBtn.addEventListener('click', handleDeleteBuildingClick);
    }

    // 7. Copy Code Button
    exportCodeBtn.addEventListener('click', exportCoordinatesCode);

    // 8. Reset to Defaults Button
    resetDefaultsBtn.addEventListener('click', resetToDefaults);

    // 9. Viewport click handling for Re-plot / Create Mode
    viewportCard.addEventListener('click', handleViewportClick);
    viewportCard.addEventListener('dblclick', handleViewportDblClick);

    // 10. Track mouse over viewport for live readout & dynamic pen line
    viewportCard.addEventListener('mousemove', (e) => {
      if (!isEditing || dragPointIndex !== null) return;
      const [x, y] = getMouseImageCoords(e);

      if (editSubMode === 'replot') {
        const bldg = getEditBuilding();
        const ptCount = replotPoints.length;

        // Dynamic guide line to cursor
        const guideLine = document.getElementById('replotCursorGuide');
        if (guideLine && ptCount > 0) {
          const lastPt = replotPoints[ptCount - 1];
          guideLine.setAttribute('x1', lastPt[0]);
          guideLine.setAttribute('y1', lastPt[1]);
          guideLine.setAttribute('x2', x);
          guideLine.setAttribute('y2', y);
          guideLine.style.display = 'block';
        }

        // Snap indicator on first dot if near
        if (ptCount >= 3) {
          const [x0, y0] = replotPoints[0];
          const dist = Math.hypot(x - x0, y - y0);
          const firstDot = svgOverlay.querySelector('.replot-first-dot');
          if (firstDot) {
            firstDot.classList.toggle('is-snappable', dist < 32);
          }
        }

        if (ptCount === 0) {
          editStatusReadout.textContent = `🎯 Click to place vertex 1 for ${bldg.name} [Cursor: X: ${x}, Y: ${y}]`;
        } else if (ptCount < 3) {
          editStatusReadout.textContent = `Plotted ${ptCount} pts • Click to place point ${ptCount + 1} (min 3 pts needed)`;
        } else {
          editStatusReadout.textContent = `Plotted ${ptCount} pts • Click next pt, click green pt [0] to close, or click '✓ Complete'`;
        }
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
      setEditSubMode('drag');
    }
  }

  function setEditSubMode(mode) {
    editSubMode = mode;
    modeDragBtn.classList.toggle('active', mode === 'drag');
    modeReplotBtn.classList.toggle('active', mode === 'replot');

    if (plotActionCluster) {
      plotActionCluster.style.display = mode === 'replot' ? 'inline-flex' : 'none';
    }

    if (mode === 'replot') {
      replotPoints = [];
      clearEditorHandles();
      clearReplotLayer();
      updatePlotActionButtons();
      const bldg = getEditBuilding();
      editStatusReadout.textContent = `🎯 Click anywhere on the building to plot points (any number of points). Click 1st point or '✓ Complete' when done.`;
      showToast(`Plot Mode: Click points for ${bldg.name}`);
    } else {
      replotPoints = [];
      clearReplotLayer();
      renderEditorHandles();
      editStatusReadout.textContent = `✋ Drag vertex handles to calibrate alignment live`;
    }
  }

  function updatePlotActionButtons() {
    if (!finishPlotBtn || !undoPlotBtn) return;
    const count = replotPoints.length;
    finishPlotBtn.disabled = count < 3;
    finishPlotBtn.textContent = count >= 3 ? `✓ Complete Polygon (${count} pts)` : '✓ Complete Polygon';
    undoPlotBtn.disabled = count === 0;
  }

  /**
   * Creates a brand-new building on the scene
   */
  function handleNewBuildingClick() {
    const defaultName = `Custom Structure ${BUILDINGS.length + 1}`;
    const name = prompt('Enter a name for the new building:', defaultName);
    if (!name || !name.trim()) return;

    const newBldg = {
      id: `bldg-custom-${Date.now()}`,
      name: name.trim(),
      code: `BLDG-${String(BUILDINGS.length + 1).padStart(2, '0')} // CUST`,
      category: 'Custom Architectural Structure',
      address: 'Folsom Corridor, San Francisco',
      stories: Math.floor(Math.random() * 12 + 5),
      yearBuilt: '2024',
      occupancy: '94%',
      sensitivity: {
        physicalCondition: 4,
        developmentMomentum: 4,
        neighborhoodTrajectory: 4,
      },
      metrics: {
        valuation: `$${(Math.random() * 50 + 25).toFixed(1)} M`,
        efficiency: `${Math.floor(Math.random() * 8 + 91)}%`,
      },
      facts: [
        `${name.trim()} mapped via interactive precision building calibration.`,
        'Energy and structural telemetry active under district sensor grid.',
      ],
      polygon: [],
      roofPolygon: [],
      wireframeEdges: [],
      subFeatures: [],
      isCustom: true,
    };

    BUILDINGS.push(newBldg);
    renderBuildingSvgGroup(newBldg);

    editBuildingId = newBldg.id;
    populateBuildingSelect();

    // Ensure edit mode is on and switch to plot mode
    if (!isEditing) {
      toggleEditMode();
    }
    setEditSubMode('replot');
    showToast(`Created "${newBldg.name}"! Click on image to plot vertices.`);
  }

  /**
   * Deletes a custom created building
   */
  function handleDeleteBuildingClick() {
    const bldg = getEditBuilding();
    if (!bldg || !bldg.isCustom) return;

    if (!confirm(`Delete custom building "${bldg.name}"?`)) return;

    const idx = BUILDINGS.findIndex((b) => b.id === bldg.id);
    if (idx !== -1) {
      BUILDINGS.splice(idx, 1);
    }

    const svgGrp = document.getElementById(`group-${bldg.id}`);
    if (svgGrp) svgGrp.remove();

    editBuildingId = BUILDINGS[0] ? BUILDINGS[0].id : '';
    saveCustomCoordinates();
    populateBuildingSelect();
    renderEditorHandles();
    showToast(`Deleted "${bldg.name}"`);
  }

  function getEditBuilding() {
    return BUILDINGS.find((b) => b.id === editBuildingId) || BUILDINGS[0];
  }

  /**
   * Renders circular draggable handles for all vertices of the currently calibrated building
   */
  function renderEditorHandles() {
    clearEditorHandles();
    clearReplotLayer();

    const handlesLayer = document.getElementById('handlesLayer');
    if (!handlesLayer) return;

    const bldg = getEditBuilding();
    if (!bldg || !bldg.polygon || bldg.polygon.length === 0) return;

    // Apply spotlight cutout & wireframe highlight to this building
    applySpotlightCutout(bldg);
    viewportCard.classList.add('has-focus');

    document.querySelectorAll('.building-vector-group').forEach((grp) => {
      grp.classList.toggle('is-editing', grp.getAttribute('data-id') === bldg.id);
      grp.classList.toggle('active-building', grp.getAttribute('data-id') === bldg.id);
    });

    // Render handle group for each vertex
    bldg.polygon.forEach(([x, y], idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'drag-handle-group');
      g.setAttribute('data-index', idx);
      g.setAttribute('transform', `translate(${x}, ${y})`);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'drag-handle-circle');
      circle.setAttribute('r', '10');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'drag-handle-text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '4');
      text.textContent = idx;

      g.appendChild(circle);
      g.appendChild(text);

      // Drag listeners
      g.addEventListener('mousedown', (e) => startDragHandle(e, idx));

      handlesLayer.appendChild(g);
    });
  }

  function startDragHandle(e, idx) {
    if (editSubMode !== 'drag') return;
    e.stopPropagation();
    e.preventDefault();
    dragPointIndex = idx;

    const handleEl = e.currentTarget;
    handleEl.classList.add('is-dragging');

    function onMouseMove(moveEvt) {
      if (dragPointIndex === null) return;
      const [imgX, imgY] = getMouseImageCoords(moveEvt);
      const bldg = getEditBuilding();

      bldg.polygon[dragPointIndex] = [imgX, imgY];
      syncBuildingGeometry(bldg);
      applySpotlightCutout(bldg);

      // Update handle position
      handleEl.setAttribute('transform', `translate(${imgX}, ${imgY})`);

      editStatusReadout.textContent = `Point [${dragPointIndex}] moved to: [${imgX}, ${imgY}]`;
    }

    function onMouseUp() {
      if (dragPointIndex !== null) {
        handleEl.classList.remove('is-dragging');
        dragPointIndex = null;
        saveCustomCoordinates();
        renderEditorHandles(); // Refresh handles and lines
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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
   * Handles click events when in Re-plot / Plot Points Mode
   */
  function handleViewportClick(e) {
    if (!isEditing || editSubMode !== 'replot') return;
    if (e.target.closest('#editorBar')) return;

    const [x, y] = getMouseImageCoords(e);

    // If we have at least 3 points, check if clicked on or near the first point to close!
    if (replotPoints.length >= 3) {
      const [x0, y0] = replotPoints[0];
      const dist = Math.hypot(x - x0, y - y0);
      if (dist < 32 || (e.target && e.target.classList && e.target.classList.contains('replot-first-dot'))) {
        finishCurrentPlot();
        return;
      }
    }

    replotPoints.push([x, y]);
    const bldg = getEditBuilding();
    renderReplotPreview(bldg);
    updatePlotActionButtons();

    showToast(`Marked Point [${replotPoints.length - 1}]: [${x}, ${y}]`);
  }

  /**
   * Handles double click on viewport to complete polygon
   */
  function handleViewportDblClick(e) {
    if (isEditing && editSubMode === 'replot' && replotPoints.length >= 3) {
      e.preventDefault();
      e.stopPropagation();
      finishCurrentPlot();
    }
  }

  /**
   * Completes and saves the current plotted polygon
   */
  function finishCurrentPlot() {
    if (replotPoints.length < 3) {
      showToast('Need at least 3 points to form a polygon');
      return;
    }

    const bldg = getEditBuilding();
    bldg.polygon = JSON.parse(JSON.stringify(replotPoints));
    const count = bldg.polygon.length;
    replotPoints = [];
    clearReplotLayer();

    syncBuildingGeometry(bldg);
    applySpotlightCutout(bldg);
    saveCustomCoordinates();
    populateBuildingSelect();

    showToast(`✓ Completed polygon with ${count} points!`);
    setEditSubMode('drag');
  }

  /**
   * Undoes the last placed point in plot mode
   */
  function undoLastPlotPoint() {
    if (replotPoints.length > 0) {
      const removed = replotPoints.pop();
      const bldg = getEditBuilding();
      renderReplotPreview(bldg);
      updatePlotActionButtons();
      showToast(`Removed point: [${removed[0]}, ${removed[1]}]`);
    }
  }

  /**
   * Cancels the plotting operation
   */
  function cancelPlotting() {
    replotPoints = [];
    clearReplotLayer();
    showToast('Cancelled point plotting');
    setEditSubMode('drag');
  }

  /**
   * Renders preview dots, lines, and guide line during Plot Mode
   */
  function renderReplotPreview(bldg) {
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

    // Dynamic guide line to cursor
    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('id', 'replotCursorGuide');
    guideLine.setAttribute('class', 'replot-cursor-guide');
    guideLine.style.display = 'none';
    replotLayer.appendChild(guideLine);

    // Draw vertex dots for each clicked point
    replotPoints.forEach(([x, y], idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x}, ${y})`);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const isFirst = idx === 0 && replotPoints.length >= 3;
      circle.setAttribute('class', isFirst ? 'replot-click-dot replot-first-dot' : 'replot-click-dot');
      circle.setAttribute('r', isFirst ? '13' : '11');

      if (isFirst) {
        circle.setAttribute('title', 'Click here to close & complete polygon');
      }

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
    const ptsCode = (bldg.polygon || [])
      .map(([x, y], idx) => `      [${x}, ${y}], // [${idx}]`)
      .join('\n');

    let snippet = '';
    if (bldg.isCustom) {
      snippet = `  // Custom building: ${bldg.name}\n` + JSON.stringify(bldg, null, 2);
    } else {
      snippet = `    // Updated coordinates for ${bldg.name} (${bldg.polygon.length} points)\n    polygon: [\n${ptsCode}\n    ],`;
    }

    navigator.clipboard.writeText(snippet);
    showToast(`Code copied to clipboard! (Ready to paste in data.js)`);
    console.log(`\n/* ========== EXPORTED COORDINATES FOR ${bldg.name.toUpperCase()} ========== */\n` + snippet);
  }

  /**
   * Saves coordinates and custom buildings to localStorage
   */
  function saveCustomCoordinates() {
    try {
      const customData = {
        polygons: {},
        customBuildings: BUILDINGS.filter((b) => b.isCustom),
      };
      BUILDINGS.forEach((b) => {
        customData.polygons[b.id] = b.polygon;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));
    } catch (e) {
      console.warn('Could not save custom coordinates to localStorage', e);
    }
  }

  /**
   * Loads custom coordinates and custom buildings from localStorage on startup
   */
  function loadSavedCoordinates() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // 1. Restore any custom buildings
        if (parsed.customBuildings && Array.isArray(parsed.customBuildings)) {
          parsed.customBuildings.forEach((custBldg) => {
            if (!BUILDINGS.some((b) => b.id === custBldg.id)) {
              BUILDINGS.push(custBldg);
            }
          });
        }

        // 2. Restore polygons
        const polyMap = parsed.polygons || parsed;
        BUILDINGS.forEach((b) => {
          if (polyMap[b.id] && Array.isArray(polyMap[b.id])) {
            b.polygon = polyMap[b.id];
          }
        });
      }
    } catch (e) {
      console.warn('Could not load custom coordinates', e);
    }
  }

  /**
   * Resets all coordinates and removes custom buildings back to hardcoded defaults
   */
  function resetToDefaults() {
    if (!confirm('Revert all building coordinates and remove custom buildings back to original defaults?')) return;

    localStorage.removeItem(STORAGE_KEY);

    // Remove custom buildings from BUILDINGS array
    for (let i = BUILDINGS.length - 1; i >= 0; i--) {
      if (BUILDINGS[i].isCustom) {
        const svgGrp = document.getElementById(`group-${BUILDINGS[i].id}`);
        if (svgGrp) svgGrp.remove();
        BUILDINGS.splice(i, 1);
      }
    }

    // Restore deep clone
    DEFAULT_BUILDINGS.forEach((def) => {
      const bldg = BUILDINGS.find((b) => b.id === def.id);
      if (bldg) {
        bldg.polygon = JSON.parse(JSON.stringify(def.polygon));
        syncBuildingGeometry(bldg);
      }
    });

    editBuildingId = BUILDINGS[0] ? BUILDINGS[0].id : '';
    populateBuildingSelect();

    if (isEditing) {
      renderEditorHandles();
    } else {
      deactivateBuildingHover();
    }

    showToast('Reset coordinates to original defaults');
  }

  /**
   * Helper: converts client mouse event into 2210 x 1473 coordinate space
   */
  function getMouseImageCoords(e) {
    const rect = viewportCard.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = IMAGE_CONFIG.width / rect.width;
    const scaleY = IMAGE_CONFIG.height / rect.height;

    const imgX = Math.round(Math.max(0, Math.min(IMAGE_CONFIG.width, clientX * scaleX)));
    const imgY = Math.round(Math.max(0, Math.min(IMAGE_CONFIG.height, clientY * scaleY)));

    return [imgX, imgY];
  }
});
