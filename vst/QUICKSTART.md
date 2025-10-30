# Quick Start Guide

## 🚀 Getting Started in 60 Seconds

1. **Open the file:**
   ```bash
   open index.html
   # or just double-click index.html in Finder
   ```

2. **Navigate:**
   - Use the **left sidebar** to jump between sections
   - Or just scroll naturally

3. **Explore the math:**
   - **Click on `α`** in any equation
   - **Watch** the right margin slide out with explanation
   - **See** all instances of `α` pulse across the page

4. **Play with parameters:**
   - **Click the gear icon** (⚙️) in bottom-right
   - **Drag sliders** to change frequencies, scaling, etc.
   - **Watch** visualizations update in real-time

## 🎯 Try These Examples

### Example 1: Understand the Scaling Function
1. Navigate to **Section 4: Scaling Functions**
2. Open the FAB (bottom-right ⚙️)
3. Drag the "Exponent α" slider
4. Watch how λ(t) = t^α changes shape

### Example 2: Explore Variable Relationships
1. Go to **Section 3: VST Formulation**
2. Click on **λ** in the equation `λ(t) = t^α`
3. In the margin note, click on the **`alpha`** link
4. See how α and λ are connected

### Example 3: Compare FFT vs VST
1. Navigate to **Section 5: FFT vs VST**
2. Open FAB → adjust "Tone 1 Frequency"
3. Click **"Compute Transforms"**
4. Compare the two spectra side-by-side

## 🎨 Cool Features to Try

### Multi-Select (Ctrl+Click)
```
1. Click on 'α' in λ(t) = t^α
2. Hold Ctrl/Cmd and click on 'λ'
3. See both highlighted + their relationship in margin
```

### Drag the Controls
```
1. Open FAB (⚙️)
2. Click the ⋮⋮ icon in panel header
3. Drag the entire panel anywhere on screen
```

### Collapse Gutters
```
- Click ‹ button in left gutter to hide navigation
- Click › button in right gutter to hide margin notes
- More reading space!
```

### Animation Demo
```
1. Click any variable multiple times quickly
2. Watch different animations trigger
3. Try clicking related variables in sequence
```

## 🐛 Troubleshooting

**Math not rendering?**
- Check browser console (F12)
- Make sure you're using a modern browser
- KaTeX CDN might be loading - wait 2-3 seconds

**FAB not showing controls?**
- Navigate to Section 2 or 3 (sections with controls)
- Click the ⚙️ button to expand

**Visualizations blank?**
- Vega-Lite may still be loading
- Check network tab - should see requests to cdn.jsdelivr.net
- Try refreshing the page

**Right margin not showing notes?**
- Click on a variable that has notes defined (λ, α, f, ω)
- Check if right gutter is collapsed (click › to expand)

## 📖 What's Happening Under the Hood

When you click on a math element:

1. **`math-symbolizer.js`** detects the click
2. **`knowledge-graph.js`** looks up related concepts
3. **`margin-notes.js`** renders the explanation
4. **`equation-animator.js`** adds visual feedback
5. **Vega-Lite** renders any charts in the note

All coordinated by **`main.js`**!

## 🎓 Next Steps

- Read the full [README.md](README.md) for architecture details
- Explore the source of each JS module
- Try adding your own equations and concepts
- Adapt for your own physics/math paper!

---

**Questions?** Check the console (F12) for debug messages.
**Issues?** All components log to console with `[ComponentName]` prefix.
