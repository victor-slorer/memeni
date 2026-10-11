---
schema: 1
topic: operators-and-logic
---

### written
What does this print?
```python
print(5 % -3)
```
- answer: -1
- explain: Python's `//` floors (`5 // -3 == -2`), so the remainder 5 - (-3)(-2) = -1 takes the sign of the divisor; C and Java truncate instead and give 2.

### written
What does this print?
```c
printf("%d\n", 5 % -3);
```
- answer: 2
- explain: In C (since C99) and Java, integer division truncates toward zero (`5 / -3 == -1`), so the remainder 5 - (-3)(-1) = 2 takes the sign of the dividend.

### written
According to De Morgan's law, `not (A and B)` is equivalent to…?
- answer: not A or not B | (not A) or (not B) | !A \|\| !B | ¬A ∨ ¬B
- explain: Negating an AND gives an OR of the negations, and vice versa: `not (A or B) == not A and not B`.

### written
What does this print?
```python
print(6 ^ 3)
```
- answer: 5
- explain: `^` is bitwise XOR, not exponentiation: 110 XOR 011 = 101 = 5; Python's power operator is `**`.

### truefalse
Python's `and` and `or` operators short-circuit.
- answer: true
- explain: `a and b` skips `b` when `a` is falsy, and `a or b` skips `b` when `a` is truthy; they also return one of the operands, so `0 or "x"` gives `"x"` (`&&` and `||` short-circuit in C and Java too).

### multiple
Which of these values are falsy in Python?
- correct: 0 | "" | [] | None
- wrong: "0" | [0]
- explain: Zero, None, False and empty containers are falsy; `"0"` is a non-empty string and `[0]` is a non-empty list, so both are truthy.

### written
What is the value of `1 << 4`?
- answer: 16
- explain: Shifting left by n multiplies by 2^n (`0b1` becomes `0b10000`); in Python, `x >> n` is floor division by 2^n.

### written
What does `True + True` evaluate to in Python?
- answer: 2
- explain: `bool` is a subclass of `int`, with `True == 1` and `False == 0`, which is why `sum(flags)` counts the True values.

### written
What does this print?
```python
print(0.1 + 0.2 == 0.3)
```
- answer: False
- explain: 0.1 and 0.2 have no exact binary floating-point representation, so the sum is 0.30000000000000004; compare floats with a tolerance (`math.isclose`).

### written
What does `2 + 3 * 4 ** 2` evaluate to in Python?
- answer: 50
- explain: `**` binds tightest, then `*`, then `+`, so this is `2 + (3 * (4 ** 2))` = 2 + 48.

### written
What does this print?
```python
print(-2 ** 2)
```
- answer: -4
- explain: `**` binds tighter than unary minus, so this is `-(2 ** 2)`; write `(-2) ** 2` to get 4.

### truefalse
In Python, `a < b < c` means `(a < b) < c`.
- answer: false
- explain: Python chains comparisons, so it means `a < b and b < c` (with `b` evaluated once); in C, `a < b < c` really is `(a < b) < c`, comparing 0 or 1 with c.

### written
Interpreted as a signed 8-bit two's-complement integer, what value does `0b11111111` represent?
- answer: -1
- explain: In two's complement the top bit has weight -2^(n-1), so this is -128 + 127 = -1; negating `x` is `~x + 1`.

### written
What does this print?
```python
print(7 & 1, 8 & 1)
```
- answer: 1 0
- explain: `x & 1` keeps only the lowest bit, which is 1 for odd numbers and 0 for even ones, a cheap parity check.

### multiple
Which expressions are logically equivalent to "A implies B"?
- correct: not A or B | not (A and not B)
- wrong: A or not B | not A and B
- explain: An implication is false only when A is true and B is false; "A or not B" is the converse, B implies A.
