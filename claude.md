# CLAUDE.md

## Project: Simple Electron Netlist Canvas Editor

### Goal
Build a **beautiful, simple, comfortable Electron desktop app** for drawing and editing **dummy netlists / connection graphs**.

This app is **not an EDA logic tool**.
It is **not for synthesis, simulation, timing, FPGA, RTL, or protocol logic**.
It is only for:
- drawing nodes
- adding/removing ports
- connecting ports with channels/lines
- editing node parameters/configuration
- keeping the canvas neat, readable, and easy to use

The main purpose is to give the user a very good visual editor that feels smooth and professional, similar in comfort to modern diagram and EDA-style editors, but used only as a **graphical netlist drawing tool**.

---

## 1. Product Vision

The application should let a user:
- create blocks/nodes on a canvas
- rename nodes
- move nodes freely
- edit node configuration
- add or remove ports from nodes
- connect output ports to input ports visually
- prevent invalid port-direction connections
- draw clean, comfortable lines between nodes
- keep lines readable while nodes are moved
- make the graph look organized and attractive
- save/load/export the netlist drawing

The feeling should be:
- lightweight
- elegant
- visually clean
- easy to understand
- comfortable for long use
- much simpler than real EDA tools
- focused on graph editing only

---

## 2. Scope

### In Scope
- Electron desktop app
- canvas-based graph editor
- node CRUD
- port CRUD
- channel/connection CRUD
- node configuration window
- input/output port direction rules
- drag-to-connect with live preview line
- automatic line cleanup/rerouting when nodes move
- save/load project
- export simple dummy netlist JSON
- undo/redo
- zoom/pan
- selection tools
- polished UI

### Out of Scope
- real HDL logic
- simulation
- synthesis
- FPGA mapping
- bus protocols
- timing analysis
- hardware semantics
- code generation

This project must stay focused on **beautiful graph editing only**.

---

## 3. Main User Experience

When the user opens the app, they should see:
- a **center canvas** for graph editing
- a **left panel** for node templates / quick add
- a **right inspector** for selected node or connection settings
- a **top toolbar** for common actions
- an optional **bottom panel** for messages / validation / status

Main flow:
1. Create new project
2. Add some nodes to canvas
3. Move and arrange them
4. Open node config and add/remove ports
5. Drag from one port to another to connect
6. Visually adjust layout by moving nodes
7. Save/export result

This should feel smooth and visual, almost like drawing a polished interactive technical diagram.

---

## 4. Core Objects

## 4.1 Project
Contains:
- project name
- version
- canvas settings
- nodes list
- connections list
- style preferences
- save metadata

## 4.2 Node
A node is a visual block on the canvas.

Each node should include:
- unique id
- display name
- optional subtitle/type
- position x/y
- width/height
- color/style class
- list of ports
- list of config parameters
- expanded/collapsed state
- locked/unlocked state

## 4.3 Port
A port belongs to a node.

Each port should include:
- unique id
- parent node id
- display name
- direction (`input` or `output`)
- optional type label
- side placement (`left`, `right`, optional top/bottom)
- order index on that side
- whether single or multiple connection is allowed

## 4.4 Connection / Channel
Represents one visual line between ports.

Each connection should include:
- unique id
- source node id
- source port id
- target node id
- target port id
- routed points / bend points
- style info
- optional label

---

## 5. Functional Specification

## 5.1 Node CRUD
The user must be able to:
- create a node
- duplicate a node
- rename a node
- move a node
- resize a node if style allows it
- delete a node
- lock/unlock a node
- collapse/expand a node

Deleting a node must also remove related connections cleanly.

Duplicating a node should:
- copy node look
- copy ports
- copy config parameters
- assign new ids
- not auto-copy connections unless explicitly chosen

---

## 5.2 Port CRUD
The user must be able to:
- add new ports in node config
- delete ports
- rename ports
- change port direction
- reorder ports
- move port placement side if allowed

Port editing must update immediately on the canvas.

Example:
- add input port → node redraws with new input port
- remove output port → related connection cleanup happens if needed

---

## 5.3 Node Configuration Window
Every node must have a config editor.

Open methods:
- double click node
- right click menu
- inspector button

The config UI should have simple tabs or sections:

### General
- node name
- subtitle/type text
- color/style preset
- notes/description

### Ports
- list all ports
- add/remove ports
- rename ports
- choose input/output
- choose side/order
- choose single/multi-connection rule

### Parameters
These are only **dummy display/config parameters**, not hardware logic.
They exist so nodes can store editable user-defined metadata.

Examples:
- label
- category
- text notes
- user tags
- display options
- custom fields

### Style
Optional visual settings:
- node color
- accent color
- icon
- compact/large mode
- header style

---

## 5.4 Connection Rules
This project should keep connection rules simple.

Allowed:
- output → input

Rejected:
- output → output
- input → input
- same exact duplicate connection
- connect a port to itself

Optional policy:
- one input may allow only one source
- one output may connect to many inputs

The rules should stay visual and simple, not logical/EDA-specific.

---

## 5.5 Drag-to-Connect Interaction
Connection creation must feel smooth.

Expected interaction:
1. User presses on a source port
2. A temporary line follows the cursor
3. Compatible target ports highlight
4. Invalid targets show blocked state
5. Releasing on valid target creates the connection
6. Releasing elsewhere cancels cleanly

Visual feedback is very important.

While dragging:
- hovered valid targets glow/highlight
- invalid ones show disabled/red state
- temporary line looks elegant and responsive

---

## 5.6 Prevent Wrong Connections
If the user tries an invalid connection, the app must:
- block it immediately
- keep the canvas clean
- show a clear small explanation

Example reasons:
- wrong direction
- already occupied input
- duplicate connection

Feedback can appear as:
- small tooltip near cursor
- status message
- red shake/highlight on invalid target

---

## 5.7 Connection / Line Drawing Requirements
This is one of the most important parts.

The lines must look:
- clean
- elegant
- readable
- non-chaotic
- visually aligned

### Preferred line style
Use:
- orthogonal lines (horizontal/vertical segments)
- rounded or slightly softened corners if visually nice
- balanced spacing
- neat alignment

### Hard requirements
- lines must not go through node bodies
- lines must update when nodes move
- lines must remain readable
- routing must feel stable and not jump randomly

### Soft requirements
- reduce line-line crossings
- keep nearby lines visually parallel
- maintain spacing between similar routes
- avoid messy zig-zag paths

### Desired feel
The routing should imitate the comfort of good graphical design tools:
- tidy
- adaptive
- professional-looking
- easier to follow with eyes

It does not need real EDA intelligence.
It only needs **strong visual routing quality**.

---

## 5.8 Dynamic Line Behavior
When nodes are moved:
- connected lines reroute automatically
- line segments stay outside node boxes
- routes try to remain aligned with existing layout
- the result should not look noisy

The routing should prefer:
- fewer bends
- straighter paths
- clean side exits from ports
- balanced turns

Small node movement should ideally cause small line changes, not full chaotic reroute.

---

## 5.9 Canvas Behavior
The canvas must support:
- pan
- zoom
- fit to screen
- grid background
- optional snap-to-grid
- node drag
- multi-select
- selection rectangle
- keyboard shortcuts

Suggested shortcuts:
- Delete → remove selected node/connection
- Ctrl/Cmd+C → copy
- Ctrl/Cmd+V → paste
- Ctrl/Cmd+Z → undo
- Ctrl/Cmd+Shift+Z → redo
- Ctrl/Cmd+S → save
- F2 → rename

---

## 5.10 Inspector Panel
The right-side inspector must update depending on selection.

### If node selected
Show:
- name
- subtitle/type
- position/size
- ports summary
- editable parameters
- style settings

### If connection selected
Show:
- source node/port
- target node/port
- connection label
- style settings

### If nothing selected
Show:
- project summary
- number of nodes
- number of connections
- quick actions

---

## 5.11 Node Library / Quick Add Panel
The left-side panel should provide simple templates.

Possible simple templates:
- blank node
- process node
- source node
- target node
- comment/annotation block
- group block

Each template should only define visual defaults and default ports.
Not logic.

---

## 5.12 Validation
Validation should stay simple and visual.

Validate:
- wrong-direction connections
- duplicate connections
- missing source/target references
- broken port references after edits
- occupied single-input conflicts

Severity:
- error
- warning
- info

Show validation through:
- small badges/icons
- bottom panel
- tooltips
- inspector messages

---

## 5.13 Undo / Redo
Undo/redo must support:
- node create/delete/move/rename
- port create/delete/edit
- connection create/delete
- style changes
- parameter edits

Use a clean history model so editing feels professional.

---

## 5.14 Save / Load / Export
### Save / Load
Projects must save to local files.
Recommended format: JSON.

Stored data should include:
- project metadata
- nodes
- ports
- connections
- positions
- styling info
- parameters
- version

### Export
Export a simple **dummy netlist JSON**.
This export is just structural graph data.
No logic semantics are required.

Optionally export:
- pretty JSON
- compact JSON
- image/screenshot of canvas in future

---

## 6. UI / UX Style Requirements

The app must feel very comfortable.
This is critical.

### Style goals
- modern
- technical but friendly
- clean spacing
- readable typography
- soft but precise colors
- beautiful node shapes
- smooth hover and selection states

### Node style
Nodes should look polished:
- rounded corners
- clean header area
- visible title
- clear port alignment
- enough spacing between ports
- no clutter

### Port style
Ports should be:
- easy to click/drag
- clearly visible
- aligned consistently
- visually distinct for input vs output

### Connection style
Connections should:
- be visually prominent enough to follow
- not dominate the screen
- show hover/selection states clearly
- optionally support subtle animation when selected

### Important comfort factors
- no cramped layout
- no tiny hard-to-click controls
- no overly bright aggressive colors
- no messy reroute behavior
- no confusing mode switching

---

## 7. Suggested Technical Architecture

### Desktop Shell
Use Electron for:
- desktop packaging
- native menus
- file dialogs
- local filesystem access
- window management

### Frontend
Recommended:
- React + TypeScript
- clean component-based UI
- dedicated graph state layer
- dedicated routing layer

### Major modules
Suggested modules:
- `app-shell`
- `graph-model`
- `canvas-editor`
- `routing-engine`
- `validation-engine`
- `inspector-ui`
- `project-storage`
- `history-manager`

Important rule:
Do not mix all logic inside canvas rendering code.
Keep data model, routing, and UI separated.

---

## 8. Routing Engine Specification

The routing engine is visual only.
Its purpose is to make lines look good.

### Input
- source port anchor point
- target port anchor point
- node bounding boxes
- canvas obstacles
- preferred spacing values

### Output
- route segments / points for drawing the line

### Must do
- avoid node bodies
- keep orthogonal clean routing
- reroute on node movement
- remain stable and readable

### Should try to do
- reduce crossings
- maintain parallel paths
- preserve spacing
- avoid ugly zig-zags

### Routing philosophy
This app needs **visual elegance first**, not shortest mathematical route.

---

## 9. Example Data Model

A project file should conceptually contain:
- project
  - id
  - name
  - version
  - settings
  - nodes[]
  - connections[]

A node should contain:
- id
- name
- type
- x
- y
- width
- height
- style
- parameters[]
- ports[]

A port should contain:
- id
- nodeId
- name
- direction
- side
- order
- maxConnections

A connection should contain:
- id
- fromNodeId
- fromPortId
- toNodeId
- toPortId
- routePoints[]
- label

---

## 10. Acceptance Criteria

### Example A
User adds two nodes.
User adds one output to first node and one input to second node.
User drags from output to input.
Connection is created successfully.

### Example B
User tries output → output.
Connection is rejected.
Small message explains why.
No broken line remains.

### Example C
User moves a node.
Connected lines reroute automatically.
Lines do not pass through node boxes.
The result still looks neat.

### Example D
User opens node config.
Adds two new ports and renames one.
Canvas updates immediately.

### Example E
User deletes a port that has a connection.
App either blocks with warning or removes related connection cleanly according to chosen UX rule.

---

## 11. MVP Milestones

### Milestone 1: Canvas Basics
- Electron shell
- canvas
- add/move/delete nodes
- basic styling

### Milestone 2: Ports and Connections
- add/remove ports
- drag-to-connect
- direction validation
- connection rendering

### Milestone 3: Config and Inspector
- node config dialog
- inspector panel
- parameters and port editor

### Milestone 4: Better Routing and Polish
- cleaner orthogonal routing
- reroute on move
- selection polish
- undo/redo
- save/load/export

### Milestone 5: Comfort and Beauty Pass
- visual refinement
- smoother animations
- better spacing
- usability improvements

---

## 12. Final Development Guidance for Claude

When implementing this project:
- keep it simple
- do not turn it into a hardware tool
- focus on drawing quality and editing comfort
- prioritize beautiful line routing and clean canvas interactions
- make node/port editing intuitive
- maintain strong separation between model, routing, and UI
- aim for a polished, comfortable desktop editing experience

The final result should feel like:
- a lightweight visual netlist sketcher
- a professional node-and-channel editor
- a simple but strong canvas app for building and editing structured connection diagrams

