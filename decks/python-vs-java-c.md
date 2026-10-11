---
schema: 1
topic: python-vs-java-c
---

### written
Python is dynamically typed. Java and C are ___ typed.
- answer: statically | static
- explain: In Java and C a variable's type is fixed at compile time and checked by the compiler; in Python types belong to values and are only checked at runtime.

### written
Python or Java: in which language can an `int` silently overflow?
- answer: Java
- explain: Java's int is a fixed 32-bit two's-complement number that wraps (`Integer.MAX_VALUE + 1 == Integer.MIN_VALUE`); Python ints are arbitrary-precision and just grow.

### truefalse
In C, signed integer overflow is guaranteed to wrap around, just like in Java.
- answer: false
- explain: Signed overflow is undefined behaviour in C, so the compiler may assume it never happens; only unsigned arithmetic is defined to wrap modulo 2^n.

### multiple
Which of these are normally compiled to bytecode that runs on a virtual machine?
- correct: Java | CPython
- wrong: C | C++
- explain: javac emits JVM bytecode and CPython compiles .py files to bytecode for its own VM; C and C++ are compiled ahead of time to native machine code.

### truefalse
In C, heap memory must be freed manually, whereas Java and Python reclaim it automatically.
- answer: true
- explain: C has `malloc`/`free` and no collector; Java uses a tracing garbage collector, CPython uses reference counting plus a cycle detector.

### written
What is the value of `x`?
```java
int x = 7 / 2;
```
- answer: 3
- explain: Dividing two ints in Java (and C) is integer division that truncates toward zero; in Python 3, `7 / 2` is 3.5 and `7 // 2` is floor division (3).

### multiple
Which statements about passing arguments to functions are true?
- correct: C passes every argument by value, pointers included | Java passes object references by value
- wrong: Java passes objects by reference | Reassigning a parameter inside a Python function also reassigns the caller's variable
- explain: All three languages copy what is passed; in Java and Python that copy is a reference, so mutating the object is visible to the caller but rebinding the parameter is not.

### written
What does Python use to delimit code blocks, where Java and C use curly braces?
- answer: indentation | whitespace | indents | indenting
- explain: Indentation is part of Python's grammar (the tokenizer emits INDENT/DEDENT tokens), so it is syntax, not style.

### truefalse
Strings are immutable in both Java and Python.
- answer: true
- explain: Concatenation and replace create new string objects in both; in C a string is just a mutable char array terminated by `'\0'`.
