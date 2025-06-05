document.addEventListener('DOMContentLoaded', () => {
    // ... (keep existing variable declarations and initial setup) ...
    const classroom = document.getElementById('classroom');
    const classroomWrapper = document.getElementById('classroom-wrapper'); // Get the wrapper
    const sidePanel = document.getElementById('side-panel');
    const nothing = document.getElementById('nothing');
    const roomLibrary = document.getElementById('room-library');
    const itemLibrary = document.getElementById('item-library');
    const editPanel = document.getElementById('edit-panel');
    const editItemIdInput = document.getElementById('edit-item-id');
    const editNameInput = document.getElementById('edit-name');
    const editRotationInput = document.getElementById('edit-rotation');
    const editWidthInput = document.getElementById('edit-width');
    const editHeightInput = document.getElementById('edit-height');
    const deleteItemBtn = document.getElementById('deleteItemBtn');
    const deselectBtn = document.getElementById('deselectBtn');
    const makeRoomBtn = document.getElementById('makeRoomBtn');
    const desksAndSeatsBtn = document.getElementById('Desks&SeatsBtn');
    const optimizationSection = document.getElementById('optimization-section');
    const optimizeBtn = document.getElementById('optimizeBtn'); // Header button
    let deskCounter = 0;
    let highestZindex = 1000;
    let currentTab = null; // Default tab
    let gridSnapping = true;
    const gridSize = 10; // size of each grid cell in pixels

    let isGroupDragging = false;
    let groupDragStartMouse = null;
    let groupInitialPositions = [];
    let lastMousePos = { x: 0, y: 0 };
    let didDrag = false; // Used to distinguish click from drag

    // Define a global storage for multi-selection
    let selectedDeskElements = [];

    classroomWrapper.addEventListener('mousemove', (e) => {
        const classroomRect = classroom.getBoundingClientRect();
        lastMousePos = {
            x: e.clientX - classroomRect.left + classroomWrapper.scrollLeft,
            y: e.clientY - classroomRect.top + classroomWrapper.scrollTop,
        };
    });

    const snapToggleCheckbox = document.querySelector('#switch-container input[type="checkbox"]');
    if(snapToggleCheckbox){
        snapToggleCheckbox.addEventListener('change', (e) => {
            gridSnapping = e.target.checked;
        });
    }

    const headerButtons = {
        file: document.getElementById('file'),
        build: document.getElementById('build'),
        assign: document.getElementById('assign'),
        view: document.getElementById('view'),
    };
    const controlDivs = {
        file: document.querySelector('.file'),
        build: document.querySelector('.build'),
        assign: document.querySelector('.assign'),
        view: document.querySelector('.view'),
    };


    const plannyEyes = document.querySelectorAll('.planny-eye');
    const plannyArmRight = document.getElementById('planny-arm-right'); // Get the right arm
    const plannyPencil = document.getElementById('planny-pencil'); // Get the pencil

    function blink() {
        if (plannyEyes.length === 0) return;

        plannyEyes.forEach(eye => eye.classList.add('blinking'));
        setTimeout(() => {
            plannyEyes.forEach(eye => eye.classList.remove('blinking'));
        }, 150);
    }

    function spinPencil() {
        if (!plannyPencil || plannyPencil.classList.contains('spinning')) return; // Don't spin if already spinning

        plannyPencil.classList.add('spinning');
        plannyArmRight.classList.add('spinning'); // Add spinning class to the arm

        // Remove class after animation finishes to allow re-triggering
        plannyPencil.addEventListener('animationend', () => {
            plannyPencil.classList.remove('spinning');
            plannyArmRight.classList.remove('spinning'); // Remove spinning class from the arm
        }, { once: true }); // Important: use { once: true }
    }

    function scheduleNextIdleAction() {
        // Schedule next blink
        const nextBlinkTime = Math.random() * 4000 + 2000; // Blink every 2-6 seconds
        setTimeout(blink, nextBlinkTime);

        // Try to schedule a pencil spin
        // e.g., 30% chance to spin in the next 3-8 seconds
        if (Math.random() < 0.25) {
            const nextSpinDelay = Math.random() * 25000 + 15000;
            setTimeout(spinPencil, nextSpinDelay);
        }

        // Call this function again to loop idle actions
        const nextIdleCheck = Math.random() * 2000 + 1000; // Check for actions every 1-3 seconds
        setTimeout(scheduleNextIdleAction, nextIdleCheck);
    }

    const nothingPanel = document.getElementById('nothing');
    if (nothingPanel && !nothingPanel.classList.contains('hidden')) {
       // Initial actions
       blink(); // Start with a blink
       scheduleNextIdleAction(); // Start the idle action loop
    }

    // Optional: If #nothing panel can be shown/hidden dynamically,
    // you might want to restart blinking and idle actions when it becomes visible.


    // Optional: If #nothing panel can be shown/hidden dynamically,
    // you might want to restart blinking when it becomes visible.
    // For example, if you use a MutationObserver or have a function
    // that shows #nothing, call scheduleNextBlink() from there.
    

    function showControls(tabName) {
        showPanel('nothing') // Default to showing 'nothing' panel when changing tabs
        Object.values(controlDivs).forEach(div => div.classList.add('hidden'));
        Object.values(headerButtons).forEach(div => div.classList.remove('clicked'));

        if (tabName && (currentTab !== tabName)) {
            if (controlDivs[tabName]) {
                controlDivs[tabName].classList.remove('hidden');
            }
            if (headerButtons[tabName]) { // Check headerButtons, not controlDivs for clicked class
                headerButtons[tabName].classList.add('clicked');
            }
            currentTab = tabName;
            // When switching to build, ensure a library is shown if nothing is selected
            if (tabName === 'build' && selectedDeskElements.length === 0) {
                showPanel('itemLibrary'); // Or your preferred default library
            }
        } else {
            currentTab = null; // Deselect tab
        }
    }

    desksAndSeatsBtn.addEventListener('click', () => {
        showPanel('itemLibrary');
    });
    makeRoomBtn.addEventListener('click', () => {
        showPanel('roomLibrary');
    });
    optimizeBtn.addEventListener('click', () => {
        showControls('assign'); // Switch to assign tab
        showPanel('optimization-section'); // Then show optimization panel
    });

    Object.entries(headerButtons).forEach(([name, button]) => {
        button.addEventListener('click', () => showControls(name));
    });
    showControls(null);


    function showPanel(panelId, deskElement = null) {
        nothing.classList.add('hidden');
        roomLibrary.classList.add('hidden');
        itemLibrary.classList.add('hidden');
        editPanel.classList.add('hidden');
        optimizationSection.classList.add('hidden');
        // If you have a "multiSelectPanel", hide it here too:
        // if (document.getElementById('multiSelectPanel')) document.getElementById('multiSelectPanel').classList.add('hidden');

        if (panelId === 'itemLibrary') {
            itemLibrary.classList.remove('hidden');
        } else if (panelId === 'roomLibrary') {
            roomLibrary.classList.remove('hidden');
        } else if (panelId === 'editPanel' && deskElement) {
            editPanel.classList.remove('hidden');
            editItemIdInput.value = deskElement.id;
            editNameInput.value = deskElement.dataset.name || '';
            const transform = deskElement.style.transform;
            const rotateMatch = transform.match(/rotate\(([-+]?\d*\.?\d+)deg\)/);
            editRotationInput.value = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
            editWidthInput.value = parseInt(deskElement.style.width, 10);
            editHeightInput.value = parseInt(deskElement.style.height, 10);
        } else if (panelId === 'nothing') {
            nothing.classList.remove('hidden');
        } else if (panelId === 'optimization-section') {
            optimizationSection.classList.remove('hidden');
            // ... (optimization panel setup)
        } else if (panelId === 'multiSelectPanel') {
            // Logic for showing a multi-select panel (if you implement one)
            // For now, this might mean just ensuring editPanel is hidden (which showPanel already does)
            // and itemLibrary/roomLibrary are visible if on build tab.
            // If no specific multiSelectPanel, effectively shows 'nothing' or a default library.
            // console.log("Show multiSelectPanel (placeholder)");
            // Example: if (document.getElementById('multiSelectPanel')) document.getElementById('multiSelectPanel').classList.remove('hidden');
            // If no dedicated panel, you might default to itemLibrary or nothing
            if (currentTab === 'build') {
                itemLibrary.classList.remove('hidden'); // Or roomLibrary
            } else {
                nothing.classList.remove('hidden');
            }
        }
    }

    function createDeskElement(id, type, x, y, width, height, rotation = 0, name = '', bgColor = '#bfdbfe', borderColor = '#93c5fd', thin = false) {
        const desk = document.createElement('div');
        desk.id = id;
        desk.className = 'desk';
        if (thin) desk.classList.add('thin');
        desk.dataset.type = type;
        desk.dataset.name = name;
        desk.style.left = `${x}px`;
        desk.style.top = `${y}px`;
        desk.style.width = `${width}px`;
        desk.style.height = `${height}px`;
        desk.style.backgroundColor = bgColor;
        desk.style.borderColor = borderColor;
        desk.style.transform = `rotate(${rotation}deg)`;

        const nameDisplay = document.createElement('span');
        nameDisplay.className = 'desk-name-display';
        nameDisplay.textContent = name || '(No Name)';
        desk.appendChild(nameDisplay);

        if (type === 'round-table') desk.style.borderRadius = '50%';
        else desk.style.borderRadius = '0.375rem';

        desk.addEventListener('mousedown', startDrag);
        desk.addEventListener('click', handleDeskClick); // Main click handler for selection
        // Removed bringToFront from mousedown here; it's handled in startDrag to cover group drags too.
        return desk;
    }

    function deselectAll() {
        selectedDeskElements.forEach(el => el.classList.remove('selected'));
        selectedDeskElements = [];

        if (currentTab === 'build') {
            // Determine which library to show. Default to itemLibrary.
            // If roomLibrary was explicitly visible and editPanel was not (or was for this item), prefer roomLibrary.
            // This is a simple heuristic. A more robust way is to track last active library.
            if (!roomLibrary.classList.contains('hidden') && editPanel.classList.contains('hidden')) {
                 showPanel('roomLibrary');
            } else {
                 showPanel('itemLibrary');
            }
        } else {
            showPanel('nothing');
        }
    }

    // Item library drag start
    itemLibrary.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable-item')) {
            const itemData = {
                type: e.target.dataset.type,
                width: e.target.dataset.width,
                height: e.target.dataset.height,
                bg: e.target.dataset.bg,
                border: e.target.dataset.border,
                name: e.target.textContent.trim(),
                thin: e.target.classList.contains('thin')
            };
            e.dataTransfer.setData('application/json', JSON.stringify(itemData));
            e.dataTransfer.effectAllowed = 'copy';
        }
    });
    // Room library drag start (similar to itemLibrary)
    roomLibrary.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable-item')) {
            const itemData = {
                type: e.target.dataset.type,
                width: e.target.dataset.width,
                height: e.target.dataset.height,
                bg: e.target.dataset.bg,
                border: e.target.dataset.border,
                name: e.target.textContent.trim(),
                thin: e.target.classList.contains('thin')
            };
            e.dataTransfer.setData('application/json', JSON.stringify(itemData));
            e.dataTransfer.effectAllowed = 'copy';
        }
    });


    // Classroom drop zone listeners
    classroomWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        classroom.classList.add('dragover-target');
    });
    classroomWrapper.addEventListener('dragleave', (e) => {
        classroom.classList.remove('dragover-target');
    });
    classroomWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        classroom.classList.remove('dragover-target');
        const itemDataString = e.dataTransfer.getData('application/json');
        if (!itemDataString) return;

        try {
            const itemData = JSON.parse(itemDataString);
            const classroomRect = classroom.getBoundingClientRect();
            const scrollLeft = classroomWrapper.scrollLeft;
            const scrollTop = classroomWrapper.scrollTop;
            let x = e.clientX - classroomRect.left + scrollLeft;
            let y = e.clientY - classroomRect.top + scrollTop;
            const itemWidth = parseInt(itemData.width, 10);
            const itemHeight = parseInt(itemData.height, 10);
            x -= itemWidth / 2;
            y -= itemHeight / 2;
            const maxLeft = classroom.clientWidth - itemWidth;
            const maxTop = classroom.clientHeight - itemHeight;
            x = Math.max(0, Math.min(x, maxLeft));
            y = Math.max(0, Math.min(y, maxTop));

            const newDeskId = `desk-${deskCounter++}`;
            const newDesk = createDeskElement(
                newDeskId, itemData.type, x, y, itemWidth, itemHeight,
                0, itemData.name, itemData.bg, itemData.border, itemData.thin
            );
            classroom.appendChild(newDesk);

            // Select the newly dropped item
            deselectAll(); // Deselect any previous items
            newDesk.classList.add('selected');
            selectedDeskElements.push(newDesk);
            if (currentTab === 'build') {
                showPanel("editPanel", newDesk);
            }

        } catch (error) {
            console.error("Failed to parse dropped item data or place item:", error);
        }
    });

    // Dragging items *within* the classroom
    function startDrag(e) {
        didDrag = false; // Reset drag state for the new interaction
        const deskElement = e.target.closest('.desk');
        if (!deskElement || e.button !== 0) return;

        const parentRect = classroom.getBoundingClientRect(); // Common, can define early
        const scrollLeft = classroomWrapper.scrollLeft;
        const scrollTop = classroomWrapper.scrollTop;

        if (e.shiftKey) {
            // --- WITH SHIFT KEY ---
            // Selection changes are deferred to the 'click' event (handleDeskClick).
            // Here, we only set up drag mechanics based on current selection.
            // If the shift-clicked item is already selected and part of a multi-selection,
            // then we initiate a group drag of all selected items.
            // Otherwise, we initiate a single drag of just the clicked item.
            if (selectedDeskElements.includes(deskElement) && selectedDeskElements.length > 1) {
                isGroupDragging = true;
                groupDragStartMouse = { x: e.clientX, y: e.clientY };
                groupInitialPositions = selectedDeskElements.map(el => ({
                    element: el,
                    left: parseFloat(el.style.left),
                    top: parseFloat(el.style.top)
                }));
                selectedDeskElements.forEach(el => { // Bring all selected to front for group drag
                    highestZindex++;
                    el.style.zIndex = highestZindex;
                    el.classList.add('dragging');
                });
            } else {
                // Shift-click on an unselected item, or the only selected item.
                // Drag only this item. Selection state will be handled by handleDeskClick.
                isGroupDragging = false;
                draggedItem = deskElement; // Set for single item drag
                offsetX = (e.clientX - parentRect.left + scrollLeft) - parseFloat(deskElement.style.left);
                offsetY = (e.clientY - parentRect.top + scrollTop) - parseFloat(deskElement.style.top);
                
                highestZindex++; // Bring single dragged item to front
                deskElement.style.zIndex = highestZindex;
                deskElement.classList.add('dragging');
                // IMPORTANT: No selection change here for shift key. It's handled in handleDeskClick.
            }
        } else {
            // --- NO SHIFT KEY ---
            // Standard click/drag behavior.
            // If clicking an item already in a multi-selection, drag the whole group.
            // Otherwise, make the clicked item the sole selection and drag it.
            if (selectedDeskElements.includes(deskElement) && selectedDeskElements.length > 1) {
                // Clicked on an item that's part of an existing multi-selection (no shift) -> group drag.
                isGroupDragging = true;
                groupDragStartMouse = { x: e.clientX, y: e.clientY };
                groupInitialPositions = selectedDeskElements.map(el => ({
                    element: el,
                    left: parseFloat(el.style.left),
                    top: parseFloat(el.style.top)
                }));
                selectedDeskElements.forEach(el => {
                    highestZindex++;
                    el.style.zIndex = highestZindex;
                    el.classList.add('dragging');
                });
            } else {
                // Clicked (no shift) on:
                // 1. An unselected item.
                // 2. The only selected item.
                // Action: Make this item the sole selection (if not already) and prepare for single drag.
                isGroupDragging = false;
                draggedItem = deskElement; // Set for single item drag

                // If this item is not ALREADY the sole selected item, make it so.
                // This also handles the case where an unselected item is clicked.
                if (!(selectedDeskElements.length === 1 && selectedDeskElements[0] === deskElement)) {
                    deselectAll(); // This updates panels to default.
                    deskElement.classList.add('selected');
                    selectedDeskElements = [deskElement];
                }
                // Ensure edit panel is shown for the (now) solely selected item if on build tab.
                if (currentTab === 'build') {
                    showPanel("editPanel", deskElement);
                }

                offsetX = (e.clientX - parentRect.left + scrollLeft) - parseFloat(deskElement.style.left);
                offsetY = (e.clientY - parentRect.top + scrollTop) - parseFloat(deskElement.style.top);
                
                highestZindex++; // Bring single dragged item to front
                deskElement.style.zIndex = highestZindex;
                deskElement.classList.add('dragging');
            }
        }

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', endDrag, { once: true });
        e.preventDefault();
    }

    function dragMove(e) {
        didDrag = true; // Mark that a drag movement has occurred
        if (isGroupDragging) {
            const deltaX = e.clientX - groupDragStartMouse.x;
            const deltaY = e.clientY - groupDragStartMouse.y;
            groupInitialPositions.forEach(item => {
                let newX = item.left + deltaX;
                let newY = item.top + deltaY;
                const elemWidth = parseInt(item.element.style.width, 10);
                const elemHeight = parseInt(item.element.style.height, 10);
                newX = Math.max(0, Math.min(newX, classroom.clientWidth - elemWidth));
                newY = Math.max(0, Math.min(newY, classroom.clientHeight - elemHeight));
                if (gridSnapping) {
                    newX = Math.round(newX / gridSize) * gridSize;
                    newY = Math.round(newY / gridSize) * gridSize;
                }
                item.element.style.left = `${newX}px`;
                item.element.style.top = `${newY}px`;
            });
        } else if (draggedItem) {
            const parentRect = classroom.getBoundingClientRect();
            const scrollLeft = classroomWrapper.scrollLeft;
            const scrollTop = classroomWrapper.scrollTop;
            let newX = e.clientX - parentRect.left + scrollLeft - offsetX;
            let newY = e.clientY - parentRect.top + scrollTop - offsetY;
            const deskWidth = parseInt(draggedItem.style.width, 10);
            const deskHeight = parseInt(draggedItem.style.height, 10);
            newX = Math.max(0, Math.min(newX, classroom.clientWidth - deskWidth));
            newY = Math.max(0, Math.min(newY, classroom.clientHeight - deskHeight));
            if (gridSnapping) {
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }
            draggedItem.style.left = `${newX}px`;
            draggedItem.style.top = `${newY}px`;
        }
    }

    function endDrag(e) {
        if (isGroupDragging) {
            selectedDeskElements.forEach(el => el.classList.remove('dragging'));
            isGroupDragging = false;
            groupDragStartMouse = null;
            groupInitialPositions = [];
        } else if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        document.removeEventListener('mousemove', dragMove);
        draggedItem = null;
        // IMPORTANT: didDrag is NOT reset here. It's reset at the start of the next interaction (startDrag).
        // This allows the subsequent 'click' event handler to know if a drag occurred.
    }

    function handleDeskClick(e) {
        const deskElement = e.target.closest('.desk');
        if (!deskElement) return;

        if (e.shiftKey) {
            // --- SHIFT-CLICK LOGIC ---
            // This logic should run regardless of 'didDrag' because shift-click is an explicit action.
            if (selectedDeskElements.includes(deskElement)) {
                deskElement.classList.remove('selected');
                selectedDeskElements = selectedDeskElements.filter(el => el !== deskElement);
            } else {
                deskElement.classList.add('selected');
                selectedDeskElements.push(deskElement);
            }
        } else {
            // --- NON-SHIFT-CLICK LOGIC ---
            // If a drag operation just ended on this item (didDrag is true),
            // and this wasn't a shift-click, then we generally don't want this
            // 'click' event to change the selection state that was potentially set
            // during startDrag.
            if (didDrag) {
                // If the item just dragged is the only one selected, ensure its edit panel shows (if on build tab).
                // This covers the case where a drag ends, and it should remain selected with its panel.
                if (currentTab === 'build' && selectedDeskElements.length === 1 && selectedDeskElements[0] === deskElement) {
                    showPanel("editPanel", deskElement);
                }
                // For a non-shift click that was part of a drag, we usually don't want to deselect others here.
                // The selection should have been handled by startDrag (if dragging an unselected item)
                // or remain as is if dragging an already selected item (or group).
                return; // Exit, as the drag operation handled selection implications.
            }

            // This is a "true" click (no shift, no drag ending on this item).
            // If the clicked item is already the *only* selected item, do nothing to preserve edit panel.
            if (selectedDeskElements.length === 1 && selectedDeskElements[0] === deskElement) {
                if (currentTab === 'build') showPanel("editPanel", deskElement); // Just ensure panel is visible
                return;
            }

            // Otherwise, deselect all other items and select only this one.
            deselectAll(); // This will update panels to a default library/nothing state.
            deskElement.classList.add('selected');
            selectedDeskElements.push(deskElement);
        }

        // --- UPDATE SIDE PANEL based on new selection state ---
        if (selectedDeskElements.length === 1) {
            if (currentTab === 'build') {
                showPanel("editPanel", selectedDeskElements[0]);
            } else {
                // If not on build tab, but an item is selected, you might still want to switch to build tab
                // showControls('build'); // Optionally switch to build tab
                // showPanel("editPanel", selectedDeskElements[0]); // And show edit panel
                // For now, let's stick to only showing edit panel if already on build tab
            }
        } else if (selectedDeskElements.length > 1) {
            if (currentTab === 'build') {
                showPanel("multiSelectPanel"); // Or hide editPanel and show itemLibrary
            }
        } else { // 0 items selected (e.g., after Shift+Deselecting the last item)
            // deselectAll() would have been called for normal clicks leading to 0 selection.
            // This 'else' primarily catches the case of shift-deselecting the last item.
            if (currentTab === 'build') {
                showPanel('itemLibrary');
            } else {
                showPanel('nothing');
            }
        }
    }

    // Global click listener for deselection
    document.addEventListener('click', (e) => {
        const clickedDesk = e.target.closest('.desk');
        const clickedEditPanel = e.target.closest('#edit-panel');
        const clickedSidePanelDraggable = e.target.closest('.draggable-item');
        const clickedHeader = e.target.closest('.header-controls'); // Generic class for header area
        const clickedSidePanel = e.target.closest('#side-panel');   // Generic class for side panel area
        const clickedInputOrButton = e.target.matches('input, button, select, textarea, label');


        // Deselect if click is "on the background" (not on a desk or critical UI)
        // and items are currently selected.
        if (!clickedDesk &&
            !clickedEditPanel &&
            !clickedSidePanelDraggable &&
            !clickedHeader &&
            !clickedSidePanel &&
            !clickedInputOrButton && // Don't deselect if clicking various form elements anywhere
            selectedDeskElements.length > 0) {
            
            // Further check: ensure the click isn't on some other specific interactive UI
            // that should maintain selection. For example, if you have modal dialogs.
            // The `!e.target.closest('.some-other-ui-to-ignore')`
            deselectAll();
        }
    });

    // Edit Panel Input Handlers
    editNameInput.addEventListener('input', (e) => {
        if (selectedDeskElements.length === 1) {
            const selected = selectedDeskElements[0];
            const newName = e.target.value;
            selected.dataset.name = newName;
            const nameDisplay = selected.querySelector('.desk-name-display');
            if (nameDisplay) nameDisplay.textContent = newName || '(No Name)';
        }
    });
    editRotationInput.addEventListener('input', (e) => {
        if (selectedDeskElements.length === 1) {
            selectedDeskElements[0].style.transform = `rotate(${e.target.value}deg)`;
        }
    });
    editWidthInput.addEventListener('input', (e) => {
        if (selectedDeskElements.length === 1) {
            const newWidth = Math.max(20, parseInt(e.target.value, 10) || 20);
            selectedDeskElements[0].style.width = `${newWidth}px`;
        }
    });
    editHeightInput.addEventListener('input', (e) => {
        if (selectedDeskElements.length === 1) {
            const newHeight = Math.max(20, parseInt(e.target.value, 10) || 20);
            selectedDeskElements[0].style.height = `${newHeight}px`;
        }
    });

    // Edit Panel Buttons
    deleteItemBtn.addEventListener('click', () => {
        if (selectedDeskElements.length === 1) { // Assuming delete is for the item in edit panel
            classroom.removeChild(selectedDeskElements[0]);
            deselectAll(); // This will clear selection and update panels
        }
        // If you want delete to work for multiple selected items (not via edit panel),
        // this logic would need to be expanded or handled by keyboard delete.
    });
    deselectBtn.addEventListener('click', () => {
        deselectAll();
    });


    // Keyboard event handling (Copy/Paste/Cut/Delete)
    let copiedItemData = null; // Internal clipboard
    // const pasteOffset = 20; // Already defined, ensure it's used if needed or remove

    function handleKeyPress(e) {
        const targetTag = e.target.tagName.toUpperCase();
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag);

        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;

        if (modifierKey && e.key.toLowerCase() === 'c') {
            if (isInputFocused && e.target.closest('#edit-panel')) { // Allow copy from edit panel inputs
                 return;
            }
            e.preventDefault();
            handleCopy();
        } else if (modifierKey && e.key.toLowerCase() === 'v') {
             if (isInputFocused && e.target.closest('#edit-panel')) { // Allow paste into edit panel inputs
                 return;
            }
            e.preventDefault();
            handlePaste();
        } else if (modifierKey && e.key.toLowerCase() === 'x') {
             if (isInputFocused && e.target.closest('#edit-panel')) { // Allow cut from edit panel inputs
                 return;
            }
            e.preventDefault();
            handleCut();
        } else if (e.key === 'Delete' || (e.key === 'Backspace' && !isInputFocused)) {
            // Prevent Backspace from navigating back if an input is not focused
            if (e.key === 'Backspace') e.preventDefault();

            if (selectedDeskElements.length > 0) {
                selectedDeskElements.forEach(el => classroom.removeChild(el));
                deselectAll(); // This also updates panels
            }
        }
    }
    document.addEventListener('keydown', handleKeyPress);

    function handleCopy() {
        if (selectedDeskElements.length === 0) {
            copiedItemData = null;
            return;
        }
        const copyReference = { ...lastMousePos };
        const items = selectedDeskElements.map(el => {
            const transform = el.style.transform;
            const rotateMatch = transform.match(/rotate\(([-+]?\d*\.?\d+)deg\)/);
            const rotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
            return {
                type: el.dataset.type, name: el.dataset.name || '',
                offsetX: parseFloat(el.style.left) - copyReference.x,
                offsetY: parseFloat(el.style.top) - copyReference.y,
                width: parseInt(el.style.width, 10), height: parseInt(el.style.height, 10),
                rotation: rotation, bgColor: el.style.backgroundColor,
                borderColor: el.style.borderColor, thin: el.classList.contains('thin')
            };
        });
        copiedItemData = { reference: copyReference, items: items };
        selectedDeskElements.forEach(el => flashElement(el, 'copied-flash', 400));
    }

    function handleCut() {
        handleCopy(); // Copy first
        if (selectedDeskElements.length > 0) {
            selectedDeskElements.forEach(el => classroom.removeChild(el));
            // deselectAll is called by handleCopy if items are selected, then items are removed.
            // If handleCopy didn't change selection, explicitly deselect.
            // Since items are removed, they are effectively deselected.
            // Call deselectAll to clear the array and update panels.
            deselectAll();
        }
    }

    function handlePaste() {
        if (!copiedItemData) return;
        const pasteReference = { ...lastMousePos };
        const itemsToPaste = copiedItemData.items || [copiedItemData]; // Handle old single item copy too
        
        const currentlySelected = [...selectedDeskElements]; // Keep track of what was selected
        deselectAll(); // Deselect current items before pasting new ones

        const pastedDesks = [];
        itemsToPaste.forEach(item => {
            const newDeskId = `desk-${deskCounter++}`;
            let newX = pasteReference.x + item.offsetX;
            let newY = pasteReference.y + item.offsetY;
            newX = Math.max(0, Math.min(newX, classroom.clientWidth - item.width));
            newY = Math.max(0, Math.min(newY, classroom.clientHeight - item.height));
            if (gridSnapping) {
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }
            const newDesk = createDeskElement(
                newDeskId, item.type, newX, newY, item.width, item.height,
                item.rotation, item.name, item.bgColor, item.borderColor, item.thin
            );
            classroom.appendChild(newDesk);
            pastedDesks.push(newDesk);
        });

        pastedDesks.forEach(el => el.classList.add('selected'));
        selectedDeskElements = pastedDesks; // New selection is the pasted items

        if (selectedDeskElements.length === 1) {
            if (currentTab === 'build') showPanel("editPanel", selectedDeskElements[0]);
        } else if (selectedDeskElements.length > 1) {
            if (currentTab === 'build') showPanel("multiSelectPanel");
        }
        // If nothing pasted, selection remains cleared by deselectAll.
    }

    function flashElement(element, className, duration = 400) {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => element.classList.remove(className), duration);
    }


    // --- Classroom Resize Controls ---
    const classroomWidthInput = document.getElementById('classroom-width');
    const classroomHeightInput = document.getElementById('classroom-height');
    const applyRoomSizeBtn = document.getElementById('applyRoomSizeBtn');
    if (applyRoomSizeBtn) {
        applyRoomSizeBtn.addEventListener('click', () => {
            const newWidth = parseInt(classroomWidthInput.value, 10);
            const newHeight = parseInt(classroomHeightInput.value, 10);
            if (!isNaN(newWidth) && newWidth > 0) classroom.style.width = `${newWidth}px`;
            if (!isNaN(newHeight) && newHeight > 0) classroom.style.height = `${newHeight}px`;
        });
    }

    // ... (Keep other existing functions like clearNamesBtn, saveLayoutBtn, loadLayoutBtn, clearAllBtn logic)
    // Ensure their interactions with selection and panels are consistent if they modify items.
    // For example, clearAllBtn should call deselectAll().
        // --- Existing Button Functionality (Update as needed) ---

    // const addDeskBtn = document.getElementById('addDeskBtn'); // May be removed
    const clearNamesBtn = document.getElementById('clearNamesBtn');
    const saveLayoutBtn = document.getElementById('saveLayoutBtn');
    const loadLayoutBtn = document.getElementById('loadLayoutBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    // const optimizeBtn = document.getElementById('optimizeBtn'); // Header button // Already handled
    // const optimizeBtnActual = document.getElementById('optimizeBtnActual'); // Button in optimization section
    const dropZone = document.getElementById('dropZone');
    const fileNameDisplay = document.getElementById('fileName');
    const optimizationStatus = document.getElementById('optimizationStatus');
    const loadingOverlay = document.getElementById('loadingOverlay');
    // let uploadedPreferences = null; // Store parsed preferences // Replaced by studentPreferences

    // Clear Names Button
    if (clearNamesBtn) {
        clearNamesBtn.addEventListener('click', () => {
            document.querySelectorAll('.desk').forEach(desk => {
                desk.dataset.name = ''; // Clear data attribute
                const nameDisplay = desk.querySelector('.desk-name-display');
                if (nameDisplay) {
                    nameDisplay.textContent = '(No Name)';
                }
                // If a selected item's name is cleared, update the edit panel if it's showing that item.
                if (selectedDeskElements.length === 1 && selectedDeskElements[0] === desk) {
                    editNameInput.value = '';
                }
            });
            console.log("All names cleared.");
        });
    }

    // Clear All Button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all items?')) {
                classroom.innerHTML = ''; // Remove all children
                deselectAll(); // Ensure selection is cleared and panels updated
                deskCounter = 0;
                copiedItemData = null; // Clear clipboard as items are gone
                console.log("Classroom cleared.");
            }
        });
    }

    // --- Save Layout ---
     if (saveLayoutBtn) {
        saveLayoutBtn.addEventListener('click', () => {
            const desks = [];
            document.querySelectorAll('#classroom .desk').forEach(desk => {
                const transform = desk.style.transform;
                const rotateMatch = transform.match(/rotate\(([-+]?\d*\.?\d+)deg\)/);
                const rotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

                desks.push({
                    id: desk.id,
                    type: desk.dataset.type,
                    name: desk.dataset.name || '',
                    left: desk.style.left,
                    top: desk.style.top,
                    width: desk.style.width,
                    height: desk.style.height,
                    rotation: rotation,
                    bgColor: desk.style.backgroundColor,
                    borderColor: desk.style.borderColor,
                    thin: desk.classList.contains('thin')
                });
            });

            const layout = {
                classroom: { // Save classroom dimensions, not wrapper
                    width: classroom.style.width || getComputedStyle(classroom).width,
                    height: classroom.style.height || getComputedStyle(classroom).height
                },
                items: desks,
                nextDeskIdCounter: deskCounter // Save the next ID to ensure uniqueness on load
            };

            try {
                const layoutJson = JSON.stringify(layout, null, 2);
                const blob = new Blob([layoutJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'classroom_layout.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log("Layout saved.");
            } catch (error) {
                console.error("Error saving layout:", error);
                alert("Error saving layout. See console for details.");
            }
        });
    }

    // --- Load Layout ---
    if (loadLayoutBtn) {
        loadLayoutBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const layout = JSON.parse(event.target.result);
                            classroom.innerHTML = '';
                            deselectAll(); // Clear selection and update panels
                            copiedItemData = null; // Clear clipboard

                            if (layout.classroom) { // Restore classroom dimensions
                                if(layout.classroom.width) classroom.style.width = layout.classroom.width;
                                if(layout.classroom.height) classroom.style.height = layout.classroom.height;
                            }

                            let maxIdNum = -1;
                            if (layout.items && Array.isArray(layout.items)) {
                                layout.items.forEach(itemData => {
                                    const id = itemData.id || `desk-${deskCounter++}`; // Fallback ID generation
                                    const type = itemData.type || 'standard-desk';
                                    const name = itemData.name || '';
                                    const x = parseFloat(itemData.left || '10px');
                                    const y = parseFloat(itemData.top || '10px');
                                    const width = parseFloat(itemData.width || '100px');
                                    const height = parseFloat(itemData.height || '60px');
                                    const rotation = itemData.rotation || 0;
                                    const bgColor = itemData.bgColor || '#bfdbfe';
                                    const borderColor = itemData.borderColor || '#93c5fd';
                                    const thin = itemData.thin || false;

                                    const desk = createDeskElement(id, type, x, y, width, height, rotation, name, bgColor, borderColor, thin);
                                    classroom.appendChild(desk);

                                    const idMatch = id.match(/desk-(\d+)/);
                                    if (idMatch) {
                                        maxIdNum = Math.max(maxIdNum, parseInt(idMatch[1], 10));
                                    }
                                });
                            }
                            // Restore deskCounter
                            deskCounter = layout.nextDeskIdCounter !== undefined ? layout.nextDeskIdCounter : (maxIdNum + 1);


                            console.log("Layout loaded.");
                        } catch (error) {
                            console.error("Error loading or parsing layout file:", error);
                            alert("Error loading layout: Invalid file format or data.");
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });
    }
    
    // Optimization section file handling (click to upload)
    if (dropZone) { // Assuming dropZone is also the clickable area
        const fileInputForDropZone = document.createElement('input');
        fileInputForDropZone.type = 'file';
        fileInputForDropZone.accept = '.csv';
        fileInputForDropZone.style.display = 'none'; // Hide the actual input
        fileInputForDropZone.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                fileNameDisplay.textContent = `File: ${file.name}`;
                parseCsvFile(file); // Use your existing robust CSV parser
                 // Reset file input to allow selecting the same file again
                fileInputForDropZone.value = '';
            }
        };
        dropZone.parentNode.insertBefore(fileInputForDropZone, dropZone.nextSibling); // Add to DOM

        dropZone.addEventListener('click', () => {
            fileInputForDropZone.click(); // Trigger click on hidden file input
        });
    }

    // ... (Rest of the optimization logic, parseCsvFile, runOptimization, etc. - should be mostly fine)

    // --- State Variable for Preferences ---
    let studentPreferences = null; // Use the structure from the old code

    // --- Helper Functions ---
    function setStatus(message, type = 'info') { 
        optimizationStatus.textContent = message;
        if (type === 'error') optimizationStatus.style.color = '#dc2626'; 
        else if (type === 'success') optimizationStatus.style.color = '#16a34a'; 
        else optimizationStatus.style.color = '#6b7280'; 
    }

    const quickOptimizeBtn = document.getElementById('quickOptimizeBtn');
    const deepOptimizeBtn = document.getElementById('deepOptimizeBtn');

    function showLoading(message = "Processing...") {
        loadingOverlay.textContent = message;
        loadingOverlay.classList.remove('hidden');
        if(quickOptimizeBtn) quickOptimizeBtn.disabled = true; 
        if(deepOptimizeBtn) deepOptimizeBtn.disabled = true; 
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
        if(quickOptimizeBtn) quickOptimizeBtn.disabled = !studentPreferences;
        if(deepOptimizeBtn) deepOptimizeBtn.disabled = !studentPreferences;
    }

    // --- Drop Zone Event Listeners ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => { 
        e.preventDefault();
        dropZone.classList.remove('dragover');
        setStatus('Processing CSV file...'); 

        const file = e.dataTransfer.files[0];
            if (file && (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
                fileNameDisplay.textContent = `File: ${file.name}`;
                parseCsvFile(file); 
        } else {
            setStatus('Error: Please drop a CSV file.', 'error');
            fileNameDisplay.textContent = '';
            studentPreferences = null;
            if(quickOptimizeBtn) quickOptimizeBtn.disabled = true; 
            if(deepOptimizeBtn) deepOptimizeBtn.disabled = true; 
            }
    });

    function parseCsvFile(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const csvText = event.target.result;
            try {
                studentPreferences = parsePreferenceCsv(csvText); 
                setStatus(`Successfully parsed ${studentPreferences.students.length} students. Ready to optimize.`, 'success');
                if(quickOptimizeBtn) quickOptimizeBtn.disabled = false; 
                if(deepOptimizeBtn) deepOptimizeBtn.disabled = false; 
            } catch (error) {
                console.error("CSV Parsing Error:", error);
                setStatus(`Error parsing CSV: ${error.message}`, 'error');
                fileNameDisplay.textContent = ''; // Clear filename on error
                studentPreferences = null;
                if(quickOptimizeBtn) quickOptimizeBtn.disabled = true;
                if(deepOptimizeBtn) deepOptimizeBtn.disabled = true;
            }
        };
        reader.onerror = function() { // Removed event argument as it's not typically used for onerror
            console.error("File Reading Error:", reader.error);
            setStatus(`Error reading file: ${reader.error}`, 'error');
            fileNameDisplay.textContent = '';
            studentPreferences = null;
            if(quickOptimizeBtn) quickOptimizeBtn.disabled = true;
            if(deepOptimizeBtn) deepOptimizeBtn.disabled = true;
        };
        reader.readAsText(file);
    }

    function parsePreferenceCsv(csvText) {
        const lines = csvText.trim().split('\n');
        const dataLines = lines.filter(line => line.trim() !== '');
        if (dataLines.length < 2) {
            throw new Error("CSV must have a header row and at least one data row.");
        }
        const headerCells = dataLines[0].split(',').map(h => h.trim().toLowerCase());
        
        const nameIndex = headerCells.findIndex(cell => cell.includes("name"));
        const prefsIndex = headerCells.findIndex(cell => cell.includes("preference") || cell.includes("pref") || cell.includes("sit"));
        
        if (nameIndex === -1 || prefsIndex === -1) {
            throw new Error("CSV must contain columns with 'name' and 'preference' (or similar).");
        }
        
        const students = [];
        const preferences = {};
        const nameSet = new Set(); 
        
        for (let i = 1; i < dataLines.length; i++) {
            const values = dataLines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, '')).filter(v => v); // Also remove quotes here
        
            if (cleanValues.length > Math.max(nameIndex, prefsIndex)) {
                let name = cleanValues[nameIndex] || '';
                let prefsString = cleanValues[prefsIndex] || '';
        
                if (name) {
                    const lowerCaseName = name.toLowerCase();
                    if (nameSet.has(lowerCaseName)) {
                        console.warn(`Duplicate student name found and ignored: ${name}`);
                        continue; 
                    }
                    nameSet.add(lowerCaseName);
                    students.push(name); 
                    const preferredNames = prefsString
                        .split(/[,;]/)
                        .map(p => p.trim().toLowerCase())
                        .filter(p => p !== '');
                    preferences[name] = preferredNames; // Use original case name as key
                }
            } else if (cleanValues.length > 0 && cleanValues.some(cv => cv.length > 0)) { // check if not just an empty/whitespace line
                console.warn(`Skipping malformed CSV line ${i + 1}: ${dataLines[i]}`);
            }
        }
        if (students.length === 0) throw new Error("No valid student data found in CSV.");
        return { students, preferences };
    }

    async function runOptimization(mode) {
        if (!studentPreferences || !studentPreferences.students || studentPreferences.students.length === 0) {
            setStatus("Error: No valid preferences loaded. Please drop/select a CSV file.", 'error');
            return;
        }

        const studentsFromCsv = studentPreferences.students;
        const preferencesFromCsv = studentPreferences.preferences;
        const chairElements = Array.from(classroom.querySelectorAll('.desk'))
            .filter(desk => desk.dataset.type === 'chair' || desk.dataset.type === 'stool'); // Include stools or other seat types

        if (studentsFromCsv.length > chairElements.length) {
            setStatus(`Error: Not enough chairs/seats (${chairElements.length}) for students (${studentsFromCsv.length}).`, 'error');
            return;
        }
        if (chairElements.length === 0) {
            setStatus(`Error: No chairs/seats found in the classroom layout. Add some items of type 'chair'.`, 'error');
            return;
        }


        chairElements.sort((a, b) => { // Sort for consistent chair indexing if needed by backend
            const idA = parseInt((a.id.split('-')[1] || '0'), 10);
            const idB = parseInt((b.id.split('-')[1] || '0'), 10);
            return idA - idB;
        });

        const chairsData = chairElements.map((chair, index) => ({ // Pass index as chair_id
            id: chair.id, // Keep original DOM ID for mapping back
            chair_id: index, // Send a 0-based index to backend
            x: parseFloat(chair.style.left || 0),
            y: parseFloat(chair.style.top || 0)
        }));
        // Backend expects 'desks' to be array of [x,y,z] or similar based on your flask app
        // Let's map to what was previously sent if flask expects that structure
        const chairPositionsForPayload = chairsData.map(c => [c.x, c.y, 0]);


        const payload = {
            students: studentsFromCsv,
            desks: chairPositionsForPayload, // This is chair_positions
            preferences: preferencesFromCsv,
            optimization_type: mode 
        };

        showLoading(`Sending data to server & optimizing (${mode})... (May take minutes)`);
        setStatus("Running optimization on server...");

        try {
            const response = await fetch('/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMsg = `Server error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = `Error: ${errorData.error || errorMsg}`;
                } catch (e) { /* Ignore if error response is not JSON */ }
                throw new Error(errorMsg);
            }

            const resultJs = await response.json();
            
            // Clear existing names from chairs before assigning new ones
            chairElements.forEach(chair => {
                chair.dataset.name = '';
                const nameDisplay = chair.querySelector('.desk-name-display');
                if (nameDisplay) nameDisplay.textContent = '(No Name)'; // Or empty
            });

            // Check if the result format is as expected
            if (resultJs && resultJs.student_order && Array.isArray(resultJs.student_order)) {
                 // student_order is an array of student names in the order of chairElements
                if (resultJs.student_order.length === chairElements.length || resultJs.student_order.length === studentsFromCsv.length) {
                    resultJs.student_order.forEach((studentName, chairIndex) => {
                        console.log(`Assigning student ${studentName} to chair index ${chairIndex}`);
                        if (chairIndex < chairElements.length) {
                            const chair = chairElements[chairIndex];
                            chair.dataset.name = studentName || "Empty"; // Assign name or "Empty"
                            const nameDisplay = chair.querySelector('.desk-name-display');
                            if (nameDisplay) nameDisplay.textContent = studentName || "Empty";
                        }
                    });
                     // Assign "Empty" to any remaining unassigned chairs
                    for (let i = resultJs.student_order.length; i < chairElements.length; i++) {
                        const chair = chairElements[i];
                        chair.dataset.name = "Empty";
                        const nameDisplay = chair.querySelector('.desk-name-display');
                        if (nameDisplay) nameDisplay.textContent = "Empty";
                    }

                } else {
                     console.warn("Mismatch between student_order length and number of chairs/students.");
                     throw new Error("Optimization result has unexpected length for student_order.");
                }


                let statusMsg = `Optimization (${mode}) complete!`;
                if (resultJs.overall_satisfaction !== undefined) {
                    statusMsg += ` Satisfaction: ${Number(resultJs.overall_satisfaction).toFixed(3)}`;
                }
                if (resultJs.unfairness_score !== undefined) {
                    statusMsg += `, Unfairness: ${Number(resultJs.unfairness_score).toFixed(3)}`;
                }
                setStatus(statusMsg, 'success');
            } else {
                throw new Error("Invalid result structure (missing student_order) received from server.");
            }
        } catch (error) {
            console.error("Optimization Fetch Error:", error);
            setStatus(`Optimization failed: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    if (quickOptimizeBtn) {
        quickOptimizeBtn.addEventListener('click', () => runOptimization('quick'));
    }
    if (deepOptimizeBtn) {
        deepOptimizeBtn.addEventListener('click', () => runOptimization('deep'));
    }


}); // End DOMContentLoaded
