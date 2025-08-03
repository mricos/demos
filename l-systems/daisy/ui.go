package main

import (
	"fmt"
	"math"
	"os"
	"strings"
  "time"
	"golang.org/x/term"
)

type InfoWindow struct {
	title string
	lines []string
}

var ansiColors = map[string]string{
	"black":  "\033[1;30m",
	"white":  "\033[1;37m",
	"yellow": "\033[1;33m",
	"red":    "\033[1;31m",
	"green":  "\033[1;32m",
	"blue":   "\033[1;34m",
}
const ansiReset = "\033[0m"

func PrintWorld(w *World, infoTabs []InfoWindow, tabIdx int) {
	grid := make([][]rune, w.Height)
	for y := range grid {
		grid[y] = make([]rune, w.Width)
		for x := range grid[y] {
			grid[y][x] = ' '
		}
	}
	for _, o := range w.Organisms {
		if o.Alive {
			ls := ExpandLSystem(o.Axiom, o.Rule, o.Steps)
			DrawLSystemToGrid(ls, o.Angle, grid, o.X, o.Y)
		}
	}
	fmt.Print("\033[H\033[2J")
	fmt.Printf("Multi-Organism Daisyworld (q=quit, Tab=info, r=next org type, S/s=all step +/-, Org:%d, SunPower:%.2f)\n", len(w.Organisms), w.SunPower)
	for y := 0; y < w.Height; y++ {
		for x := 0; x < w.Width; x++ {
			t := clamp((w.GridTemp[y][x]-10)/20, 0, 1)
			col := ansiColors["blue"]
			if t > 0.66 {
				col = ansiColors["red"]
			} else if t > 0.33 {
				col = ansiColors["yellow"]
			}
			ch := "·"
			for _, o := range w.Organisms {
				if o.Alive && o.X == x && o.Y == y {
					ch = ansiColors[o.Color] + "◆" + ansiReset
				}
			}
			fmt.Print(col, ch, ansiReset)
		}
		fmt.Println()
	}
	PrintInfoTabs(infoTabs, tabIdx, w)
}

func DrawLSystemToGrid(ls string, angle float64, grid [][]rune, ox, oy int) {
	dir := -90.0
	stack := []struct {
		x, y int
		d    float64
	}{}
	x, y := ox, oy
	for _, c := range ls {
		switch c {
		case 'F':
			nx := x + int(roundCos(dir))
			ny := y + int(roundSin(dir))
			if nx >= 0 && nx < len(grid[0]) && ny >= 0 && ny < len(grid) {
				grid[ny][nx] = '█'
			}
			x, y = nx, ny
		case '+':
			dir += angle
		case '-':
			dir -= angle
		case '[':
			stack = append(stack, struct {
				x, y int
				d    float64
			}{x, y, dir})
		case ']':
			if len(stack) > 0 {
				s := stack[len(stack)-1]
				x, y, dir = s.x, s.y, s.d
				stack = stack[:len(stack)-1]
			}
		}
	}
}

func roundCos(deg float64) float64 {
	return math.Round(math.Cos(deg * math.Pi / 180))
}
func roundSin(deg float64) float64 {
	return math.Round(math.Sin(deg * math.Pi / 180))
}

func padOrClip(s string, w int) string {
	rs := []rune(s)
	if len(rs) > w {
		return string(rs[:w])
	}
	return string(rs) + strings.Repeat(" ", w-len(rs))
}

func PrintInfoTabs(infoTabs []InfoWindow, tabIdx int, w *World) {
	boxw := GridW * 2
	activeTab := infoTabs[tabIdx%len(infoTabs)]
	tabHeader := "Tabs:"
	for i, tab := range infoTabs {
		if i == tabIdx {
			tabHeader += fmt.Sprintf(" [*%s*]", tab.title)
		} else {
			tabHeader += fmt.Sprintf("  %s ", tab.title)
		}
	}
	tabHeader = padOrClip(tabHeader, boxw-4)
	lines := []string{
		"┌" + strings.Repeat("─", boxw-2) + "┐",
		fmt.Sprintf("│  %-*s│", boxw-4, tabHeader),
		fmt.Sprintf("│  %-*s│", boxw-4, activeTab.title),
		"├" + strings.Repeat("─", boxw-2) + "┤",
	}
	for _, l := range activeTab.lines {
		lines = append(lines, fmt.Sprintf("│  %-*s│", boxw-4, padOrClip(l, boxw-4)))
	}
	lines = append(lines, "├"+strings.Repeat("─", boxw-2)+"┤")
	// One-line organism summary (no scrolling)
	speciesCount := map[string]int{}
	for _, o := range w.Organisms {
		if o.Alive {
			speciesCount[o.Name]++
		}
	}
	summary := "Alive: "
	for _, ot := range OrganismTypes {
		n := speciesCount[ot.Name]
		summary += fmt.Sprintf("%s=%d  ", ot.Name, n)
	}
	lines = append(lines, fmt.Sprintf("│  %-*s│", boxw-4, strings.TrimSpace(summary)))
	lines = append(lines, "└"+strings.Repeat("─", boxw-2)+"┘")
	y := GridH + 2
	for i, line := range lines {
		fmt.Printf("\033[%d;1H\033[0;100m%s\033[0m\n", y+i, line)
	}
}

func InfoTabs() []InfoWindow {
	return []InfoWindow{
		{
			title: "Controls",
			lines: []string{
				"[s/S] Decrease/Increase L-system steps (all orgs)",
				"[r]   Cycle all organism types",
				"[Tab] Switch info tab",
				"[q]   Quit",
				"Set SunPower in code for black/white/balance.",
			},
		},
		{
			title: "About",
			lines: []string{
				"Generalized Daisyworld with multiple organisms.",
				"Each organism has L-system geometry, color/albedo, and a preferred temperature.",
				"Grid cells are colored by temperature (blue=cold, yellow=warm, red=hot).",
				"Organisms change grid albedo, affecting local temperature.",
			},
		},
		{
			title: "Gaia Theory",
			lines: []string{
				"Gaia (Lovelock): Organisms and environment form a feedback loop.",
				"Daisyworld: Plant color controls local albedo, self-regulating temperature.",
				"This simulation supports many organism types and parameters.",
			},
		},
		{
			title: "Pattern",
			lines: []string{
				"Default L-system: F[+F]F[-F]F, angle=25.7°",
				"F: move forward, +: left, -: right, [: push, ]: pop",
				"Organisms grow if local temp matches preference.",
				"Dead organisms disappear. Black/white = Daisyworld.",
			},
		},
	}
}

func NonBlockingRead() (byte, bool) {
	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		return 0, false
	}
	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return 0, false
	}
	defer term.Restore(fd, oldState)
	buf := make([]byte, 1)
	os.Stdin.SetReadDeadline(time.Now().Add(5 * 1e6)) // 5ms
	n, _ := os.Stdin.Read(buf)
	if n == 1 {
		return buf[0], true
	}
	return 0, false
}
