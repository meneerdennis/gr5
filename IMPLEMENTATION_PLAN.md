# Travel Journal Icon Implementation Plan

## Overview

Replace the ActivitySwiper slider with a travel journal icon in the upper-right corner of the map that shows a dropdown menu for activity selection.

## Components to Create/Modify

### 1. New Component: TravelJournalIcon.js

**Location**: `src/components/TravelJournalIcon.js`

**Features**:

- Display travel journal icon (128x128px) in top-right corner
- Show dropdown menu when clicked
- List all hikes with same info as current slider cards
- Handle hike selection with same behavior as current slider

**Props**:

- `hikes`: Array of hike objects
- `selectedHikeId`: Currently selected hike ID
- `onSelectHike`: Function to call when hike is selected
- `onClearSelectedHike`: Function to clear selection

### 2. Modify MapView.js

**Changes**:

- Import and add TravelJournalIcon component
- Position it in top-right corner (near existing note overlay)
- Pass required props from MapView to TravelJournalIcon
- Ensure proper z-index and positioning

### 3. Update App.js

**Changes**:

- Remove ActivitySwiper component from main layout
- Ensure all props are properly passed to MapView
- Verify existing functionality remains intact

## Implementation Steps

### Step 1: Create TravelJournalIcon Component

```jsx
// src/components/TravelJournalIcon.js
import React, { useState } from "react";

function TravelJournalIcon({
  hikes,
  selectedHikeId,
  onSelectHike,
  onClearSelectedHike,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sort hikes by date (most recent first)
  const sortedHikes = [...hikes].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB - dateA;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className="travel-journal-icon-container"
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 1000,
      }}
    >
      {/* Journal Icon Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="journal-icon-button"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="View hiking activities"
      >
        <img
          src={process.env.PUBLIC_URL + "/travel_journal_icon_128.png"}
          alt="Travel Journal"
          style={{
            width: "40px",
            height: "40px",
            objectFit: "cover",
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          className="journal-dropdown"
          style={{
            position: "absolute",
            top: "70px",
            right: "0",
            width: "350px",
            maxHeight: "500px",
            overflowY: "auto",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            border: "1px solid #e5e7eb",
            zIndex: 1001,
          }}
        >
          <div className="flex items-center gap-2 p-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Hiking Adventures
            </h3>
            <div className="badge">{sortedHikes.length} hikes</div>
          </div>

          {sortedHikes.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No activities found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedHikes.map((hike) => (
                <div
                  key={hike.id}
                  onClick={() => {
                    onSelectHike(hike.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`activity-dropdown-item ${
                    selectedHikeId === hike.id ? "selected" : ""
                  }`}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor:
                      selectedHikeId === hike.id ? "#f3f4f6" : "white",
                    transition: "background-color 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h4
                        className="text-gray-700 font-semibold"
                        title={hike.name || "Unnamed Activity"}
                      >
                        {hike.name || "Unnamed Activity"}
                      </h4>
                      {hike.note && (
                        <span
                          title="This activity has a note"
                          style={{ fontSize: "14px", color: "#D2691E" }}
                        >
                          📝
                        </span>
                      )}
                    </div>
                    {selectedHikeId === hike.id && (
                      <span style={{ color: "#10b981", fontSize: "18px" }}>
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span className="text-gray-700">
                        {formatDate(hike.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📏</span>
                      <span className="text-gray-700">
                        {hike.distanceKm?.toFixed(1) || "0"} km
                      </span>
                    </div>
                    {hike.note && (
                      <div className="flex items-center gap-1">
                        <span>📝</span>
                        <span className="text-gray-700">note</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TravelJournalIcon;
```

### Step 2: Modify MapView.js

```jsx
// Add to imports
import TravelJournalIcon from "./TravelJournalIcon";

// Add to MapView component props
function MapView({
  // ... existing props
  selectedHikeId,
  onSelectHike,
  onClearSelectedHike,
  hikes,
}) {
  // ... existing code

  // Add TravelJournalIcon to the map container
  return (
    <div className="map-container fade-in">
      <div className="map-view-container">
        {/* ... existing map container code */}

        {/* Add TravelJournalIcon - positioned in top-right */}
        <TravelJournalIcon
          hikes={hikes}
          selectedHikeId={selectedHikeId}
          onSelectHike={onSelectHike}
          onClearSelectedHike={onClearSelectedHike}
        />

        {/* ... rest of existing code */}
      </div>
    </div>
  );
}
```

### Step 3: Update App.js

```jsx
// Remove ActivitySwiper import and usage
// The MapView already receives all necessary props
```

### Step 4: Add CSS Styles

```css
/* Add to src/styles/modern.css or create new file */
.journal-icon-button:hover {
  background-color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  transition: all 0.2s ease;
}

.activity-dropdown-item:hover {
  background-color: #f9fafb;
}

.activity-dropdown-item.selected {
  background-color: #e5e7eb;
}

.badge {
  background-color: #e5e7eb;
  color: #374151;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}
```

## Testing Plan

1. **Visual Testing**:

   - Verify journal icon appears in correct position
   - Check dropdown opens/closes properly
   - Ensure dropdown styling matches design

2. **Functionality Testing**:

   - Test hike selection from dropdown
   - Verify map zooms to selected hike
   - Check that notes appear when hike with note is selected
   - Test scrolling to map section

3. **Edge Cases**:

   - Test with no hikes available
   - Test with hikes that have no notes
   - Verify mobile responsiveness

4. **Regression Testing**:
   - Ensure all existing functionality still works
   - Test photo markers still work
   - Verify elevation profile interaction unchanged

## Timeline Estimate

- Component creation: 30 minutes
- Integration: 20 minutes
- Styling: 15 minutes
- Testing: 20 minutes
- Total: ~1.5 hours

## Files to Create/Modify

- ✅ Create: `src/components/TravelJournalIcon.js`
- ✅ Modify: `src/components/MapView.js`
- ✅ Modify: `src/App.js`
- ✅ Modify: `src/styles/modern.css` (or create new CSS file)
