---
schema: 1
topic: java
---

### written
What does `==` compare when applied to two String objects in Java?
- answer: references | the references | reference | identity | object identity | memory address | memory addresses
- explain: `==` on objects compares references; use `.equals()` for content. String literals are interned, so `==` sometimes appears to work, which hides the bug.

### multiple
Which of these are primitive types in Java?
- correct: int | boolean | char | double
- wrong: String | Integer
- explain: Java has eight primitives (byte, short, int, long, float, double, char, boolean); String and wrapper classes such as Integer are objects.

### written
Which keyword prevents a local variable or field from being reassigned?
- answer: final
- explain: A final variable can be assigned only once, but a final reference does not make the object immutable; on a class or method, final prevents subclassing or overriding.

### truefalse
A Java class can extend several classes.
- answer: false
- explain: Java has single inheritance for classes, but a class can implement any number of interfaces (which can carry default methods since Java 8).

### written
Exceptions that the compiler forces you to either catch or declare with `throws` are called ___ exceptions.
- answer: checked
- explain: Checked exceptions (e.g. IOException) extend Exception but not RuntimeException; unchecked ones (RuntimeException and Error subclasses) need no declaration.

### truefalse
Two objects that are equal according to `equals()` may return different `hashCode()` values without breaking HashMap.
- answer: false
- explain: HashMap picks the bucket by `hashCode()` before calling `equals()`, so equal objects with different hashes end up in different buckets and lookups miss; equal objects must have equal hash codes (not vice versa).

### multiple
Which statements about `static` members are true?
- correct: A static method can be called without creating an instance | A static field is shared by all instances of the class
- wrong: A static method can use `this` | Every object gets its own copy of a static field
- explain: Static members belong to the class itself rather than to any object, so there is no `this` inside a static method.

### written
What does this print?
```java
Integer a = 127, b = 127;
Integer c = 128, d = 128;
System.out.println((a == b) + " " + (c == d));
```
- answer: true false
- explain: Autoboxing goes through `Integer.valueOf`, which caches -128 to 127, so a and b are the same object but c and d are not; compare boxed values with `equals()`.

### written
Which Java collection gives O(1) average-time lookup of a value by key?
- answer: HashMap | Hashtable | ConcurrentHashMap
- explain: HashMap hashes keys into buckets for O(1) average operations; TreeMap is a red-black tree with O(log n) operations that keeps keys sorted.

### truefalse
Because of type erasure, `List<String>` and `List<Integer>` have the same class at runtime.
- answer: true
- explain: Generic type arguments are checked at compile time and then erased, which is why you cannot write `new T()` or `x instanceof List<String>`.
