# Tower of Hanoi: see the recursion

**Try it live: https://lumbanon.github.io/tower_of_hanoi_simulation/**

An interactive Tower of Hanoi for understanding the recursive algorithm and where the formula **T(n) = 2·T(n−1) + 1, T(0) = 0, so T(n) = 2ⁿ − 1** comes from.

## What's inside

**Watch the recursion**
- Step through `solve(n, source, auxiliary, destination)` one line of code (or one disk move) at a time, or press Play.
- See how A, B and C are assigned to *source* / *auxiliary* / *destination* in every call, and how `solve(n−1, source, destination, auxiliary)` turns into concrete calls such as `solve(2, A, C, B)`.
- A complete execution tree (`├── Step 1: solve(2, A, C, B)` …) that highlights where the run is. Click any line to jump there.
- The current line is highlighted, and the running call is shown with its real values plugged in.
- The labels under the pegs show the current call's *source* / *auxiliary* / *destination* roles, which are re-assigned in every recursive call.
- Disks bigger than the current call's `n` are faded: that call never touches them.
- A live call stack and a recursion tree. Each call makes exactly one move, so reading the tree left to right gives the move order. Click any node to jump to its move.
- A "formula, live" bar that fills up as T(n−1) + 1 + T(n−1).

**Play it yourself**
- Click or drag disks, with undo and a move counter.
- "Best from here" shows the fewest moves still needed from your current position.
- **Hint** gives the optimal next move and explains it recursively ("disk 3 → C needs disks 1–2 parked on B, so …").

**The math**
- Unrolling the recurrence for your chosen n.
- Counting moves per disk (disk k moves 2ⁿ⁻ᵏ times).
- A proof by induction, the argument that 2ⁿ − 1 is optimal, and a growth table up to 64 disks.

## The algorithm

```js
function solve(n, source, auxiliary, destination) {
  if (n === 0) return;                           // base case: nothing to move
  solve(n - 1, source, destination, auxiliary);  // step 1: move n-1 disks out of the way
  move(n, source, destination);                  // step 2: move the biggest disk
  solve(n - 1, auxiliary, source, destination);  // step 3: move n-1 disks back on top
}
```

## Run locally

Just open `index.html` in a browser. Plain HTML, CSS and JavaScript, with no dependencies and no build step.

Keyboard shortcuts: in Watch mode, `Space` plays or pauses, `←` `→` step, and `Home` `End` jump. In Play mode, `1` `2` `3` pick up or drop a disk, `U` undoes, `H` gives a hint and `Esc` puts the disk back.
