// Live Synth — help panel HTML content (quick reference)
export const HELP_HTML = /* html */ `
<div class="help-section">
  <h2 class="help-h2">Quick Start</h2>
  <p class="help-p">Press <kbd>Ctrl+Enter</kbd> to play. Press <kbd>Ctrl+.</kbd> to stop.</p>
  <pre class="help-code">bpm 120
scale minor C4
synth saw
  C4 . E4 . G4 . B4 .
kick x . . x . . x .
hat . x . x . x . x
fx reverb 3 0.6</pre>
</div>

<div class="help-section">
  <h2 class="help-h2">DSL Commands</h2>

  <table class="help-table">
    <tr><th>Command</th><th>Syntax</th><th>Example</th></tr>
    <tr><td><code>bpm</code></td><td>bpm &lt;20–300&gt;</td><td><code>bpm 138</code></td></tr>
    <tr><td><code>scale</code></td><td>scale &lt;mode&gt; &lt;root&gt;</td><td><code>scale minor C4</code></td></tr>
    <tr><td><code>synth</code></td><td>synth [wave] &lt;pattern&gt;</td><td><code>synth saw C4 . E4 .</code></td></tr>
    <tr><td><code>bass</code></td><td>bass [wave] &lt;pattern&gt;</td><td><code>bass sine C2 . . C2</code></td></tr>
    <tr><td><code>pad</code></td><td>pad [wave] &lt;pattern&gt;</td><td><code>pad fat [C4 E4 G4]*2</code></td></tr>
    <tr><td><code>lead</code></td><td>lead [wave] &lt;pattern&gt;</td><td><code>lead square C5 E5 G5</code></td></tr>
    <tr><td><code>arp</code></td><td>arp &lt;mode&gt; &lt;rate&gt; [wave] &lt;pattern&gt;</td><td><code>arp up 16n C4 E4 G4</code></td></tr>
    <tr><td><code>kick/snare/hat…</code></td><td>&lt;drum&gt; &lt;x . ~ pattern&gt;</td><td><code>kick x . . x . . x .</code></td></tr>
    <tr><td><code>fx</code></td><td>fx &lt;name&gt; [params…]</td><td><code>fx reverb 3 0.6</code></td></tr>
    <tr><td><code>vol</code></td><td>vol &lt;track&gt; &lt;dB&gt;</td><td><code>vol synth -6</code></td></tr>
    <tr><td><code>swing</code></td><td>swing &lt;0–1&gt;</td><td><code>swing 0.3</code></td></tr>
    <tr><td><code>oct</code></td><td>oct &lt;-4–4&gt;</td><td><code>oct -1</code></td></tr>
  </table>

  <h3 class="help-h3">Waveforms</h3>
  <p class="help-p help-muted">saw · square · triangle · sine · fm · am · fat · pwm · pulse</p>

  <h3 class="help-h3">Drums</h3>
  <p class="help-p help-muted">kick · snare · hat · clap · tom · rim · shaker · crash</p>

  <h3 class="help-h3">Effects</h3>
  <p class="help-p help-muted">reverb · delay · pingpong · distortion · chorus · filter · phaser ·
  tremolo · bitcrusher · compressor · eq · autowah · pitchshift · freeverb ·
  vibrato · stereowidener · chebyshev · jcreverb</p>
</div>

<div class="help-section">
  <h2 class="help-h2">Pattern Syntax</h2>
  <table class="help-table">
    <tr><th>Token</th><th>Meaning</th><th>Example</th></tr>
    <tr><td><code>C4</code></td><td>Note (name + octave)</td><td><code>F#3</code>, <code>Bb4:80</code></td></tr>
    <tr><td><code>.</code></td><td>Rest (one beat silent)</td><td><code>C4 . E4 .</code></td></tr>
    <tr><td><code>~</code></td><td>Tie (sustain previous note)</td><td><code>C4 ~ ~</code></td></tr>
    <tr><td><code>[C4 E4 G4]</code></td><td>Chord (simultaneous notes)</td><td><code>[D3 F3 A3]:90</code></td></tr>
    <tr><td><code>Cmajor</code></td><td>Named chord</td><td><code>Amin7</code>, <code>Gsus4</code></td></tr>
    <tr><td><code>token*N</code></td><td>Repeat N times</td><td><code>.*4</code>, <code>x*8</code></td></tr>
    <tr><td><code>x / . / ~</code></td><td>Drum: hit / rest / sustain</td><td><code>x . . x</code></td></tr>
  </table>
</div>

<div class="help-section">
  <h2 class="help-h2">Named Chords</h2>
  <table class="help-table">
    <tr><th>Name</th><th>Intervals</th><th>Name</th><th>Intervals</th></tr>
    <tr><td><code>major</code></td><td>0-4-7</td><td><code>min7</code></td><td>0-3-7-10</td></tr>
    <tr><td><code>minor</code></td><td>0-3-7</td><td><code>dom7</code></td><td>0-4-7-10</td></tr>
    <tr><td><code>dim</code></td><td>0-3-6</td><td><code>dim7</code></td><td>0-3-6-9</td></tr>
    <tr><td><code>aug</code></td><td>0-4-8</td><td><code>maj9</code></td><td>0-4-7-11-14</td></tr>
    <tr><td><code>sus2</code></td><td>0-2-7</td><td><code>min9</code></td><td>0-3-7-10-14</td></tr>
    <tr><td><code>sus4</code></td><td>0-5-7</td><td><code>add9</code></td><td>0-4-7-14</td></tr>
    <tr><td><code>maj7</code></td><td>0-4-7-11</td><td><code>7sus4</code></td><td>0-5-7-10</td></tr>
  </table>
  <p class="help-p help-muted">Root defaults to 4th octave. Any root works: <code>F#min7</code>, <code>Bbmaj7</code>.</p>
</div>

<div class="help-section">
  <h2 class="help-h2">Scales</h2>
  <p class="help-p help-muted">major · minor · pentatonic · blues · dorian · mixolydian · lydian ·
  phrygian · locrian · harmonicMinor · melodicMinor · chromatic · whole ·
  diminished · augmented · bebop · japanese · arabic · hungarian · gypsy</p>
</div>

<div class="help-section">
  <h2 class="help-h2">Keyboard Shortcuts</h2>
  <table class="help-table">
    <tr><th>Key</th><th>Action</th></tr>
    <tr><td><kbd>Ctrl/Cmd+Enter</kbd></td><td>Play / refresh</td></tr>
    <tr><td><kbd>Ctrl/Cmd+.</kbd></td><td>Stop</td></tr>
    <tr><td><kbd>Ctrl/Cmd+Space</kbd></td><td>Toggle play/stop</td></tr>
    <tr><td><kbd>Ctrl/Cmd+↑/↓</kbd></td><td>BPM +1 / -1</td></tr>
    <tr><td><kbd>Alt+T</kbd></td><td>Tap tempo</td></tr>
    <tr><td><kbd>Alt+1…5</kbd></td><td>Load preset 1–5</td></tr>
    <tr><td><kbd>Alt+V/F/D/P</kbd></td><td>Visualizer: Void/Field/Drift/Pulse</td></tr>
    <tr><td><kbd>Ctrl/Cmd+/</kbd></td><td>Toggle comment</td></tr>
    <tr><td><kbd>?</kbd> or <kbd>F1</kbd></td><td>Toggle this help panel</td></tr>
  </table>
</div>
`;
