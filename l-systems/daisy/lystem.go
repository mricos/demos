package main

import "strings"

func ExpandLSystem(axiom, rule string, steps int) string {
	result := axiom
	for i := 0; i < steps; i++ {
		var next strings.Builder
		for _, c := range result {
			if c == 'F' {
				next.WriteString(rule)
			} else {
				next.WriteRune(c)
			}
		}
		result = next.String()
	}
	return result
}
