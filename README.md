# Tower of Hanoi: see the recursion

**Try it live: https://lumbanon.github.io/tower_of_hanoi_simulation/**

An interactive Tower of Hanoi for understanding the recursive algorithm and where the formula **T(n) = 2·T(n−1) + 1 = 2ⁿ − 1** comes from.

## What's inside

**Watch the recursion**
- Step through `hanoi(n, from, to, via)` one line of code (or one disk move) at a time, or press Play.
- The current line is highlighted, and the running call is shown with its real values plugged in.
- The labels under the pegs show the current call's *from* / *to* / *spare* roles, which swap in every recursive call.
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
function hanoi(n, from, to, via) {
  if (n === 1) {                 // base case
    move(1, from, to);
    return;
  }
  hanoi(n - 1, from, via, to);   // step 1: move n-1 disks out of the way
  move(n, from, to);             // step 2: move the biggest disk
  hanoi(n - 1, via, to, from);   // step 3: move n-1 disks back on top
}
```

## Run locally

Just open `index.html` in a browser. Plain HTML, CSS and JavaScript, with no dependencies and no build step.

Keyboard shortcuts: in Watch mode, `Space` plays or pauses, `←` `→` step, and `Home` `End` jump. In Play mode, `1` `2` `3` pick up or drop a disk, `U` undoes, `H` gives a hint and `Esc` puts the disk back.
