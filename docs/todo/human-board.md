# Human Board

> Write instructions, feedback, or direction here. Auto-pilot reads this every cycle.
> Processed items are marked `[x]`, never deleted (may be summarized).

---

## Instructions (highest priority, immediate execution)
- [x] 每个轨道的音量 → Already supported: `vol <voiceId> <dB>` (e.g., `vol synth1 -6`). Documented in LS-023.
- [x] 每个轨道自己的plugin → Created LS-019: per-track effects routing
- [x] 合成器poly而不是mono → Created LS-020: all synth voices poly
- [x] 合成器数值可调(decay/velocity/filter) → Created LS-021: per-voice synth params DSL
- [x] generate和弦(Cmin7/Dmaj11) → Created LS-022: named chord syntax
- [x] 使用手册 → Created LS-023: usage manual
- [x] 视觉区域委派给Gemini → Completed as LS-018 (abstract math visuals)

- [x] 让整个视觉联动的区域使用那种数学函数或者是一些很复杂看上去很抽象的形状，前卫，迷离，跟随音乐和节奏不断变幻，让看到的人能够感到灵魂被抽离的感觉，委派给 Gemini cli 来做，gemini-3.1-pro-preview 用这个模型，越复杂越抽象越好，但是最好有能出现某种复杂规律，也不完全是噪音的感觉的视觉效果，要变幻莫测，但是跟随音乐又又联动
  → Delegated to Gemini CLI (gemini-3.1-pro-preview) as LS-018, running in background

## Feedback (incorporated into next decision)
- 视觉中心太亮太密，无法突出重点。应该有重有轻，突出变化感。中心几何体需要降低密度/亮度，让视觉节奏有呼吸感。

## Direction (long-term reference)
<!-- Next sprint priorities, product strategy, tech preferences -->
- Visual polish is the top priority after tests — the app must look stage-ready
- Refer to `scripts/visual-redesign-brief.md` for detailed design direction
- DSL parser tests are highest test priority — it's the core parsing logic
