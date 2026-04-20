# pi-evolve

Genetic-programming style brainstorming command for [pi](https://github.com/mariozechner/pi-coding-agent).

## Usage

```
/evolve I want a title in the lines of "interviewing in the post llm world"
```

1. The LLM generates 5 alternatives similar to the seed.
2. You pick one (or ✓ Finalize, or ✗ Cancel).
3. The picked one becomes the new seed → 5 more alternatives.
4. Repeat until you finalize. The chosen text is dropped into the editor.

## Install

```bash
# from npm (once published)
pi install npm:pi-evolve

# from git
pi install git:github.com/dunyakirkali/pi-evolve

# local, for development
pi install /Users/dunya.kirkali/Projects/pi-evolve
```

Then in pi, run `/evolve <seed>`.

## Requires

An active model with an API key. Set one via `/model` before running `/evolve`.

## Support

- Source: https://github.com/dunyakirkali/pi-evolve
- Issues / bugs: https://github.com/dunyakirkali/pi-evolve/issues
