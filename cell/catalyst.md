# Catalyst Extension for SIR Model

## Overview

A catalyst accelerates reactions by bringing stochastic processes closer together—a form of "fluid-flow sync." In spatial SIR, catalysts **accelerate local equilibrium** without being consumed, transforming diffusion-limited kinetics into reaction-limited kinetics.

---

## Catalysis Methods in Reaction-Diffusion Systems

### Method 1: Mobile Catalyst Agents (C)

Add a 4th agent type that moves rapidly (v_cat = 2v) and boosts infectivity within radius r_cat. Near catalyst: p_eff = p × k_cat (e.g., k=2.5). Catalysts are conserved—they cycle through S/I/R interactions without depleting.

**Visual effect:** Glowing "trails" of enhanced infection following purple/yellow catalyst particles. Creates **streaking patterns** and **preferential pathways**.

### Method 2: Fixed Catalytic Sites

Spatial patches (e.g., 10% of field) where p is permanently elevated. Like enzyme-coated membrane regions.

**Visual effect:** Infection **channels through corridors**, avoiding non-catalytic zones. Creates **dendritic preferential growth** along catalytic "veins."

### Method 3: Aggregation Catalysts (Synchronization)

Catalyst exerts weak attractive force on S and I agents within radius r_agg, transiently clustering them. Higher local density → more encounters → faster infection.

**Visual effect:** **Pulsating hotspots**—agents swarm toward catalysts, infection spikes, then disperses. Resembles **chemotactic aggregation** (like slime mold!) or **convective mixing** in fluid reactions.

### Method 4: Noise Reduction (Temporal Sync)

Catalyst reduces variance in contact timing: instead of Bernoulli(p) at each encounter, use deterministic threshold after N encounters. This "synchronizes" infection events.

**Visual effect:** **Ultra-sharp wave fronts** with minimal stochastic fuzz. Resembles **excitable media** (heart muscle, neural avalanches).

**Summary:** Catalysis transforms **diffusion-limited** kinetics (slow, waiting for random collisions) into **reaction-limited** kinetics (fast, every encounter succeeds). Visually: smoother, faster, more organized patterns.

---

## Expected Visual Phenomena

Catalysts create distinctive spatial and temporal patterns in reaction-diffusion systems.

### Catalyst Wakes

Trailing zones of rapid I→R turnover behind moving catalysts. The catalyst leaves a "wake" of accelerated dynamics.

### Autocatalytic Fronts

If I agents act as their own catalysts (increase p nearby), you get **self-sustaining sharp boundaries**—like flame fronts or BZ waves. The infection amplifies itself.

### Fingering Instabilities

Faster reaction in catalytic zones creates viscous fingering (Saffman-Taylor pattern) as waves "push" through slower regions. Uneven propagation creates finger-like protrusions.

### Vortex Formation

If catalyst induces rotational flow (chiral catalyst or magnetic field analog), spiral waves emerge—classic in BZ reaction. Rotational symmetry breaking.

### Burst Dynamics

Fixed catalytic sites create **pacemaker zones** that periodically emit infection pulses. Rhythmic spatiotemporal patterns.

### Physical Realizations

- **Enzyme kinetics:** Membrane-bound enzymes (fixed sites) vs. diffusing enzyme molecules (mobile C agents)
- **Morphogen gradients:** BMP/Wnt proteins organizing cell fate—catalyst = signaling molecule concentrating cells
- **Autocatalytic chemistry:** Belousov-Zhabotinsky reaction where intermediate products catalyze their own formation
- **Nanoparticle catalysis:** Gold nanoparticles in solution lowering activation barriers locally
- **Excitable media:** Cardiac tissue where calcium waves synchronize cell firing via aggregation catalysts

---

## Enabling Turing Patterns with Catalysts

**Short answer:** Not with basic catalysts alone, but **YES with the right modifications!**

### Why current SIR + catalysts won't produce Turing patterns:

- **Missing inhibitor:** Turing needs activator + inhibitor. Catalysts only accelerate (activate), with no suppression mechanism
- **Uniform diffusion:** All agents move at same speed v. Turing requires D_inhibitor > D_activator
- **Global transience:** System → all R eventually. Turing needs **stable steady states**

### How to modify for Turing patterns:

#### Recipe 1: SIRS + Catalyst-Inhibitor Pair

- Add immunity waning: R→S at rate δ (creates cyclic dynamics, preventing R saturation)
- Introduce **Catalyst C**: mobile agent that boosts p locally (activator)
- Introduce **Inhibitor H**: diffuses 3× faster, suppresses p where present
- Interaction: High I → produces C locally, but C triggers H production
- Result: C accumulates faster than it can diffuse away (slow), H spreads and suppresses distant regions (fast)

**Visual:** **Stationary spots or stripes** of high I concentration, separated by H-dominated low-I zones

#### Recipe 2: Autocatalytic I + Diffusing Suppressor

- Make I autocatalytic: infected boost p for nearby S→I (local activation)
- Add diffusing "interferon" molecule that spreads from I but inhibits new infections
- Interferon diffuses faster than agents move
- Add R→S to sustain dynamics

**Visual:** **Hexagonal or labyrinthine domains** of infection, classic Turing morphology

#### Recipe 3: Dual Catalyst Species (Gierer-Meinhardt)

- Fast diffusing catalyst C_fast (inhibitor role): suppresses infection globally
- Slow diffusing catalyst C_slow (activator role): enhances infection locally
- I produces both, but C_slow dominates nearby, C_fast spreads far
- SIRS dynamics for sustainability

**Visual:** **Stable periodic arrays**—like leopard spots or zebrafish stripes

### Key requirements summary:

- ✓ **Two species** with antagonistic effects (activator + inhibitor)
- ✓ **Differential diffusion** (fast inhibitor, slow activator)
- ✓ **Sustained dynamics** (SIRS or external driving to prevent R saturation)
- ✓ **Nonlinear feedback** (autocatalysis or saturation)

**Biological example:** Skin pigmentation patterns use this! Melanocyte-stimulating factor (slow activator) + melanocyte-inhibiting factor (fast inhibitor) create leopard spots, zebra stripes, and tropical fish patterns via Turing mechanism.

---

## Implementation Notes

When implementing catalyst features:

1. **Start with Method 1 (Mobile Catalyst Agents)** - most visually striking and easiest to understand
2. **Add control panel tab for Catalyst mode** with parameters:
   - Number of catalyst agents
   - Catalyst speed multiplier
   - Catalytic boost factor (k_cat)
   - Catalyst radius (r_cat)
3. **Color coding:** Purple or yellow for catalyst particles
4. **For Turing patterns:** Will need SIRS extension (R→S backflow) + inhibitor species
