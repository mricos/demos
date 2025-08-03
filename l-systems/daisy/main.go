package main

import (
	"math/rand"
	"time"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	w := NewWorld()
	tabs := InfoTabs()
	tabIdx := 0

	for {
		PrintWorld(w, tabs, tabIdx)
		w.Update()

		// non-blocking read, but always advance one step per frame
		if b, ok := NonBlockingRead(); ok {
			switch b {
			case 'q':
				return
			case '\t':
				tabIdx = (tabIdx + 1) % len(tabs)
			case 's':
				for _, o := range w.Organisms {
					if o.Alive && o.Steps > MinSteps {
						o.Steps--
					}
				}
			case 'S':
				for _, o := range w.Organisms {
					if o.Alive && o.Steps < MaxSteps {
						o.Steps++
					}
				}
			case 'r', 'R':
				for _, o := range w.Organisms {
					cur := 0
					for i, ot := range OrganismTypes {
						if o.Name == ot.Name {
							cur = i
							break
						}
					}
					nxt := (cur + 1) % len(OrganismTypes)
					ot := OrganismTypes[nxt]
					o.Name = ot.Name
					o.Color = ot.Color
					o.Albedo = ot.Albedo
					o.TempOpt = ot.TempOpt
					o.Axiom = ot.Axiom
					o.Rule = ot.Rule
					o.Angle = ot.Angle
					o.Steps = 1
					o.Alive = true
				}
			case 'n':
				*w = *NewWorld()
			case 'b':
				*w = *NewWorld()
				for _, o := range w.Organisms {
					o.Name = OrganismTypes[0].Name
					o.Color = OrganismTypes[0].Color
					o.Albedo = OrganismTypes[0].Albedo
					o.TempOpt = OrganismTypes[0].TempOpt
				}
			case 'w':
				*w = *NewWorld()
				for _, o := range w.Organisms {
					o.Name = OrganismTypes[1].Name
					o.Color = OrganismTypes[1].Color
					o.Albedo = OrganismTypes[1].Albedo
					o.TempOpt = OrganismTypes[1].TempOpt
				}
			case 'm':
				*w = *NewWorld()
				for i, o := range w.Organisms {
					idx := i % len(OrganismTypes)
					o.Name = OrganismTypes[idx].Name
					o.Color = OrganismTypes[idx].Color
					o.Albedo = OrganismTypes[idx].Albedo
					o.TempOpt = OrganismTypes[idx].TempOpt
				}
			case '+':
				w.SunPower += 0.05
			case '-':
				w.SunPower -= 0.05
			}
		}
		time.Sleep(time.Duration(FrameDelay) * time.Millisecond)
	}
}

