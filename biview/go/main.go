// Biview (simplified, code-grounded): split TUI with per-(leftTab,rightTab) cursors,
// Vim-like left hand (a/w/s/d) for LEFT pane and right hand (i/j/k/l) for RIGHT pane.
// Added: always-on-top status bar; modal summary toggle (h);
// right-side hotkeys o,p,u,m (u/o = toggle mark types, p = next mark, m = clear marks);
// Tab = cycle tabs within focused pane; Shift+Tab = switch focus; '1' same as Tab; '2' same as Shift+Tab.
//
// go get github.com/charmbracelet/bubbletea github.com/charmbracelet/lipgloss
package main

import (
	"fmt"
	"os"
	"sort"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type focus int

const (
	fLeft focus = iota
	fRight
)

// Per-(leftTab,rightTab) cursor state
type ComboState struct {
	L  int // left list index
	Rx int // right cursor x (for future use)
	Ry int // right cursor y (line)
}

type model struct {
	w, h  int
	f     focus
	depth int

	leftTabs  []string // e.g., Files | Search
	rightTabs []string // e.g., Code | Diff

	// combo[i][j] corresponds to leftTabs[i], rightTabs[j].
	combo [][]ComboState

	// example data (code-grounded)
	files      []string
	searchHits []string
	codeByFile map[string][]string // right=Code
	diffByFile map[string][]string // right=Diff (mock)

	// marks: per-file line markers (two kinds: 'u' and 'o')
	marks map[string]map[int]rune

	// UI state
	showSummary bool
}

func initialModel() model {
	leftTabs := []string{"Files", "Search"}
	rightTabs := []string{"Code", "Diff"}

	combo := make([][]ComboState, len(leftTabs))
	for i := range combo {
		combo[i] = make([]ComboState, len(rightTabs))
	}

	files := []string{
		"cmd/tetrad/main.go",
		"internal/core/tasks.go",
		"internal/core/exec.go",
		"pkg/api/router.go",
		"pkg/api/auth.go",
		"README.md",
	}
	search := []string{
		"internal/core/exec.go:42: TODO: handle SIGCHLD",
		"pkg/api/router.go:17: registerRoute(\"/deploy\")",
		"cmd/tetrad/main.go:88: // FIXME: context cancel",
	}

	codeByFile := map[string][]string{
		"cmd/tetrad/main.go": {
			"package main",
			"",
			"import (",
			"\t\"context\"",
			"\t\"log\"",
			"\t\"net/http\"",
			")",
			"",
			"func main() {",
			"\tctx := context.Background()",
			"\tif err := run(ctx); err != nil {",
			"\t\tlog.Fatal(err)",
			"\t}",
			"}",
		},
		"internal/core/tasks.go": {
			"package core",
			"",
			"type Task struct {",
			"\tID   string",
			"\tCmd  []string",
			"\tEnv  []string",
			"}",
		},
		"internal/core/exec.go": {
			"package core",
			"",
			"// TODO: handle SIGCHLD to reap children",
			"func ExecTask(t Task) error {",
			"\treturn nil",
			"}",
		},
		"pkg/api/router.go": {
			"package api",
			"",
			"func registerRoutes() {",
			"\t// registerRoute(\"/deploy\")",
			"\t// registerRoute(\"/status\")",
			"}",
		},
		"pkg/api/auth.go": {
			"package api",
			"",
			"func authorize(token string) bool {",
			"\treturn token != \"\"",
			"}",
		},
		"README.md": {
			"# Tetrad",
			"",
			"A minimal HTTP API façade for a process manager.",
		},
	}

	diffByFile := map[string][]string{
		"cmd/tetrad/main.go": {
			"diff --git a/cmd/tetrad/main.go b/cmd/tetrad/main.go",
			"@@",
			"- ctx := context.Background()",
			"+ ctx, cancel := context.WithCancel(context.Background())",
			"+ defer cancel()",
		},
		"internal/core/exec.go": {
			"diff --git a/internal/core/exec.go b/internal/core/exec.go",
			"@@",
			"- // TODO: handle SIGCHLD to reap children",
			"+ // NOTE: handle SIGCHLD via signal.NotifyContext",
		},
	}

	return model{
		f:          fLeft,
		leftTabs:   leftTabs,
		rightTabs:  rightTabs,
		combo:      combo,
		files:      files,
		searchHits: search,
		codeByFile: codeByFile,
		diffByFile: diffByFile,
		marks:      make(map[string]map[int]rune),
	}
}

func (m model) Init() tea.Cmd { return nil }

// active tabs (kept simple for this minimal file)
var activeLeft, activeRight int

func (m model) rightBodyH() int { return max(m.h-3, 1) } // 1 status + 1 tabs + 1 spare

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch ev := msg.(type) {
	case tea.WindowSizeMsg:
		m.w, m.h = ev.Width, ev.Height
		return m, nil

	case tea.KeyMsg:
		switch ev.String() {
		// global
		case "ctrl+c":
			return m, tea.Quit
		case "e":
			m.depth++
		case "q":
			if m.depth == 0 {
				return m, tea.Quit
			}
			m.depth--
		case "h":
			m.showSummary = !m.showSummary

		// focus/tab management
		case "tab", "1":
			// cycle tabs within focused pane
			if m.f == fLeft {
				activeLeft = cycle(activeLeft, +1, len(m.leftTabs))
			} else {
				activeRight = cycle(activeRight, +1, len(m.rightTabs))
			}
		case "shift+tab", "2":
			// switch focus between panes
			if m.f == fLeft {
				m.f = fRight
			} else {
				m.f = fLeft
			}

		// LEFT pane navigation (a,w,s,d)
		case "a":
			activeLeft = cycle(activeLeft, -1, len(m.leftTabs))
		case "d":
			activeLeft = cycle(activeLeft, +1, len(m.leftTabs))
		case "w":
			cs := &m.combo[activeLeft][activeRight]
			cs.L = clamp(cs.L-1, 0, m.leftListLen(activeLeft)-1)
		case "s":
			cs := &m.combo[activeLeft][activeRight]
			cs.L = clamp(cs.L+1, 0, m.leftListLen(activeLeft)-1)

		// RIGHT pane navigation (i/j/k/l) and hotkeys (o,p,u,m)
		case "i": // up
			cs := &m.combo[activeLeft][activeRight]
			cs.Ry = clamp(cs.Ry-1, 0, m.rightBodyH()-1)
		case "k": // down
			cs := &m.combo[activeLeft][activeRight]
			cs.Ry = clamp(cs.Ry+1, 0, m.rightBodyH()-1)
		case "j": // left
			cs := &m.combo[activeLeft][activeRight]
			cs.Rx = clamp(cs.Rx-1, 0, 3)
		case "l": // right
			cs := &m.combo[activeLeft][activeRight]
			cs.Rx = clamp(cs.Rx+1, 0, 3)

		case "u": // toggle mark type 'u' at current line
			m.toggleMarkAtCurrent('u')
		case "o": // toggle mark type 'o' at current line
			m.toggleMarkAtCurrent('o')
		case "p": // jump to next mark
			m.jumpToNextMark()
		case "m": // clear marks for current file
			file := m.currentSelectedFile()
			delete(m.marks, file)
		}
	}
	return m, nil
}

var (
	accent       = lipgloss.NewStyle().Foreground(lipgloss.Color("39"))
	faint        = lipgloss.NewStyle().Faint(true)
	tabActiveS   = lipgloss.NewStyle().Bold(true).Underline(true).Padding(0, 1)
	tabInactiveS = lipgloss.NewStyle().Padding(0, 1).Faint(true)
	sepStyle     = lipgloss.NewStyle().SetString("│")
)

// ----- View -----
func (m model) View() string {
	if m.w == 0 || m.h == 0 {
		return "initializing"
	}
	innerW := max(m.w, 20)
	innerH := max(m.h, 10)

	leftW := max(innerW/3, 24)
	rightW := innerW - leftW - 1
	bodyH := innerH - 2 // 1 status + 1 tabs row included in panes

	status := m.viewStatus(innerW)
	left := m.viewLeft(leftW, bodyH)
	right := m.viewRight(rightW, bodyH)

	row := lipgloss.JoinHorizontal(lipgloss.Top, left, sepStyle.String(), right)
	return status + "\n" + row
}

func (m model) viewStatus(w int) string {
	file := m.currentSelectedFile()
	cs := m.combo[activeLeft][activeRight]
	leftState := fmt.Sprintf("L:%s[%d]", m.leftTabs[activeLeft], cs.L)
	rightState := fmt.Sprintf("R:%s line=%d file=%s", m.rightTabs[activeRight], cs.Ry+1, file)
	focus := map[focus]string{fLeft: "LEFT", fRight: "RIGHT"}[m.f]
	summary := "off"
	if m.showSummary {
		summary = "on"
	}
	text := fmt.Sprintf("focus=%s depth=%d summary=%s | %s | %s", focus, m.depth, summary, leftState, rightState)
	if len(text) > w {
		text = text[:max(0, w)]
	}
	return accent.Render(text)
}

func (m model) viewLeft(w, bodyH int) string {
	tabs := renderTabs(m.leftTabs, activeLeft, m.f == fLeft, "LEFT")
	items := m.leftList(activeLeft)
	cs := m.combo[activeLeft][activeRight]

	// clamp selection to available items
	if n := len(items); n > 0 {
		cs.L = clamp(cs.L, 0, n-1)
		m.combo[activeLeft][activeRight] = cs
	}

	lines := make([]string, 0, min(bodyH-1, len(items)))
	for i := 0; i < min(bodyH-1, len(items)); i++ {
		prefix := "  "
		text := items[i]
		if i == cs.L && m.f == fLeft {
			lines = append(lines, accent.Copy().Bold(true).Render("> "+text))
		} else {
			lines = append(lines, prefix+text)
		}
	}

	body := strings.Join(lines, "\n")
	return tabs + "\n" + body
}

func (m model) viewRight(w, bodyH int) string {
	tabs := renderTabs(m.rightTabs, activeRight, m.f == fRight, "RIGHT")
	cs := m.combo[activeLeft][activeRight]

	var body string
	if m.showSummary {
		body = m.renderSummary(bodyH - 1)
	} else {
		switch m.rightTabs[activeRight] {
		case "Code":
			file := m.currentSelectedFile()
			lines := m.codeByFile[file]
			body = m.renderCodeWithMarks(file, lines, cs.Ry, bodyH-1)
		case "Diff":
			file := m.currentSelectedFile()
			lines := m.diffByFile[file]
			body = m.renderCodeWithMarks(file, lines, cs.Ry, bodyH-1)
		default:
			body = "(no mode)"
		}
	}
	return tabs + "\n" + body
}

// ----- right-pane mark helpers -----
func (m *model) toggleMarkAtCurrent(kind rune) {
	file := m.currentSelectedFile()
	if file == "" {
		return
	}
	cs := m.combo[activeLeft][activeRight]
	if _, ok := m.marks[file]; !ok {
		m.marks[file] = make(map[int]rune)
	}
	if existing, ok := m.marks[file][cs.Ry]; ok && existing == kind {
		delete(m.marks[file], cs.Ry) // toggle off
	} else {
		m.marks[file][cs.Ry] = kind
	}
}

func (m *model) jumpToNextMark() {
	file := m.currentSelectedFile()
	if file == "" {
		return
	}
	cs := &m.combo[activeLeft][activeRight]
	if len(m.marks[file]) == 0 {
		return
	}
	var lines []int
	for ln := range m.marks[file] {
		lines = append(lines, ln)
	}
	sort.Ints(lines)
	for _, ln := range lines {
		if ln > cs.Ry {
			cs.Ry = ln
			return
		}
	}
	// wrap to first
	cs.Ry = lines[0]
}

// ----- data helpers -----
func (m model) leftList(which int) []string {
	switch m.leftTabs[which] {
	case "Files":
		return m.files
	case "Search":
		return m.searchHits
	default:
		return nil
	}
}
func (m model) leftListLen(which int) int { return len(m.leftList(which)) }

func (m model) currentSelectedFile() string {
	cs := m.combo[activeLeft][activeRight]
	switch m.leftTabs[activeLeft] {
	case "Files":
		if len(m.files) == 0 {
			return ""
		}
		return m.files[clamp(cs.L, 0, len(m.files)-1)]
	case "Search":
		if len(m.searchHits) == 0 {
			return ""
		}
		h := m.searchHits[clamp(cs.L, 0, len(m.searchHits)-1)]
		parts := strings.SplitN(h, ":", 2)
		return parts[0]
	default:
		return ""
	}
}

// ----- presentation helpers -----
func renderTabs(names []string, active int, focused bool, label string) string {
	var parts []string
	lbl := label
	if focused {
		lbl = accent.Render(label)
	}
	parts = append(parts, lbl+" |")
	for i, n := range names {
		if i == active {
			parts = append(parts, tabActiveS.Render(n))
		} else {
			parts = append(parts, tabInactiveS.Render(n))
		}
	}
	return strings.Join(parts, " ")
}

func (m model) renderSummary(height int) string {
	file := m.currentSelectedFile()
	var out []string
	out = append(out, "Summary")
	out = append(out, "———")
	out = append(out, fmt.Sprintf("Left:%s Right:%s Depth:%d", m.leftTabs[activeLeft], m.rightTabs[activeRight], m.depth))
	out = append(out, fmt.Sprintf("File: %s", file))
	if mk, ok := m.marks[file]; ok && len(mk) > 0 {
		var lines []int
		for ln := range mk {
			lines = append(lines, ln)
		}
		sort.Ints(lines)
		for _, ln := range lines {
			out = append(out, fmt.Sprintf("  %4d %c", ln+1, mk[ln]))
		}
	} else {
		out = append(out, "  (no marks)")
	}
	if len(out) > height {
		out = out[:height]
	}
	return strings.Join(out, "\n")
}

func (m model) renderCodeWithMarks(file string, lines []string, cursorY, height int) string {
	if len(lines) == 0 {
		return "(empty)"
	}
	start := clamp(cursorY-(height/2), 0, max(0, len(lines)-height))
	end := min(len(lines), start+height)
	var out []string
	lnw := len(fmt.Sprintf("%d", end))
	mk := m.marks[file]
	for i := start; i < end; i++ {
		lineNo := fmt.Sprintf("%*d", lnw, i+1)
		mark := " "
		if mk != nil {
			if r, ok := mk[i]; ok {
				mark = string(r)
			}
		}
		row := lineNo + "│" + mark + " " + lines[i]
		if i == cursorY {
			out = append(out, accent.Copy().Bold(true).Render(row))
		} else {
			out = append(out, row)
		}
	}
	return strings.Join(out, "\n")
}

// ----- util -----
func clamp(x, lo, hi int) int {
	if hi < lo {
		return lo
	}
	if x < lo {
		return lo
	}
	if x > hi {
		return hi
	}
	return x
}
func min(a, b int) int { if a < b { return a }; return b }
func max(a, b int) int { if a > b { return a }; return b }
func cycle(i, d, n int) int { return (i + d + n) % n }

func main() {
	activeLeft, activeRight = 0, 0
	if err := tea.NewProgram(initialModel(), tea.WithAltScreen()).Start(); err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
}

