package main

import (
	"math"
	"math/rand"
)

const (
	GridW         = 30
	GridH         = 18
	OrgCount      = 8
	FrameDelay    = 200
	BirthProb     = 0.2
	DeathTemp     = 7.0
	BirthTemp     = 4.0
	MaxSteps      = 6
	MinSteps      = 1
	SunPowerStart = 1.0
)

type Organism struct {
	ID       int
	X, Y     int
	Color    string
	Albedo   float64
	TempOpt  float64
	Rule     string
	Axiom    string
	Angle    float64
	Steps    int
	Alive    bool
	Name     string
}

type World struct {
	GridTemp   [][]float64
	GridAlbedo [][]float64
	SunPower   float64
	Organisms  []*Organism
	Width      int
	Height     int
}

var OrganismTypes = []Organism{
	{
		Name:    "Black Daisy",
		Color:   "black",
		Albedo:  0.2,
		TempOpt: 22.5,
		Axiom:   "F",
		Rule:    "F[+F]F[-F]F",
		Angle:   25.7,
	},
	{
		Name:    "White Daisy",
		Color:   "white",
		Albedo:  0.8,
		TempOpt: 17.5,
		Axiom:   "F",
		Rule:    "F[+F]F[-F]F",
		Angle:   25.7,
	},
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func NewWorld() *World {
	w := &World{
		Width:    GridW,
		Height:   GridH,
		SunPower: SunPowerStart,
	}
	w.GridTemp = make([][]float64, w.Height)
	w.GridAlbedo = make([][]float64, w.Height)
	for y := 0; y < w.Height; y++ {
		w.GridTemp[y] = make([]float64, w.Width)
		w.GridAlbedo[y] = make([]float64, w.Width)
		for x := 0; x < w.Width; x++ {
			w.GridTemp[y][x] = 20.0 + rand.Float64()*3.0
			w.GridAlbedo[y][x] = 0.5
		}
	}
	for i := 0; i < OrgCount; i++ {
		ot := OrganismTypes[i%len(OrganismTypes)]
		org := &Organism{
			ID:      i,
			X:       rand.Intn(w.Width),
			Y:       rand.Intn(w.Height),
			Color:   ot.Color,
			Albedo:  ot.Albedo,
			TempOpt: ot.TempOpt,
			Axiom:   ot.Axiom,
			Rule:    ot.Rule,
			Angle:   ot.Angle,
			Steps:   1,
			Alive:   true,
			Name:    ot.Name,
		}
		w.Organisms = append(w.Organisms, org)
	}
	return w
}

func (w *World) Update() {
	for y := 0; y < w.Height; y++ {
		for x := 0; x < w.Width; x++ {
			w.GridAlbedo[y][x] = 0.5
		}
	}
	for _, o := range w.Organisms {
		if o.Alive {
			w.GridAlbedo[o.Y][o.X] = o.Albedo
		}
	}
	for y := 0; y < w.Height; y++ {
		for x := 0; x < w.Width; x++ {
			albedo := w.GridAlbedo[y][x]
			base := (1.0 - albedo) * w.SunPower * 30.0
			sum := 0.0
			nc := 0
			for _, dy := range []int{-1, 0, 1} {
				for _, dx := range []int{-1, 0, 1} {
					if dx == 0 && dy == 0 {
						continue
					}
					ny, nx := y+dy, x+dx
					if nx >= 0 && nx < w.Width && ny >= 0 && ny < w.Height {
						sum += w.GridTemp[ny][nx]
						nc++
					}
				}
			}
			neigh := 0.0
			if nc > 0 {
				neigh = sum / float64(nc)
			}
			w.GridTemp[y][x] = 0.8*base + 0.2*neigh
		}
	}

	occupied := make([][]*Organism, w.Height)
	for y := range occupied {
		occupied[y] = make([]*Organism, w.Width)
	}
	for _, o := range w.Organisms {
		if o.Alive {
			occupied[o.Y][o.X] = o
		}
	}
	var newOrganisms []*Organism
	for _, o := range w.Organisms {
		if !o.Alive {
			continue
		}
		temp := w.GridTemp[o.Y][o.X]
		diff := math.Abs(temp - o.TempOpt)
		if diff > DeathTemp {
			o.Alive = false
			continue
		}
		if diff < BirthTemp && o.Steps < MaxSteps {
			o.Steps++
		} else if diff > BirthTemp && o.Steps > MinSteps {
			o.Steps--
		}
		if diff < BirthTemp && rand.Float64() < BirthProb {
			dirs := [][2]int{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}
			rand.Shuffle(len(dirs), func(i, j int) { dirs[i], dirs[j] = dirs[j], dirs[i] })
			for _, d := range dirs {
				ny, nx := o.Y+d[0], o.X+d[1]
				if nx >= 0 && nx < w.Width && ny >= 0 && ny < w.Height && occupied[ny][nx] == nil {
					no := &Organism{
						ID:      len(w.Organisms) + len(newOrganisms),
						X:       nx,
						Y:       ny,
						Color:   o.Color,
						Albedo:  o.Albedo,
						TempOpt: o.TempOpt,
						Axiom:   o.Axiom,
						Rule:    o.Rule,
						Angle:   o.Angle,
						Steps:   1,
						Alive:   true,
						Name:    o.Name,
					}
					newOrganisms = append(newOrganisms, no)
					occupied[ny][nx] = no
					break
				}
			}
		}
	}
	w.Organisms = append(w.Organisms, newOrganisms...)
}
