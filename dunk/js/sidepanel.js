/**
 * Dunk - Sidepanel Module
 * Tips, help, and history content
 */

NS.Sidepanel = {
  currentTab: 'tips',

  content: {
    tips: {
      title: 'Production Tips',
      html: `
        <h4>808 Kick Tips</h4>
        <ul>
          <li><strong>Pitch Sweep:</strong> The classic 808 sound comes from rapid pitch decay (130Hz → 50Hz in ~6ms)</li>
          <li><strong>Sub Layer:</strong> Increase sub-harmonic mix for more low-end weight</li>
          <li><strong>Click Attack:</strong> Boost click intensity to cut through dense mixes</li>
          <li><strong>Decay Shape:</strong> Use decay fine to control envelope curve - linear for punchy, log for sustained</li>
        </ul>

        <h4>Dubstep Bass</h4>
        <ul>
          <li><strong>Wobble Rate:</strong> 4Hz is classic dubstep, 8Hz for faster "brostep"</li>
          <li><strong>Reese Layer:</strong> Enable Reese channel with high detune for phasing effect</li>
          <li><strong>Grime Zone:</strong> Focus growl frequency between 400-700Hz for maximum "nastiness"</li>
          <li><strong>Filter Modulation:</strong> Connect LFO to filter cutoff for classic wobble</li>
        </ul>

        <h4>Mixing Tips</h4>
        <ul>
          <li><strong>High-pass other elements:</strong> Leave room for the sub frequencies</li>
          <li><strong>Sidechain:</strong> Use compressor with kick trigger for pumping effect</li>
          <li><strong>Mono Below 100Hz:</strong> Keep sub frequencies centered</li>
          <li><strong>Saturation:</strong> Add harmonics to help sub translate on small speakers</li>
        </ul>
      `
    },

    help: {
      title: 'User Guide',
      html: `
        <h4>Getting Started</h4>
        <ol>
          <li>Click <strong>Start</strong> to initialize audio</li>
          <li>Click steps in the sequencer to create a pattern</li>
          <li>Press <strong>Play</strong> to start playback</li>
          <li>Click on schematic modules to open parameter panels</li>
        </ol>

        <h4>Keyboard Shortcuts</h4>
        <ul>
          <li><strong>Space:</strong> Play/Stop</li>
          <li><strong>1-4:</strong> Select voice</li>
          <li><strong>T:</strong> Trigger current voice</li>
          <li><strong>C:</strong> Clear pattern</li>
          <li><strong>M:</strong> Toggle MIDI learn</li>
        </ul>

        <h4>Voice Architecture</h4>
        <p>Each voice has 8 parallel channels:</p>
        <ul>
          <li><strong>Sub:</strong> Deep sine fundamental</li>
          <li><strong>Body:</strong> Triangle octave up</li>
          <li><strong>Click:</strong> Noise transient</li>
          <li><strong>Harmonics:</strong> Sawtooth overtones</li>
          <li><strong>Sub-Harm:</strong> Octave below sine</li>
          <li><strong>Formant:</strong> Vowel resonances</li>
          <li><strong>Noise:</strong> Filtered noise layer</li>
          <li><strong>Reese:</strong> Detuned saws</li>
        </ul>

        <h4>MIDI Control</h4>
        <p>Connect a MIDI controller and use CC messages:</p>
        <ul>
          <li><strong>CC 20-27:</strong> Knobs (filter, LFO, etc.)</li>
          <li><strong>CC 40-47:</strong> Sliders (levels, decay)</li>
        </ul>
        <p>Click "MIDI Learn" to create custom mappings.</p>
      `
    },

    '808': {
      title: 'TR-808 History',
      html: `
        <h4>The Roland TR-808</h4>
        <p>Released in 1980, the Roland TR-808 Rhythm Composer was one of the first programmable drum machines. Though initially a commercial failure, it became one of the most influential instruments in music history.</p>

        <h4>The Circuit</h4>
        <p>The 808 kick uses analog synthesis:</p>
        <ul>
          <li><strong>Bridged-T oscillator:</strong> Generates the tone</li>
          <li><strong>Pitch envelope:</strong> VCA-controlled frequency sweep</li>
          <li><strong>Self-oscillating filter:</strong> Adds harmonics</li>
          <li><strong>Decay control:</strong> Adjustable amplitude envelope</li>
        </ul>

        <h4>Cultural Impact</h4>
        <p>The 808 shaped entire genres:</p>
        <ul>
          <li><strong>Hip-Hop:</strong> Afrika Bambaataa's "Planet Rock" (1982)</li>
          <li><strong>Miami Bass:</strong> Extended sub frequencies</li>
          <li><strong>Trap:</strong> Pitched kicks and hi-hat rolls</li>
          <li><strong>UK Bass:</strong> Dubstep, grime, garage</li>
        </ul>

        <h4>Famous Tracks</h4>
        <ul>
          <li>Marvin Gaye - "Sexual Healing"</li>
          <li>Beastie Boys - "Paul Revere"</li>
          <li>Whitney Houston - "I Wanna Dance with Somebody"</li>
          <li>Kanye West - "808s & Heartbreak" (album)</li>
        </ul>
      `
    },

    '303': {
      title: 'TB-303 History',
      html: `
        <h4>The Roland TB-303</h4>
        <p>Released in 1981, the TB-303 Bass Line was designed as a bassist's practice tool. Like the 808, it was a commercial failure but became legendary for its distinctive squelchy sound.</p>

        <h4>The Sound</h4>
        <p>Key characteristics of the 303:</p>
        <ul>
          <li><strong>Single VCO:</strong> Sawtooth or square wave</li>
          <li><strong>18dB/oct lowpass filter:</strong> With resonance</li>
          <li><strong>Accent:</strong> Emphasizes certain notes</li>
          <li><strong>Slide:</strong> Portamento between notes</li>
          <li><strong>The "Squelch":</strong> Filter resonance feedback</li>
        </ul>

        <h4>Birth of Acid</h4>
        <p>In 1987, DJ Pierre and Phuture created "Acid Tracks" by abusing a 303's knobs, inventing acid house. The genre spread from Chicago to the UK, fueling the rave movement.</p>

        <h4>Classic Acid Tracks</h4>
        <ul>
          <li>Phuture - "Acid Tracks"</li>
          <li>A Guy Called Gerald - "Voodoo Ray"</li>
          <li>808 State - "Pacific State"</li>
          <li>Josh Wink - "Higher State of Consciousness"</li>
          <li>Hardfloor - "Acperience"</li>
        </ul>

        <h4>Modern Legacy</h4>
        <p>The 303 sound lives on in electro, techno, and EDM. Countless clones and emulations exist, but original units sell for thousands of dollars.</p>
      `
    },

    dubstep: {
      title: 'Dubstep Guide',
      html: `
        <h4>Origins of Dubstep</h4>
        <p>Dubstep emerged from South London around 2000, blending UK garage, 2-step, dub reggae, and grime. Early pioneers focused on space, sub-bass, and sparse rhythms.</p>

        <h4>Key Elements</h4>
        <ul>
          <li><strong>Half-time beat:</strong> Snare on beat 3</li>
          <li><strong>Sub-bass:</strong> Deep, prominent low end</li>
          <li><strong>Wobble bass:</strong> LFO-modulated filter</li>
          <li><strong>Space:</strong> Reverb, delay, sparse arrangement</li>
          <li><strong>Tempo:</strong> 138-142 BPM (feels like 69-71)</li>
        </ul>

        <h4>The Wobble</h4>
        <p>The signature dubstep wobble is created by:</p>
        <ol>
          <li>Rich bass sound (saw waves, FM synthesis)</li>
          <li>LFO modulating filter cutoff</li>
          <li>Rate typically 4-8Hz (quarter to eighth notes)</li>
          <li>Varying LFO rate creates tension/release</li>
        </ol>

        <h4>Pioneer Artists</h4>
        <ul>
          <li><strong>Skream:</strong> "Midnight Request Line"</li>
          <li><strong>Benga:</strong> "Night" (with Coki)</li>
          <li><strong>Digital Mystikz:</strong> "Anti War Dub"</li>
          <li><strong>Rusko:</strong> "Cockney Thug"</li>
          <li><strong>Caspa:</strong> "Rubber Chicken"</li>
        </ul>

        <h4>Evolution</h4>
        <p>Around 2010, "brostep" emerged with artists like Skrillex, featuring more aggressive sounds, faster wobbles, and metallic textures. Meanwhile, "deep dubstep" maintained the original aesthetic.</p>

        <h4>Reese Bass</h4>
        <p>Named after Kevin "Reese" Saunderson, this sound uses detuned oscillators to create a phasing, growling texture. Essential for dubstep "talking" bass sounds.</p>
      `
    }
  },

  /**
   * Initialize sidepanel
   */
  init() {
    this.container = NS.DOM.$('#sidepanel-content');
    this.tabs = NS.DOM.$$('.tab-btn');

    // Bind tab clicks
    this.tabs.forEach(tab => {
      NS.DOM.on(tab, 'click', () => {
        this.showTab(tab.dataset.tab);
      });
    });

    // Show initial tab
    this.showTab(this.currentTab);

    console.log('[Dunk] Sidepanel initialized');
  },

  /**
   * Show a tab
   */
  showTab(tabId) {
    // Update tab buttons
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update content
    const content = this.content[tabId];
    if (content) {
      this.container.innerHTML = `<h4>${content.title}</h4>${content.html}`;
    }

    this.currentTab = tabId;
  }
};

console.log('[Dunk] Sidepanel module loaded');
