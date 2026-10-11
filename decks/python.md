---
schema: 1
topic: python
---

### written
What does this print?
```python
def add(x, items=[]):
    items.append(x)
    return items

add(1)
print(add(2))
```
- answer: [1, 2] | [1,2]
- explain: Default values are evaluated once, when the def statement runs, so every call shares the same list; use `items=None` and create the list inside the function.

### written
What does `is` compare in Python, as opposed to `==`?
- answer: identity | object identity | whether they are the same object | if they are the same object | same object | the same object | id
- explain: `==` calls `__eq__` and compares values; `is` checks whether both names refer to the very same object, which is why you write `x is None`.

### truefalse
A list stored inside a tuple can still be modified.
- answer: true
- explain: A tuple is immutable only in which objects it holds; those objects can themselves be mutable (and such a tuple is then unhashable).

### written
What does this print?
```python
a = [[1], [2]]
b = a[:]
b[0].append(9)
print(a[0])
```
- answer: [1, 9] | [1,9]
- explain: `a[:]` is a shallow copy: `b` is a new list, but it holds the same inner lists, so mutating `b[0]` mutates `a[0]` too (`copy.deepcopy` avoids this).

### written
What does this print?
```python
print([x * x for x in range(5) if x % 2 == 0])
```
- answer: [0, 4, 16] | [0,4,16]
- explain: `range(5)` yields 0 to 4, the filter keeps 0, 2 and 4, and those are squared.

### written
Which keyword turns a function into a generator?
- answer: yield
- explain: Calling a function that contains `yield` returns a generator, which produces values lazily, one per `next()`, and keeps its local state between them.

### truefalse
A `with open(...) as f:` block closes the file even if an exception is raised inside it.
- answer: true
- explain: The `with` statement calls the context manager's `__exit__` when the block is left, whether normally or through an exception.

### written
What does this print?
```python
print("hello"[::-1])
```
- answer: olleh
- explain: Slices are `start:stop:step`; leaving out start and stop with step -1 walks the whole sequence backwards and returns a new object.

### written
`*args` collects extra positional arguments into a tuple. What does `**kwargs` collect extra keyword arguments into?
- answer: dict | dictionary | a dict | a dictionary
- explain: `**kwargs` gathers extra keyword arguments as a name-to-value dict; at a call site, `*` and `**` do the reverse and unpack a sequence or dict into arguments.

### truefalse
In standard CPython, running CPU-bound pure-Python code in several threads makes it run faster.
- answer: false
- explain: The GIL (Global Interpreter Lock) lets only one thread execute Python bytecode at a time, so threads help with I/O-bound work only; use `multiprocessing` for CPU work (CPython 3.13+ also has an optional free-threaded build).
