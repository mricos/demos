package main

import (
	"fmt"
	"golang.org/x/term"
	"math"
	"os"
	"strings"
	"time"
)

type Vec2 struct{ x, y float64 }
type TurtleState struct{ pos Vec2; dir float64; col int }
type LSystem struct {
	axiom  string
	rules  map[rune]string
	angle  float64
	length float64
}
type InfoWindow struct {
	title string
	lines []string
}

const (
	gridSize   = 40
	frameDelay = 70 * time.Millisecond
)

var ansiColors = []string{
	"\033[31m", "\033[32m", "\033[33m", "\033[34m", "\033[35m", "\033[36m",
}
const ansiReset = "\033[0m"

// L-system expansion
func (ls *LSystem) expand(steps int) string {
	result := ls.axiom
	for i := 0; i < steps; i++ {
		var next strings.Builder
		for _, c := range result {
			if repl, ok := ls.rules[c]; ok {
				next.WriteString(repl)
			} else {
				next.WriteRune(c)
			}
		}
		result = next.String()
	}
	return result
}

// Draw L-system on a color grid
func drawLSystem(ls *LSystem, steps int, colorOffset int) [][]string {
	grid := make([][]string, gridSize)
	for i := range grid {
		grid[i] = make([]string, gridSize)
		for j := range grid[i] {
			grid[i][j] = " "
		}
	}
	stack := []TurtleState{}
	pos := Vec2{gridSize / 2, gridSize - 2}
	dir := -90.0
	col := colorOffset % len(ansiColors)
	setPixel := func(p Vec2, c int) {
		x := int(math.Round(p.x))
		y := int(math.Round(p.y))
		if x >= 0 && x < gridSize && y >= 0 && y < gridSize {
			grid[y][x] = ansiColors[c%len(ansiColors)] + "*" + ansiReset
		}
	}
	instructions := ls.expand(steps)
	for _, c := range instructions {
		switch c {
		case 'F':
			rad := dir * math.Pi / 180
			newPos := Vec2{pos.x + math.Cos(rad)*ls.length, pos.y + math.Sin(rad)*ls.length}
			setPixel(newPos, col)
			pos = newPos
		case '+':
			dir += ls.angle
			col++
		case '-':
			dir -= ls.angle
			col++
		case '[':
			stack = append(stack, TurtleState{pos, dir, col})
		case ']':
			if len(stack) > 0 {
				state := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				pos = state.pos
				dir = state.dir
				col = state.col
			}
		}
	}
	return grid
}

// Print the grid to terminal
func printGrid(grid [][]string) {
	for _, row := range grid {
		for _, cell := range row {
			fmt.Print(cell)
		}
		fmt.Println()
	}
}

// Tabbed info box using a data-driven model
func printInfoTabs(infoTabs []InfoWindow, tabIdx int, ls *LSystem, steps int, showInfo bool) {
	if !showInfo || len(infoTabs) == 0 {
		return
	}
	w := gridSize
	activeTab := infoTabs[tabIdx%len(infoTabs)]
	// Compose tab header
	tabHeader := "Tabs: "
	for i, tab := range infoTabs {
		if i == tabIdx {
			tabHeader += fmt.Sprintf("[*%s*] ", tab.title)
		} else {
			tabHeader += fmt.Sprintf(" %s  ", tab.title)
		}
	}
	lines := []string{
		"┌" + strings.Repeat("─", w-2) + "┐",
		fmt.Sprintf("│  %s%*s│", tabHeader, w-len(tabHeader)-4, ""),
		fmt.Sprintf("│  %s%*s│", activeTab.title, w-len(activeTab.title)-4, ""),
		"├" + strings.Repeat("─", w-2) + "┤",
	}
	for _, l := range activeTab.lines {
		lines = append(lines, fmt.Sprintf("│  %-*s│", w-4, l))
	}
	lines = append(lines, "├"+strings.Repeat("─", w-2)+"┤")
	// Always include current L-system state in any info window
	stateLine := fmt.Sprintf("Steps:%2d  Angle:%6.2f°  Length:%4.2f  Rule: F→%s", steps, ls.angle, ls.length, ls.rules['F'])
	lines = append(lines, fmt.Sprintf("│  %-*s│", w-4, stateLine))
	lines = append(lines, "└"+strings.Repeat("─", w-2)+"┘")
	// Position after grid
	y := gridSize + 2
	for i, line := range lines {
		fmt.Printf("\033[%d;1H\033[0;100m%s\033[0m\n", y+i, line)
	}
}

// Non-blocking single key read (raw mode)
func nonBlockingRead() (byte, bool) {
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
	os.Stdin.SetReadDeadline(time.Now().Add(5 * time.Millisecond))
	n, _ := os.Stdin.Read(buf)
	if n == 1 {
		return buf[0], true
	}
	return 0, false
}

func main() {
	ls := &LSystem{
		axiom: "F",
		rules: map[rune]string{'F': "F[+F]F[-F]F"},
		angle: 25.7, length: 2.1,
	}
	steps, stepsMax := 1, 5
	showInfo := true
	colorBase := 0
	dir := 1
	tabIdx := 0

	// Data-driven info tabs
	infoTabs := []InfoWindow{
		{
			title: "Controls",
			lines: []string{
				"[s/S] Decr/Incr steps",
				"[a/A] Decr/Incr angle",
				"[l/L] Decr/Incr segment length",
				"[i]   Toggle info window",
				"[Tab] Switch info tab",
				"[q]   Quit",
			},
		},
		{
			title: "About",
			lines: []string{
				"L-system terminal demo",
				"Supports real-time animation,",
				"ANSI color, branching, info tabs.",
				"Built in Go. Uses golang.org/x/term.",
			},
		},
		{
			title: "Pattern",
			lines: []string{
				"Axiom: F",
				"Rule: F → F[+F]F[-F]F",
				"Angle: 25.7°",
				"Classic 'plant' L-system",
				"Try steps 3–5 for best shape",
			},
		},
		{
			title: "Resources",
			lines: []string{
				"Algorithmic Beauty of Plants:",
				"http://algorithmicbotany.org/papers/#abop",
				"ANSI codes: https://en.wikipedia.org/wiki/ANSI_escape_code",
				"Go: https://golang.org/",
			},
		},
	}

	for {
		fmt.Print("\033[H\033[2J")
		grid := drawLSystem(ls, steps, colorBase)
		fmt.Printf("L-System: steps=%d, angle=%.2f°, length=%.2f   (Press 'q' to quit)\n", steps, ls.angle, ls.length)
		printGrid(grid)
		printInfoTabs(infoTabs, tabIdx, ls, steps, showInfo)
		// Key read and parameter mods
		if b, ok := nonBlockingRead(); ok {
			switch b {
			case 'q':
				fmt.Print(ansiReset, "\033[0m")
				return
			case 'i':
				showInfo = !showInfo
			case '\t':
				tabIdx = (tabIdx + 1) % len(infoTabs)
			case 'a':
				ls.angle -= 1.0
			case 'A':
				ls.angle += 1.0
			case 's':
				if steps > 1 {
					steps--
				}
			case 'S':
				if steps < stepsMax {
					steps++
				}
			case 'l':
				ls.length = math.Max(0.5, ls.length-0.1)
			case 'L':
				ls.length += 0.1
			}
		}
		time.Sleep(frameDelay)
		colorBase += dir
		if colorBase%stepsMax == stepsMax-1 || colorBase%stepsMax == 0 {
			dir *= -1
		}
	}
}

